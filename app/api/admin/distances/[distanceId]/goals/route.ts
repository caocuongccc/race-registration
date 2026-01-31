// app/api/admin/distances/[distanceId]/goals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Load all goals for a distance
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ distanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distanceId = (await context.params).distanceId;

    const goals = await prisma.distanceGoal.findMany({
      where: { distanceId },
      orderBy: { sortOrder: "asc" },
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

// POST: Save/Update goals for a distance
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ distanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distanceId = (await context.params).distanceId;
    const { goals } = await req.json();

    // Delete all existing goals for this distance
    await prisma.distanceGoal.deleteMany({
      where: { distanceId },
    });

    // Create new goals
    if (goals && goals.length > 0) {
      await prisma.distanceGoal.createMany({
        data: goals.map((goal: any, index: number) => ({
          distanceId,
          name: goal.name,
          description: goal.description || null,
          targetTime: goal.targetTime || null,
          bibPrefix: goal.bibPrefix,
          maxParticipants: goal.maxParticipants || null,
          priceAdjustment: goal.priceAdjustment || 0,
          isAvailable: goal.isAvailable !== false,
          sortOrder: index,
        })),
      });

      // Update distance to enable goals
      await prisma.distance.update({
        where: { id: distanceId },
        data: { hasGoals: true },
      });
    } else {
      // No goals, disable goals feature
      await prisma.distance.update({
        where: { id: distanceId },
        data: { hasGoals: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving goals:", error);
    return NextResponse.json(
      { error: "Failed to save goals" },
      { status: 500 }
    );
  }
}
