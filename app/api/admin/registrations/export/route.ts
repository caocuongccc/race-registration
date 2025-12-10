// app/api/admin/registrations/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Helper: Calculate age group
function getAgeGroup(dob: Date): string {
  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear();

  if (age < 18) return "Dưới 18";
  if (age <= 29) return "18-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  return "60+";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId || eventId === "all") {
      return NextResponse.json(
        { error: "Vui lòng chọn sự kiện cụ thể" },
        { status: 400 }
      );
    }

    // Get event info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all distances
    const distances = await prisma.distance.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });

    // Get all registrations
    const registrations = await prisma.registration.findMany({
      where: { eventId, paymentStatus: "PAID" },
      include: {
        distance: true,
        event: true,
      },
      orderBy: {
        bibNumber: "asc",
      },
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // ===================================
    // SHEET 1: SUMMARY (Tổng quan)
    // ===================================
    const summaryData = [
      ["SỰ KIỆN", event.name],
      ["Ngày xuất", new Date().toLocaleDateString("vi-VN")],
      [""],
      ["TỔNG QUAN"],
      ["Tổng đăng ký đã thanh toán", registrations.length],
      [""],
      ["PHÂN BỐ THEO CỰ LY"],
      ...distances.map((d) => [
        d.name,
        registrations.filter((r) => r.distanceId === d.id).length,
      ]),
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng quan");

    // ===================================
    // SHEETS 2+: BY DISTANCE (Theo cự ly)
    // ===================================
    distances.forEach((distance) => {
      const distanceRegs = registrations
        .filter((r) => r.distanceId === distance.id)
        .sort((a, b) => {
          const bibA = a.bibNumber || "";
          const bibB = b.bibNumber || "";
          return bibA.localeCompare(bibB);
        });

      if (distanceRegs.length === 0) return;

      const distanceData = distanceRegs.map((r, index) => ({
        STT: index + 1,
        "Số BIB": r.bibNumber || "Chưa có",
        "Họ tên": r.fullName,
        "Ngày sinh": new Date(r.dob).toLocaleDateString("vi-VN"),
        "Nhóm tuổi": getAgeGroup(r.dob),
        "Giới tính": r.gender === "MALE" ? "Nam" : "Nữ",
        Email: r.email,
        "Số điện thoại": r.phone,
        "CCCD/CMND": r.idCard,
        "Địa chỉ": r.address || "",
        Áo: r.shirtSize
          ? `${
              r.shirtCategory === "MALE"
                ? "Nam"
                : r.shirtCategory === "FEMALE"
                  ? "Nữ"
                  : "Trẻ em"
            } - ${
              r.shirtType === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"
            } - ${r.shirtSize}`
          : "Không",
        "Phí đăng ký": r.raceFee,
        "Phí áo": r.shirtFee,
        "Tổng tiền": r.totalAmount,
        "Ngày đăng ký": new Date(r.registrationDate).toLocaleDateString(
          "vi-VN"
        ),
        "Ngày thanh toán": r.paymentDate
          ? new Date(r.paymentDate).toLocaleDateString("vi-VN")
          : "",
      }));

      const ws = XLSX.utils.json_to_sheet(distanceData);

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(distanceData[0] || {}).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...distanceData.map((row: any) => String(row[key]).length)
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      ws["!cols"] = colWidths;

      // Sheet name: remove special chars
      const sheetName = distance.name
        .replace(/[\/\\?*\[\]]/g, "-")
        .substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // ===================================
    // SHEET: SHIRT STATISTICS (Thống kê áo)
    // ===================================
    const shirtsWithSize = registrations.filter(
      (r) => r.shirtSize && r.shirtCategory && r.shirtType
    );

    if (shirtsWithSize.length > 0) {
      // Group by category, type, size
      const shirtStats: Record<
        string,
        Record<string, Record<string, number>>
      > = {};

      shirtsWithSize.forEach((r) => {
        const category = r.shirtCategory!;
        const type = r.shirtType!;
        const size = r.shirtSize!;

        if (!shirtStats[category]) shirtStats[category] = {};
        if (!shirtStats[category][type]) shirtStats[category][type] = {};
        if (!shirtStats[category][type][size])
          shirtStats[category][type][size] = 0;

        shirtStats[category][type][size]++;
      });

      // Build shirt data
      const shirtData: any[] = [];

      // Header
      shirtData.push([
        "THỐNG KÊ ÁO KỶ NIỆM",
        "",
        "",
        "",
        `Tổng: ${shirtsWithSize.length} áo`,
      ]);
      shirtData.push([]);

      // For each category
      Object.entries(shirtStats).forEach(([category, types]) => {
        const categoryName =
          category === "MALE" ? "NAM" : category === "FEMALE" ? "NỮ" : "TRẺ EM";

        shirtData.push([`=== ${categoryName} ===`]);
        shirtData.push(["Loại áo", "Size", "Số lượng"]);

        Object.entries(types).forEach(([type, sizes]) => {
          const typeName = type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ";

          Object.entries(sizes).forEach(([size, count]) => {
            shirtData.push([typeName, size, count]);
          });

          // Subtotal for this type
          const typeTotal = Object.values(sizes).reduce(
            (sum, count) => sum + count,
            0
          );
          shirtData.push(["", "Tổng " + typeName, typeTotal]);
        });

        // Subtotal for this category
        const categoryTotal = Object.values(types)
          .flatMap((sizes) => Object.values(sizes))
          .reduce((sum, count) => sum + count, 0);
        shirtData.push(["", `TỔNG ${categoryName}`, categoryTotal]);
        shirtData.push([]);
      });

      // Size breakdown
      shirtData.push(["PHÂN BỐ THEO SIZE"]);
      const sizeBreakdown: Record<string, number> = {};
      shirtsWithSize.forEach((r) => {
        const size = r.shirtSize!;
        sizeBreakdown[size] = (sizeBreakdown[size] || 0) + 1;
      });

      Object.entries(sizeBreakdown)
        .sort((a, b) => {
          const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
          return sizeOrder.indexOf(a[0]) - sizeOrder.indexOf(b[0]);
        })
        .forEach(([size, count]) => {
          shirtData.push([size, count]);
        });

      const wsShirts = XLSX.utils.aoa_to_sheet(shirtData);
      wsShirts["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsShirts, "Thống kê áo");
    }

    // ===================================
    // GENERATE FILE
    // ===================================
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Return as file
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="registrations-${eventId}-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
