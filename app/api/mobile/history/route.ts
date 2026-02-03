// app/api/mobile/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/mobile/history?eventId=xxx
 * Get race pack collection history for an event
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

    // Get all collected race packs for this event
    const history = await prisma.registration.findMany({
      where: {
        eventId,
        racePackCollected: true,
      },
      select: {
        id: true,
        bibNumber: true,
        fullName: true,
        racePackCollectedAt: true,
        racePackPhoto: true,
        racePackNotes: true,
        distance: {
          select: {
            name: true,
          },
        },
        collectedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        racePackCollectedAt: "desc", // Most recent first
      },
    });

    return NextResponse.json({
      history,
      count: history.length,
      eventId,
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 },
    );
  }
}
