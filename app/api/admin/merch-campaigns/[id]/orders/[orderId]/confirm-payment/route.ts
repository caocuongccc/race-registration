import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";
import { confirmMerchOrderPayment } from "@/lib/merch-order-service";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { MerchOrderEmail } from "@/emails/merch-order-email";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string; orderId: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, orderId } = await context.params;
    const current = await prisma.merchOrder.findFirst({
      where: { id: orderId, campaignId: id },
    });
    if (!current)
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 },
      );
    const order = await confirmMerchOrderPayment({
      publicCode: current.publicCode,
      transactionId: `manual_merch_${orderId}_${Date.now()}`,
      amount: current.totalAmount,
      paymentMethod: "manual_admin",
    });
    await sendEmailGmailFirst({
      to: order.email,
      subject: `Đã nhận thanh toán - ${order.campaign.name} - ${order.publicCode}`,
      react: MerchOrderEmail({ order, campaign: order.campaign, paid: true }),
      fromName: order.campaign.name,
      fromEmail: order.campaign.contactEmail || process.env.FROM_EMAIL,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
