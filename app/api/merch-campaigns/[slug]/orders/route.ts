import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMerchCampaignBankAccount } from "@/lib/merch-bank-account-service";
import { generateSepayQR } from "@/lib/sepay-service";
import { buildMerchOrderTransferContent } from "@/lib/payment-content";
import {
  createMerchPublicCode,
  createMerchSecretCode,
  hashMerchSecretCode,
} from "@/lib/merch-order-service";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { MerchOrderEmail } from "@/emails/merch-order-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9}$/;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const shippingAddress = String(body.shippingAddress || "").trim();
    const notes = String(body.notes || "").trim() || null;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (
      !fullName ||
      !EMAIL_RE.test(email) ||
      !PHONE_RE.test(phone) ||
      !shippingAddress
    ) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đúng họ tên, email, số điện thoại và địa chỉ nhận hàng",
        },
        { status: 400 },
      );
    }
    if (!rawItems.length) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất một áo" },
        { status: 400 },
      );
    }

    const campaign = await prisma.merchCampaign.findUnique({ where: { slug } });
    const now = new Date();
    const isOpen =
      campaign?.isPublished &&
      campaign.status === "OPEN" &&
      (!campaign.saleStartAt || campaign.saleStartAt <= now) &&
      (!campaign.saleEndAt || campaign.saleEndAt >= now);
    if (!campaign || !isOpen) {
      return NextResponse.json(
        { error: "Chương trình hiện chưa mở nhận đơn" },
        { status: 403 },
      );
    }

    const quantities = new Map<string, number>();
    for (const item of rawItems) {
      const variantId = String(item.variantId || "");
      const quantity = Number(item.quantity);
      if (
        !variantId ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        return NextResponse.json(
          { error: "Số lượng áo không hợp lệ" },
          { status: 400 },
        );
      }
      quantities.set(variantId, (quantities.get(variantId) || 0) + quantity);
    }

    const bankInfo = await getMerchCampaignBankAccount(campaign.id);
    if (!bankInfo) {
      return NextResponse.json(
        { error: "Chương trình chưa cấu hình tài khoản thanh toán" },
        { status: 400 },
      );
    }

    const publicCode = createMerchPublicCode();
    const secretCode = createMerchSecretCode();
    const secretCodeHash = await hashMerchSecretCode(secretCode);

    const order = await prisma.$transaction(
      async (tx) => {
        const variants = await tx.merchShirtVariant.findMany({
          where: {
            id: { in: [...quantities.keys()] },
            isAvailable: true,
            style: { campaignId: campaign.id, isAvailable: true },
          },
          include: { style: true },
        });
        if (variants.length !== quantities.size)
          throw new Error("Một lựa chọn áo không còn khả dụng");

        let totalAmount = 0;
        const items = variants.map((variant) => {
          const quantity = quantities.get(variant.id)!;
          const remaining =
            variant.stockQuantity -
            variant.soldQuantity -
            variant.reservedQuantity;
          if (remaining < quantity)
            throw new Error(
              `${variant.style.name} size ${variant.size} chỉ còn ${remaining} áo`,
            );
          const totalPrice = variant.style.price * quantity;
          totalAmount += totalPrice;
          return { variant, quantity, totalPrice };
        });

        const created = await tx.merchOrder.create({
          data: {
            campaignId: campaign.id,
            publicCode,
            secretCodeHash,
            fullName,
            email,
            phone,
            shippingAddress,
            notes,
            totalAmount,
            items: {
              create: items.map(({ variant, quantity, totalPrice }) => ({
                styleId: variant.styleId,
                variantId: variant.id,
                styleName: variant.style.name,
                category: variant.style.category,
                type: variant.style.type,
                size: variant.size,
                quantity,
                unitPrice: variant.style.price,
                totalPrice,
              })),
            },
          },
          include: { items: true, campaign: true },
        });
        for (const { variant, quantity } of items) {
          await tx.merchShirtVariant.update({
            where: { id: variant.id },
            data: { reservedQuantity: { increment: quantity } },
          });
        }
        return created;
      },
      { isolationLevel: "Serializable" },
    );

    const transferContent = campaign.requireOnlinePayment
      ? buildMerchOrderTransferContent(publicCode, bankInfo.bankCode)
      : `AO ${phone} ${publicCode.slice(-6)}`;
    const qrPaymentUrl = generateSepayQR(
      bankInfo.accountNumber,
      bankInfo.bankCode,
      order.totalAmount,
      transferContent,
      bankInfo.accountName,
    );
    const orderForEmail = { ...order, transferContent };

    after(async () => {
      const result = await sendEmailGmailFirst({
        to: email,
        subject: `Xác nhận đơn áo - ${campaign.name} - ${publicCode}`,
        react: MerchOrderEmail({
          order: orderForEmail,
          campaign,
          secretCode,
          qrPaymentUrl,
          bankInfo,
        }),
        fromName: campaign.name,
        fromEmail: campaign.contactEmail || process.env.FROM_EMAIL,
      });
      if (!result.success)
        console.error("Merch order email failed:", result.error);
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        publicCode,
        totalAmount: order.totalAmount,
        secretCode,
        transferContent,
      },
      qrPaymentUrl,
      bankInfo,
    });
  } catch (error: any) {
    console.error("Create merch order error:", error);
    return NextResponse.json(
      { error: error.message || "Không thể tạo đơn hàng" },
      { status: 400 },
    );
  }
}
