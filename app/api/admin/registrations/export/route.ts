// app/api/admin/registrations/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const whereClause: any = {};
    if (eventId && eventId !== "all") {
      whereClause.eventId = eventId;
    }

    const registrations = await prisma.registration.findMany({
      where: whereClause,
      include: {
        distance: true,
        event: true,
      },
      orderBy: {
        bibNumber: "asc",
      },
    });

    // Prepare data for Excel
    const excelData = registrations.map((r: any, index: number) => ({
      STT: index + 1,
      "Số BIB": r.bibNumber || "Chưa có",
      "Họ tên": r.fullName,
      "Ngày sinh": new Date(r.dob).toLocaleDateString("vi-VN"),
      "Giới tính": r.gender === "MALE" ? "Nam" : "Nữ",
      Email: r.email,
      "Số điện thoại": r.phone,
      "CCCD/CMND": r.idCard,
      "Địa chỉ": r.address || "",
      "Cự ly": r.distance.name,
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
      "Trạng thái": r.paymentStatus,
      "Ngày đăng ký": new Date(r.registrationDate).toLocaleDateString("vi-VN"),
      "Ngày thanh toán": r.paymentDate
        ? new Date(r.paymentDate).toLocaleDateString("vi-VN")
        : "",
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map((key: any) => {
      const maxLen = Math.max(
        key.length,
        ...excelData.map(
          (row: any) => String(row[key as keyof typeof row]).length
        )
      );
      return { wch: Math.min(maxLen + 2, maxWidth) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Registrations");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Return as file
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="registrations-${Date.now()}.xlsx"`,
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
