import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { encryptBankAccount } from "@/lib/encryption";
import { getMerchCampaignBankAccount } from "@/lib/merch-bank-account-service";

async function checkAdmin() {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") throw new Error("FORBIDDEN");
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await checkAdmin();
    const { id } = await context.params;
    const campaign = await prisma.merchCampaign.findUnique({
      where: { id },
      include: {
        styles: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: { variants: { orderBy: { size: "asc" } } },
        },
      },
    });
    if (!campaign)
      return NextResponse.json(
        { error: "Không tìm thấy chương trình" },
        { status: 404 },
      );
    const bank = await getMerchCampaignBankAccount(id);
    return NextResponse.json({
      campaign: {
        ...campaign,
        bankName: bank?.bankName || "",
        bankAccount: bank?.accountNumber || "",
        bankHolder: bank?.accountName || "",
        bankCode: bank?.bankCode || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await checkAdmin();
    const { id } = await context.params;
    const body = await req.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "")
      .trim()
      .toLowerCase();
    const year = Number(body.year);
    if (
      !name ||
      !/^[a-z0-9-]+$/.test(slug) ||
      !Number.isInteger(year) ||
      !["DRAFT", "OPEN", "CLOSED"].includes(body.status)
    ) {
      return NextResponse.json(
        { error: "Tên, slug, năm hoặc trạng thái không hợp lệ" },
        { status: 400 },
      );
    }
    const saleStartAt = body.saleStartAt ? new Date(body.saleStartAt) : null;
    const saleEndAt = body.saleEndAt ? new Date(body.saleEndAt) : null;
    if (
      (saleStartAt && Number.isNaN(saleStartAt.getTime())) ||
      (saleEndAt && Number.isNaN(saleEndAt.getTime())) ||
      (saleStartAt && saleEndAt && saleStartAt >= saleEndAt)
    ) {
      return NextResponse.json(
        { error: "Thời gian mở bán không hợp lệ" },
        { status: 400 },
      );
    }
    const bankData =
      body.bankAccount && body.bankCode && body.bankHolder
        ? encryptBankAccount({
            accountNumber: body.bankAccount,
            bankCode: body.bankCode,
            accountName: body.bankHolder,
            bankName: body.bankName || body.bankCode,
          })
        : null;
    const existingBank = bankData
      ? null
      : await getMerchCampaignBankAccount(id);
    if (body.status === "OPEN" && !bankData && !existingBank) {
      return NextResponse.json(
        { error: "Cần khai báo tài khoản nhận tiền trước khi mở bán" },
        { status: 400 },
      );
    }
    if (body.status === "OPEN") {
      const variants = await prisma.merchShirtVariant.findMany({
        where: {
          isAvailable: true,
          style: { campaignId: id, isAvailable: true },
        },
        select: {
          stockQuantity: true,
          soldQuantity: true,
          reservedQuantity: true,
        },
      });
      if (
        !variants.some(
          (variant) =>
            variant.stockQuantity >
            variant.soldQuantity + variant.reservedQuantity,
        )
      ) {
        return NextResponse.json(
          { error: "Cần có ít nhất một mẫu áo còn tồn kho trước khi mở bán" },
          { status: 400 },
        );
      }
    }
    const campaign = await prisma.merchCampaign.update({
      where: { id },
      data: {
        name,
        slug,
        year,
        description: String(body.description || "").trim() || null,
        status: body.status,
        isPublished: body.isPublished === true,
        requireOnlinePayment: body.requireOnlinePayment !== false,
        ...(bankData
          ? {
              bankName: bankData.bankNameEncrypted,
              bankAccount: bankData.accountNumberEncrypted,
              bankHolder: bankData.accountNameEncrypted,
              bankCode: bankData.bankCodeEncrypted,
            }
          : {}),
        heroImageUrl: body.heroImageUrl || null,
        cloudinaryPublicId: body.cloudinaryPublicId || null,
        saleStartAt,
        saleEndAt,
        contactEmail: String(body.contactEmail || "").trim() || null,
        contactPhone: String(body.contactPhone || "").trim() || null,
      },
    });
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.code === "P2002" ? "Slug đã được sử dụng" : error.message,
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await checkAdmin();
    const { id } = await context.params;
    const orderCount = await prisma.merchOrder.count({
      where: { campaignId: id },
    });
    if (orderCount)
      return NextResponse.json(
        {
          error:
            "Không thể xóa chương trình đã phát sinh đơn; hãy chuyển trạng thái sang đóng",
        },
        { status: 409 },
      );
    await prisma.merchCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
