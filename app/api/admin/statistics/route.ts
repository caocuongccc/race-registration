// app/api/admin/statistics/route.ts - OPTIMIZED + SAFE
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

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // ✅ Run independent queries in parallel
    const [
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      revenueResult,
      revenueByDistanceRaw,
      allDistanceRegistrations,
      regsLast7Days,
      shirtsWithBibGrouped,
      ordersByStatus,
      registrantsDob,
    ] = await Promise.all([
      // Summary counts
      prisma.registration.count({ where: whereFilter }),
      prisma.registration.count({ where: { ...whereFilter, paymentStatus: "PAID" } }),
      prisma.registration.count({ where: { ...whereFilter, paymentStatus: "PENDING" } }),

      // Total revenue
      prisma.registration.aggregate({
        where: { ...whereFilter, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),

      // Revenue by distance (PAID only)
      prisma.registration.groupBy({
        by: ["distanceId"],
        where: { ...whereFilter, paymentStatus: "PAID" },
        _sum: { totalAmount: true },
        _count: true,
      }),

      // Distance details (all payment statuses)
      prisma.registration.groupBy({
        by: ["distanceId", "paymentStatus"],
        where: whereFilter,
        _count: true,
      }),

      // Registration by date (last 7 days) - include paymentStatus to build paid count in one pass
      prisma.registration.findMany({
        where: { ...whereFilter, registrationDate: { gte: sevenDaysAgo } },
        select: { registrationDate: true, paymentStatus: true },
      }),

      // ✅ Shirt stats with BIB - GROUP BY in DB
      prisma.registration.groupBy({
        by: ["shirtCategory", "shirtType", "shirtSize"],
        where: {
          ...whereFilter,
          paymentStatus: "PAID",
          shirtId: { not: null },
          shirtCategory: { not: null },
          shirtType: { not: null },
          shirtSize: { not: null },
        },
        _count: true,
        _sum: { shirtFee: true },
      }),

      // Shirt orders by payment status
      prisma.shirtOrder.groupBy({
        by: ["paymentStatus"],
        where: whereFilter,
        _count: true,
      }),

      // Age groups - only fetch dob field
      prisma.registration.findMany({
        where: { ...whereFilter, paymentStatus: "PAID" },
        select: { dob: true },
      }),
    ]);

    const totalRevenue = revenueResult._sum.totalAmount || 0;

    // --- BUILD DISTANCE METADATA (single query) ---
    const distanceIds = revenueByDistanceRaw.map((i: any) => i.distanceId);
    const allDistanceIds = [
      ...new Set(allDistanceRegistrations.map((r) => r.distanceId)),
    ];
    const allDistanceIdsToFetch = [...new Set([...distanceIds, ...allDistanceIds])];

    const distances = allDistanceIdsToFetch.length > 0
      ? await prisma.distance.findMany({
          where: { id: { in: allDistanceIdsToFetch } },
          orderBy: { sortOrder: "asc" },
        })
      : [];

    const distanceMap = new Map(distances.map((d) => [d.id, d]));

    // --- REVENUE BY DISTANCE ---
    const revenueByDistance = revenueByDistanceRaw.map((i: any) => ({
      name: distanceMap.get(i.distanceId)?.name || "Unknown",
      value: i._sum.totalAmount || 0,
      count: i._count,
    }));

    // --- DISTANCE DETAILS ---
    const distanceDetails = distances
      .filter((d) => allDistanceIds.includes(d.id))
      .map((distance) => {
        const regs = allDistanceRegistrations.filter((r) => r.distanceId === distance.id);
        const paid = regs.find((r) => r.paymentStatus === "PAID")?._count || 0;
        const pending = regs.find((r) => r.paymentStatus === "PENDING")?._count || 0;
        const failed = regs.find((r) => r.paymentStatus === "FAILED")?._count || 0;
        const total = paid + pending + failed;
        return {
          distanceId: distance.id,
          distanceName: distance.name,
          bibPrefix: distance.bibPrefix,
          price: distance.price,
          total,
          paid,
          pending,
          failed,
          paidPercentage: total > 0 ? Math.round((paid / total) * 100) : 0,
        };
      });

    // --- REGISTRATIONS BY DATE (last 7 days) ---
    const regsByDateMap = new Map<string, { count: number; paid: number }>();
    regsLast7Days.forEach((reg: any) => {
      const k = reg.registrationDate.toISOString().slice(0, 10);
      const existing = regsByDateMap.get(k) || { count: 0, paid: 0 };
      existing.count++;
      if (reg.paymentStatus === "PAID") existing.paid++;
      regsByDateMap.set(k, existing);
    });

    const registrationsByDate = Array.from(regsByDateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, paid }]) => ({
        date: new Date(date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        count,
        paid,
      }));

    // --- SHIRT STATS ---
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

    // Shirts purchased alongside BIB (already grouped by DB)
    shirtsWithBibGrouped.forEach((row: any) => {
      if (!row.shirtCategory || !row.shirtType || !row.shirtSize) return;
      const key = `${row.shirtCategory}-${row.shirtType}-${row.shirtSize}`;
      const count = row._count;
      shirtDataMap.set(key, {
        category: row.shirtCategory,
        type: row.shirtType,
        size: row.shirtSize,
        withBib: count,
        standalone: 0,
        total: count,
        revenue: row._sum?.shirtFee || 0,
      });
    });

    // ✅ Safe standalone orders: use findMany with include (avoid shirtOrderItem.groupBy)
    try {
      const standaloneOrders = await prisma.shirtOrder.findMany({
        where: {
          ...(eventId && eventId !== "all" ? { eventId } : {}),
          orderType: "STANDALONE",
          paymentStatus: "PAID",
        },
        include: {
          items: {
            include: { shirt: true },
          },
        },
      });

      standaloneOrders.forEach((order) => {
        order.items.forEach((item: any) => {
          if (!item.shirt) return;
          const key = `${item.shirt.category}-${item.shirt.type}-${item.shirt.size}`;
          const qty = item.quantity || 0;
          const rev = item.totalPrice || 0;
          const existing = shirtDataMap.get(key);
          if (existing) {
            existing.standalone += qty;
            existing.total += qty;
            existing.revenue += rev;
          } else {
            shirtDataMap.set(key, {
              category: item.shirt.category,
              type: item.shirt.type,
              size: item.shirt.size,
              withBib: 0,
              standalone: qty,
              total: qty,
              revenue: rev,
            });
          }
        });
      });
    } catch {
      // Standalone shirt orders query failed - skip, shirt stats will only have BIB data
    }

    const shirtDetails = Array.from(shirtDataMap.values());
    const shirtsByCategory: Record<string, number> = {};
    const shirtsBySize: Record<string, number> = {};
    shirtDetails.forEach((item) => {
      shirtsByCategory[item.category] = (shirtsByCategory[item.category] || 0) + item.total;
      shirtsBySize[item.size] = (shirtsBySize[item.size] || 0) + item.total;
    });

    const shirtsByStatus = {
      paid: ordersByStatus.find((s) => s.paymentStatus === "PAID")?._count || 0,
      pending: ordersByStatus.find((s) => s.paymentStatus === "PENDING")?._count || 0,
      failed: ordersByStatus.find((s) => s.paymentStatus === "FAILED")?._count || 0,
    };

    const shirtStats = {
      total: shirtDetails.reduce((sum, item) => sum + item.total, 0),
      withBib: shirtDetails.reduce((sum, item) => sum + item.withBib, 0),
      standalone: shirtDetails.reduce((sum, item) => sum + item.standalone, 0),
      revenue: shirtDetails.reduce((sum, item) => sum + item.revenue, 0),
      byCategory: shirtsByCategory,
      bySize: shirtsBySize,
      byStatus: shirtsByStatus,
      details: shirtDetails,
    };

    // --- AGE GROUPS ---
    const ageGroups: Record<string, number> = { "18-29": 0, "30-39": 0, "40-49": 0, "50+": 0 };
    const currentYear = now.getFullYear();
    registrantsDob.forEach((reg: any) => {
      if (!reg.dob) return;
      const age = currentYear - reg.dob.getFullYear();
      if (age >= 18 && age <= 29) ageGroups["18-29"]++;
      else if (age >= 30 && age <= 39) ageGroups["30-39"]++;
      else if (age >= 40 && age <= 49) ageGroups["40-49"]++;
      else if (age >= 50) ageGroups["50+"]++;
    });

    // --- EMAIL STATS ---
    const emailTypeLabel: Record<string, string> = {
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

    let emailStats: any[] = [];
    try {
      const emailWhereClause =
        eventId && eventId !== "all"
          ? { registration: { eventId } }
          : {};
      const emailLogs = await prisma.emailLog.groupBy({
        by: ["emailType", "status"],
        where: emailWhereClause,
        _count: { id: true },
      });
      const emailStatsByType = emailLogs.reduce((acc: any, log) => {
        const type = log.emailType;
        if (!acc[type]) {
          acc[type] = { type: emailTypeLabel[type] || type, sent: 0, failed: 0, pending: 0, total: 0 };
        }
        const count = log._count.id;
        acc[type].total += count;
        if (log.status === "SENT") acc[type].sent += count;
        else if (log.status === "FAILED") acc[type].failed += count;
        else if (log.status === "PENDING") acc[type].pending += count;
        return acc;
      }, {});
      emailStats = Object.values(emailStatsByType);
    } catch {
      emailStats = [];
    }

    return NextResponse.json({
      totalRegistrations,
      paidRegistrations,
      pendingRegistrations,
      totalRevenue,
      revenueByDistance,
      registrationsByDate,
      distanceDetails,
      shirtStats,
      ageGroups,
      emailStats,
    });
  } catch (error) {
    console.error("❌ Statistics API error:", error);
    return NextResponse.json(
      { error: "Failed to load statistics" },
      { status: 500 }
    );
  }
}
