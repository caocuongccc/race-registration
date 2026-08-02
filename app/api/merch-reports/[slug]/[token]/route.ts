import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMerchReportToken } from "@/lib/merch-report-access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; token: string }> },
) {
  try {
    const { slug, token } = await context.params;
    const campaign = await prisma.merchCampaign.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, year: true },
    });

    if (!campaign || !verifyMerchReportToken(campaign.id, token)) {
      return NextResponse.json(
        { error: "Link báo cáo không hợp lệ hoặc đã bị thay đổi" },
        { status: 404 },
      );
    }

    const orders = await prisma.merchOrder.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        publicCode: true,
        fullName: true,
        email: true,
        phone: true,
        shippingAddress: true,
        deliveryMethod: true,
        notes: true,
        totalAmount: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        paymentDate: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            styleName: true,
            category: true,
            type: true,
            size: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    });

    const paidOrders = orders.filter((order) => order.paymentStatus === "PAID");
    const shirtMap = new Map<
      string,
      {
        category: string;
        type: string;
        size: string;
        quantity: number;
      }
    >();

    for (const order of paidOrders) {
      for (const item of order.items) {
        const key = [item.category, item.type, item.size].join("|");
        const current = shirtMap.get(key) || {
          category: item.category,
          type: item.type,
          size: item.size,
          quantity: 0,
        };
        current.quantity += item.quantity;
        shirtMap.set(key, current);
      }
    }

    return NextResponse.json({
      campaign,
      orders,
      stats: {
        totalOrders: orders.length,
        paidOrders: paidOrders.length,
        pendingOrders: orders.filter(
          (order) => order.paymentStatus === "PENDING",
        ).length,
        revenue: paidOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalShirts: paidOrders.reduce(
          (sum, order) =>
            sum +
            order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0,
        ),
        shirtSummary: [...shirtMap.values()].sort((a, b) =>
          [a.category, a.type, a.size]
            .join("|")
            .localeCompare([b.category, b.type, b.size].join("|")),
        ),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
