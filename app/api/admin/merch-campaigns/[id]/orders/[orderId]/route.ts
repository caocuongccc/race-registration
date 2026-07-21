import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

const fulfillmentStatuses = ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; orderId: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, orderId } = await context.params;
    const body = await req.json();
    const order = await prisma.merchOrder.findFirst({
      where: { id: orderId, campaignId: id },
      include: { items: true },
    });
    if (!order)
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 },
      );

    if (body.action === "cancel") {
      if (order.paymentStatus === "PAID")
        return NextResponse.json(
          { error: "Đơn đã thanh toán cần xử lý hoàn tiền riêng" },
          { status: 409 },
        );
      if (order.fulfillmentStatus === "CANCELLED")
        return NextResponse.json({ success: true });
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const variant = await tx.merchShirtVariant.findUnique({
            where: { id: item.variantId },
          });
          if (variant && variant.reservedQuantity >= item.quantity) {
            await tx.merchShirtVariant.update({
              where: { id: item.variantId },
              data: { reservedQuantity: { decrement: item.quantity } },
            });
          }
        }
        await tx.merchOrder.update({
          where: { id: order.id },
          data: { paymentStatus: "FAILED", fulfillmentStatus: "CANCELLED" },
        });
      });
      return NextResponse.json({ success: true });
    }

    if (
      !fulfillmentStatuses.includes(body.fulfillmentStatus) ||
      order.paymentStatus !== "PAID"
    ) {
      return NextResponse.json(
        { error: "Trạng thái giao hàng không hợp lệ" },
        { status: 400 },
      );
    }
    await prisma.merchOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: body.fulfillmentStatus },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
