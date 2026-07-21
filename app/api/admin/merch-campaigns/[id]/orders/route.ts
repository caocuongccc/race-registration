import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const q = req.nextUrl.searchParams.get("search")?.trim();
    const status = req.nextUrl.searchParams.get("status");
    const page = Math.max(Number(req.nextUrl.searchParams.get("page")) || 1, 1);
    const pageSize = 50;
    const where: any = { campaignId: id };

    if (status && status !== "all") where.paymentStatus = status;
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { publicCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const [orders, filteredTotal, statusGroups, revenue, shirtGroups] =
      await Promise.all([
        prisma.merchOrder.findMany({
          where,
          include: { items: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.merchOrder.count({ where }),
        prisma.merchOrder.groupBy({
          by: ["paymentStatus"],
          where: { campaignId: id },
          _count: { _all: true },
        }),
        prisma.merchOrder.aggregate({
          where: { campaignId: id, paymentStatus: "PAID" },
          _sum: { totalAmount: true },
        }),
        prisma.merchOrderItem.groupBy({
          by: ["category", "type", "size"],
          where: { order: { campaignId: id, paymentStatus: "PAID" } },
          _sum: { quantity: true },
        }),
      ]);

    const countByStatus = Object.fromEntries(
      statusGroups.map((row) => [row.paymentStatus, row._count._all]),
    );
    const shirtSummary = shirtGroups.map((row) => ({
      category: row.category,
      type: row.type,
      size: row.size,
      quantity: row._sum.quantity || 0,
    }));

    return NextResponse.json({
      orders,
      pagination: {
        page,
        pageSize,
        total: filteredTotal,
        totalPages: Math.max(Math.ceil(filteredTotal / pageSize), 1),
      },
      stats: {
        totalOrders: statusGroups.reduce(
          (sum, row) => sum + row._count._all,
          0,
        ),
        paidOrders: countByStatus.PAID || 0,
        pendingOrders: countByStatus.PENDING || 0,
        revenue: revenue._sum.totalAmount || 0,
        totalShirts: shirtSummary.reduce((sum, row) => sum + row.quantity, 0),
        shirtSummary,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
