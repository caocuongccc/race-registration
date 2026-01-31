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

    // const shirtOrdersStats = await prisma.shirtOrder.groupBy({
    //   by: ["paymentStatus"],
    //   where: whereFilter,
    //   _count: true,
    //   _sum: { totalAmount: true },
    // });
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

    regsLast7Days.forEach((reg: any) => {
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

    // const shirtsByCategory: Record<string, number> = {};
    // shirtGroup.forEach((s: any) => {
    //   if (s.shirtCategory) shirtsByCategory[s.shirtCategory] = s._count;
    // });

    // const totalShirts = Object.values(shirtsByCategory).reduce(
    //   (a, b) => a + b,
    //   0
    // );

    // --- ENHANCED SHIRT STATS ---
    // 1. Shirts from Registrations (WITH_BIB)
    const shirtsWithBib = await prisma.registration.findMany({
      where: {
        ...whereFilter,
        paymentStatus: "PAID",
        shirtCategory: { not: null },
      },
      select: {
        shirtCategory: true,
        shirtType: true,
        shirtSize: true,
        shirtFee: true,
      },
    });

    // 2. Shirts from Standalone Orders
    const standaloneOrders = await prisma.shirtOrder.findMany({
      where: {
        ...whereFilter,
        orderType: "STANDALONE",
        paymentStatus: "PAID",
      },
      include: {
        items: {
          include: {
            shirt: true,
          },
        },
      },
    });

    // Aggregate shirt data
    const shirtDataMap = new Map<
      string,
      {
        category: string;
        type: string;
        size: string;
        withBib: number;
        standalone: number;
        total: number;
        revenue: number;
      }
    >();

    // Add WITH_BIB shirts
    shirtsWithBib.forEach((reg) => {
      const key = `${reg.shirtCategory}-${reg.shirtType}-${reg.shirtSize}`;
      const existing = shirtDataMap.get(key) || {
        category: reg.shirtCategory!,
        type: reg.shirtType!,
        size: reg.shirtSize!,
        withBib: 0,
        standalone: 0,
        total: 0,
        revenue: 0,
      };
      existing.withBib++;
      existing.total++;
      existing.revenue += reg.shirtFee;
      shirtDataMap.set(key, existing);
    });

    // Add STANDALONE shirts
    standaloneOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.shirt.category}-${item.shirt.type}-${item.shirt.size}`;
        const existing = shirtDataMap.get(key) || {
          category: item.shirt.category,
          type: item.shirt.type,
          size: item.shirt.size,
          withBib: 0,
          standalone: 0,
          total: 0,
          revenue: 0,
        };
        existing.standalone += item.quantity;
        existing.total += item.quantity;
        existing.revenue += item.totalPrice;
        shirtDataMap.set(key, existing);
      });
    });

    const shirtDetails = Array.from(shirtDataMap.values());

    // Aggregate by category
    const shirtsByCategory: Record<string, number> = {};
    shirtDetails.forEach((item) => {
      shirtsByCategory[item.category] =
        (shirtsByCategory[item.category] || 0) + item.total;
    });

    // Aggregate by size
    const shirtsBySize: Record<string, number> = {};
    shirtDetails.forEach((item) => {
      shirtsBySize[item.size] = (shirtsBySize[item.size] || 0) + item.total;
    });

    // Aggregate by status (from shirt orders)
    const ordersByStatus = await prisma.shirtOrder.groupBy({
      by: ["paymentStatus"],
      where: whereFilter,
      _count: true,
      _sum: { totalAmount: true },
    });

    const shirtsByStatus = {
      paid: ordersByStatus.find((s) => s.paymentStatus === "PAID")?._count || 0,
      pending:
        ordersByStatus.find((s) => s.paymentStatus === "PENDING")?._count || 0,
      failed:
        ordersByStatus.find((s) => s.paymentStatus === "FAILED")?._count || 0,
    };

    const totalShirts = shirtDetails.reduce((sum, item) => sum + item.total, 0);
    const totalWithBib = shirtDetails.reduce(
      (sum, item) => sum + item.withBib,
      0
    );
    const totalStandalone = shirtDetails.reduce(
      (sum, item) => sum + item.standalone,
      0
    );
    const totalShirtRevenue = shirtDetails.reduce(
      (sum, item) => sum + item.revenue,
      0
    );

    const shirtStats = {
      total: totalShirts,
      withBib: totalWithBib,
      standalone: totalStandalone,
      revenue: totalShirtRevenue,
      byCategory: shirtsByCategory,
      bySize: shirtsBySize,
      byStatus: shirtsByStatus,
      details: shirtDetails,
    };

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

    registrantsDob.forEach((reg: any) => {
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
      shirtStats,
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
