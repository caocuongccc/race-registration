// app/api/mobile/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/mobile/stats?eventId=xxx
 * Get check-in statistics for event
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 },
      );
    }

    // Get stats
    const [total, paid, collected, pending] = await Promise.all([
      // Total registrations
      prisma.registration.count({
        where: { eventId },
      }),

      // Paid registrations
      prisma.registration.count({
        where: {
          eventId,
          paymentStatus: "PAID",
        },
      }),

      // Collected race packs
      prisma.registration.count({
        where: {
          eventId,
          racePackCollected: true,
        },
      }),

      // Pending collection (paid but not collected)
      prisma.registration.count({
        where: {
          eventId,
          paymentStatus: "PAID",
          racePackCollected: false,
        },
      }),
    ]);

    // Get recent collections (last 10)
    const recentCollections = await prisma.registration.findMany({
      where: {
        eventId,
        racePackCollected: true,
      },
      orderBy: {
        racePackCollectedAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        bibNumber: true,
        fullName: true,
        racePackCollectedAt: true,
        collectedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      stats: {
        total,
        paid,
        collected,
        pending,
        collectionRate: paid > 0 ? Math.round((collected / paid) * 100) : 0,
      },
      recentCollections,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
