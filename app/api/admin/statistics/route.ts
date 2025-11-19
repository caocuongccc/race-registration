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

    const whereFilter = eventId && eventId !== "all" ? { eventId } : {};

    // --- SUMMARY COUNTS ---
    const [totalRegistrations, paidRegistrations, pendingRegistrations] =
      await Promise.all([
        prisma.registration.count({ where: whereFilter }),
        prisma.registration.count({
          where: { ...whereFilter, paymentStatus: "PAID" },
        }),
        prisma.registration.count({
          where: { ...whereFilter, paymentStatus: "PENDING" },
        }),
      ]);

    // --- TOTAL REVENUE ---
    const revenueResult = await prisma.registration.aggregate({
      where: { ...whereFilter, paymentStatus: "PAID" },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenueResult._sum.totalAmount || 0;

    // --- REVENUE BY DISTANCE ---
    const revenueByDistanceRaw = await prisma.registration.groupBy({
      by: ["distanceId"],
      where: {
        ...whereFilter,
        paymentStatus: "PAID",
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const distanceIds = revenueByDistanceRaw.map((i: any) => i.distanceId);

    const distances = await prisma.distance.findMany({
      where: { id: { in: distanceIds } },
    });

    const distanceMap = new Map(distances.map((d: any) => [d.id, d.name]));

    const revenueByDistance = revenueByDistanceRaw.map((i: any) => ({
      name: distanceMap.get(i.distanceId) || "Unknown",
      value: i._sum.totalAmount || 0,
      count: i._count,
    }));

    // --- REGISTRATION BY DATE (7 days) ---
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const regsLast7Days = await prisma.registration.findMany({
      where: {
        ...whereFilter,
        registrationDate: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        registrationDate: true,
      },
    });

    const registrationsByDateMap = new Map<string, number>();

    regsLast7Days.forEach((reg) => {
      const k = reg.registrationDate.toISOString().slice(0, 10);
      registrationsByDateMap.set(k, (registrationsByDateMap.get(k) || 0) + 1);
    });

    const registrationsByDate = Array.from(
      registrationsByDateMap.entries()
    ).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      count,
    }));

    // --- SHIRT STATS ---
    const shirtGroup = await prisma.registration.groupBy({
      by: ["shirtCategory"],
      where: {
        ...whereFilter,
        paymentStatus: "PAID",
        shirtCategory: { not: null },
      },
      _count: true,
    });

    const shirtsByCategory: Record<string, number> = {};
    shirtGroup.forEach((s) => {
      if (s.shirtCategory) shirtsByCategory[s.shirtCategory] = s._count;
    });

    const totalShirts = Object.values(shirtsByCategory).reduce(
      (a, b) => a + b,
      0
    );

    // --- AGE GROUPS ---
    const registrantsDob = await prisma.registration.findMany({
      where: { ...whereFilter, paymentStatus: "PAID" },
      select: { dob: true },
    });

    const ageGroups = {
      "18-29": 0,
      "30-39": 0,
      "40-49": 0,
      "50+": 0,
    };

    registrantsDob.forEach((reg) => {
      if (!reg.dob) return;
      const age = now.getFullYear() - reg.dob.getFullYear();
      if (age >= 18 && age <= 29) ageGroups["18-29"]++;
      else if (age >= 30 && age <= 39) ageGroups["30-39"]++;
      else if (age >= 40 && age <= 49) ageGroups["40-49"]++;
      else if (age >= 50) ageGroups["50+"]++;
    });

    return NextResponse.json({
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      totalRevenue,
      revenueByDistance,
      registrationsByDate,
      shirtStats: {
        total: totalShirts,
        byCategory: shirtsByCategory,
      },
      ageGroups,
    });
  } catch (error) {
    console.error("Statistics API error:", error);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
