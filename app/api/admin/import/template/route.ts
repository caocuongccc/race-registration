// app/api/admin/import/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create template workbook
    const template = [
      [
        "Họ tên",
        "Email",
        "Số điện thoại",
        "Ngày sinh (DD/MM/YYYY)",
        "Giới tính (Nam/Nữ)",
        "CCCD",
        "Địa chỉ",
        "Cự ly",
        "Loại áo (Nam/Nữ/Trẻ em)",
        "Kiểu áo (Có tay/3 lỗ)",
        "Size áo",
        "Số BIB (tùy chọn)",
      ],
      [
        "Nguyễn Văn A",
        "example@email.com",
        "0912345678",
        "01/01/1990",
        "Nam",
        "001234567890",
        "123 Đường ABC, Quận 1",
        "5km",
        "Nam",
        "Có tay",
        "L",
        "",
      ],
      [
        "Trần Thị B",
        "example2@email.com",
        "0987654321",
        "15/03/1995",
        "Nữ",
        "009876543210",
        "456 Đường XYZ, Quận 2",
        "10km",
        "Nữ",
        "3 lỗ",
        "M",
        "",
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(template);

    // Set column widths
    ws["!cols"] = [
      { wch: 20 }, // Họ tên
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 20 }, // DOB
      { wch: 15 }, // Gender
      { wch: 15 }, // CCCD
      { wch: 30 }, // Address
      { wch: 10 }, // Distance
      { wch: 20 }, // Shirt Category
      { wch: 15 }, // Shirt Type
      { wch: 10 }, // Size
      { wch: 15 }, // BIB
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Mẫu đăng ký");

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau-import-dang-ky-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
