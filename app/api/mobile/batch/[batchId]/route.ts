import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mobile/batch/:batchId
 * Get all registrations in a batch for check-in
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = (await context.params).batchId;

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
        registrations: {
          where: {
            paymentStatus: "PAID",
          },
          select: {
            id: true,
            bibNumber: true,
            fullName: true,
            email: true,
            phone: true,
            racePackCollected: true,
            racePackCollectedAt: true,
            shirtCategory: true,
            shirtType: true,
            shirtSize: true,
            distance: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            bibNumber: "asc",
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Calculate stats
    const total = batch.registrations.length;
    const collected = batch.registrations.filter(
      (r) => r.racePackCollected,
    ).length;
    const pending = total - collected;

    return NextResponse.json({
      batch: {
        id: batch.id,
        fileName: batch.fileName,
        bibRangeStart: batch.bibRangeStart,
        bibRangeEnd: batch.bibRangeEnd,
        totalShirts: batch.totalShirts,
        event: batch.event,
      },
      registrations: batch.registrations,
      stats: {
        total,
        collected,
        pending,
        collectionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Get batch error:", error);
    return NextResponse.json({ error: "Failed to get batch" }, { status: 500 });
  }
}
