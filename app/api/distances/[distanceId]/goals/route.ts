// app/api/distances/[distanceId]/goals/route.ts - PUBLIC API
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Public endpoint to load available goals for registration
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ distanceId: string }> }
) {
  try {
    const distanceId = (await context.params).distanceId;

    // Load distance to check if it has goals
    const distance = await prisma.distance.findUnique({
      where: { id: distanceId },
      select: { hasGoals: true },
    });

    if (!distance?.hasGoals) {
      return NextResponse.json({ goals: [] });
    }

    // Load available goals
    const goals = await prisma.distanceGoal.findMany({
      where: {
        distanceId,
        isAvailable: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        targetTime: true,
        bibPrefix: true,
        maxParticipants: true,
        currentParticipants: true,
        priceAdjustment: true,
        isAvailable: true,
      },
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error loading goals:", error);
    return NextResponse.json(
      { error: "Failed to load goals" },
      { status: 500 }
    );
  }
}
