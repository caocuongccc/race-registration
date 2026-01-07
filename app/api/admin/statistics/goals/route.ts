// app/api/admin/statistics/goals/route.ts
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

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
    }

    // Get all registrations with goals
    const registrations = await prisma.registration.findMany({
      where: {
        eventId,
        paymentStatus: "PAID",
      },
      include: {
        distance: true,
        distanceGoal: true,
      },
    });

    // Group by distance and goal
    const statsByDistanceAndGoal: Record<
      string,
      {
        distanceName: string;
        distanceId: string;
        goals: Record<
          string,
          {
            goalName: string;
            goalId: string;
            bibPrefix: string;
            count: number;
            revenue: number;
            avgAge: number;
            genderBreakdown: { male: number; female: number };
            lastBib: string;
          }
        >;
        withoutGoalCount: number;
        withoutGoalRevenue: number;
      }
    > = {};

    for (const reg of registrations) {
      const distanceKey = reg.distanceId;

      if (!statsByDistanceAndGoal[distanceKey]) {
        statsByDistanceAndGoal[distanceKey] = {
          distanceName: reg.distance.name,
          distanceId: reg.distanceId,
          goals: {},
          withoutGoalCount: 0,
          withoutGoalRevenue: 0,
        };
      }

      if (reg.distanceGoalId && reg.distanceGoal) {
        const goalKey = reg.distanceGoalId;

        if (!statsByDistanceAndGoal[distanceKey].goals[goalKey]) {
          statsByDistanceAndGoal[distanceKey].goals[goalKey] = {
            goalName: reg.distanceGoal.name,
            goalId: reg.distanceGoalId,
            bibPrefix: reg.distanceGoal.bibPrefix,
            count: 0,
            revenue: 0,
            avgAge: 0,
            genderBreakdown: { male: 0, female: 0 },
            lastBib: "",
          };
        }

        const goalStats = statsByDistanceAndGoal[distanceKey].goals[goalKey];
        goalStats.count++;
        goalStats.revenue += reg.totalAmount;

        if (reg.gender === "MALE") goalStats.genderBreakdown.male++;
        else goalStats.genderBreakdown.female++;

        if (
          reg.bibNumber &&
          (!goalStats.lastBib || reg.bibNumber > goalStats.lastBib)
        ) {
          goalStats.lastBib = reg.bibNumber;
        }

        // Calculate age
        const age = new Date().getFullYear() - new Date(reg.dob).getFullYear();
        goalStats.avgAge =
          (goalStats.avgAge * (goalStats.count - 1) + age) / goalStats.count;
      } else {
        // Without goal
        statsByDistanceAndGoal[distanceKey].withoutGoalCount++;
        statsByDistanceAndGoal[distanceKey].withoutGoalRevenue +=
          reg.totalAmount;
      }
    }

    // Convert to array
    const result = Object.values(statsByDistanceAndGoal).map((dist) => ({
      distanceName: dist.distanceName,
      distanceId: dist.distanceId,
      goals: Object.values(dist.goals).sort((a, b) =>
        a.bibPrefix.localeCompare(b.bibPrefix)
      ),
      withoutGoalCount: dist.withoutGoalCount,
      withoutGoalRevenue: dist.withoutGoalRevenue,
      totalCount:
        dist.withoutGoalCount +
        Object.values(dist.goals).reduce((sum, g) => sum + g.count, 0),
      totalRevenue:
        dist.withoutGoalRevenue +
        Object.values(dist.goals).reduce((sum, g) => sum + g.revenue, 0),
    }));

    return NextResponse.json({ statistics: result });
  } catch (error) {
    console.error("Error loading goal statistics:", error);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
