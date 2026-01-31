// ============================================
// PART 1: GET SHIRT ORDERS (Admin)
// ============================================
// app/api/admin/shirt-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const whereClause: any = {};

    if (eventId && eventId !== "all") {
      whereClause.eventId = eventId;
    }

    if (status && status !== "all") {
      whereClause.paymentStatus = status;
    }

    if (type && type !== "all") {
      whereClause.orderType = type;
    }

    const orders = await prisma.shirtOrder.findMany({
      where: whereClause,
      include: {
        registration: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            bibNumber: true,
          },
        },
        event: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            shirt: {
              select: {
                category: true,
                type: true,
                size: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching shirt orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
