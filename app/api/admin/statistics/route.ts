// app/api/admin/statistics/route.ts - ADD DISTANCE DETAILS
// ✅ Add: Chi tiết theo cự ly với phân loại đã thanh toán / chờ thanh toán

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

    // --- REVENUE BY DISTANCE (only PAID) ---
    const revenueByDistanceRaw = await prisma.registration.groupBy({
      by: ["distanceId"],
      where: {
        ...whereFilter,
        paymentStatus: "PAID", // ✅ Only paid
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

    // ✅ NEW: Chi tiết theo cự ly - Tách biệt paid/pending/total
    const allDistanceRegistrations = await prisma.registration.groupBy({
      by: ["distanceId", "paymentStatus"],
      where: whereFilter,
      _count: true,
    });

    // Get all distance IDs (including those with no paid registrations)
    const allDistanceIds = [
      ...new Set(allDistanceRegistrations.map((r) => r.distanceId)),
    ];

    const allDistances = await prisma.distance.findMany({
      where: { id: { in: allDistanceIds } },
      orderBy: { sortOrder: "asc" },
    });

    // Build detailed distance stats
    const distanceDetails = allDistances.map((distance) => {
      const distanceRegs = allDistanceRegistrations.filter(
        (r) => r.distanceId === distance.id,
      );

      const paid =
        distanceRegs.find((r) => r.paymentStatus === "PAID")?._count || 0;
      const pending =
        distanceRegs.find((r) => r.paymentStatus === "PENDING")?._count || 0;
      const failed =
        distanceRegs.find((r) => r.paymentStatus === "FAILED")?._count || 0;

      return {
        distanceId: distance.id,
        distanceName: distance.name,
        bibPrefix: distance.bibPrefix,
        price: distance.price,
        total: paid + pending + failed,
        paid,
        pending,
        failed,
        paidPercentage:
          paid + pending + failed > 0
            ? Math.round((paid / (paid + pending + failed)) * 100)
            : 0,
      };
    });

    console.log(`📊 [Distance Details]`);
    distanceDetails.forEach((d) => {
      console.log(
        `   ${d.distanceName}: ${d.paid} paid / ${d.total} total (${d.paidPercentage}%)`,
      );
    });

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
      registrationsByDateMap.entries(),
    ).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      count,
    }));

    // --- ENHANCED SHIRT STATS ---
    const shirtsWithBib = await prisma.registration.findMany({
      where: {
        ...whereFilter,
        paymentStatus: "PAID",
        shirtId: { not: null },
      },
      select: {
        shirtCategory: true,
        shirtType: true,
        shirtSize: true,
        shirtFee: true,
      },
    });

    console.log(
      `📊 [Statistics] Found ${shirtsWithBib.length} shirts with BIB`,
    );

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

    console.log(
      `📊 [Statistics] Found ${standaloneOrders.length} standalone orders`,
    );

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

    shirtsWithBib.forEach((reg) => {
      if (!reg.shirtCategory || !reg.shirtType || !reg.shirtSize) {
        console.warn(
          `⚠️ [Statistics] Registration has shirtId but missing shirt details`,
        );
        return;
      }

      const key = `${reg.shirtCategory}-${reg.shirtType}-${reg.shirtSize}`;
      const existing = shirtDataMap.get(key) || {
        category: reg.shirtCategory,
        type: reg.shirtType,
        size: reg.shirtSize,
        withBib: 0,
        standalone: 0,
        total: 0,
        revenue: 0,
      };
      existing.withBib++;
      existing.total++;
      existing.revenue += reg.shirtFee || 0;
      shirtDataMap.set(key, existing);
    });

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

    const shirtsByCategory: Record<string, number> = {};
    shirtDetails.forEach((item) => {
      shirtsByCategory[item.category] =
        (shirtsByCategory[item.category] || 0) + item.total;
    });

    const shirtsBySize: Record<string, number> = {};
    shirtDetails.forEach((item) => {
      shirtsBySize[item.size] = (shirtsBySize[item.size] || 0) + item.total;
    });

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
      0,
    );
    const totalStandalone = shirtDetails.reduce(
      (sum, item) => sum + item.standalone,
      0,
    );
    const totalShirtRevenue = shirtDetails.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );

    console.log(`📊 [Statistics Summary]`);
    console.log(`   Total shirts: ${totalShirts}`);
    console.log(`   With BIB: ${totalWithBib}`);
    console.log(`   Standalone: ${totalStandalone}`);
    console.log(`   Revenue: ${totalShirtRevenue}`);

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

    // --- EMAIL STATS ---
    const getEmailTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        REGISTRATION_PENDING: "Email đăng ký",
        PAYMENT_CONFIRMED: "Xác nhận thanh toán",
        BIB_ANNOUNCEMENT: "Thông báo BIB",
        RACE_PACK_INFO: "Thông tin Race Pack",
        REGISTRATION_CONFIRMATION: "Xác nhận đăng ký",
        PAYMENT_REMINDER: "Nhắc thanh toán",
        PAYMENT_CONFIRMATION: "Xác nhận thanh toán",
        BIB_NUMBER_ASSIGNED: "Thông báo BIB",
        EVENT_REMINDER: "Nhắc nhở sự kiện",
      };
      return labels[type] || type;
    };

    let emailStats: any[] = [];

    try {
      let emailWhereClause: any = {};

      if (eventId && eventId !== "all") {
        emailWhereClause = {
          registration: {
            eventId: eventId,
          },
        };
      }

      const emailLogs = await prisma.emailLog.groupBy({
        by: ["emailType", "status"],
        where: emailWhereClause,
        _count: {
          id: true,
        },
      });

      const emailStatsByType = emailLogs.reduce((acc, log) => {
        const type = log.emailType;
        if (!acc[type]) {
          acc[type] = {
            type: getEmailTypeLabel(type),
            sent: 0,
            failed: 0,
            pending: 0,
            total: 0,
          };
        }

        const count = log._count.id;
        acc[type].total += count;

        switch (log.status) {
          case "SENT":
            acc[type].sent += count;
            break;
          case "FAILED":
            acc[type].failed += count;
            break;
          case "PENDING":
            acc[type].pending += count;
            break;
        }

        return acc;
      }, {} as any);

      emailStats = Object.values(emailStatsByType);

      console.log(`📧 [Email Stats] Found ${emailStats.length} email types`);
    } catch (error) {
      console.log("⚠️ EmailLog table not found or error:", error);
      emailStats = [];
    }

    return NextResponse.json({
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      totalRevenue,
      revenueByDistance,
      registrationsByDate,
      distanceDetails, // ✅ NEW: Chi tiết theo cự ly
      shirtStats,
      ageGroups,
      emailStats,
    });
  } catch (error) {
    console.error("❌ Statistics API error:", error);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 },
    );
  }
}
