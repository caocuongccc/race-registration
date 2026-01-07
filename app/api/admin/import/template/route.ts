// app/api/admin/import/template/route.ts - UPDATED
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sample data with Goals column
    const sampleData = [
      {
        "Họ tên": "Nguyễn Văn A",
        Email: "nguyenvana@example.com",
        "Số điện thoại": "0901234567",
        "Ngày sinh": "15/08/1990",
        "Giới tính": "Nam",
        "Cự ly": "5km",
        "Mục tiêu": "Hoàn thành trong 45 phút", // NEW
        CCCD: "001234567890",
        "Địa chỉ": "123 Đường ABC",
        "Thành phố": "Hà Nội",
        "Loại áo": "Nam",
        "Kiểu áo": "Tay ngắn",
        "Size áo": "L",
        "Người liên hệ khẩn cấp": "Nguyễn Thị B",
        "SĐT khẩn cấp": "0912345678",
        "Nhóm máu": "O",
        "Số BIB": "",
      },
      {
        "Họ tên": "Trần Thị C",
        Email: "tranthic@example.com",
        "Số điện thoại": "0909876543",
        "Ngày sinh": "20/03/1992",
        "Giới tính": "Nữ",
        "Cự ly": "5km",
        "Mục tiêu": "Hoàn thành trong 60 phút", // NEW
        CCCD: "002345678901",
        "Địa chỉ": "456 Đường XYZ",
        "Thành phố": "TP.HCM",
        "Loại áo": "Nữ",
        "Kiểu áo": "Tay ngắn",
        "Size áo": "M",
        "Người liên hệ khẩn cấp": "Trần Văn D",
        "SĐT khẩn cấp": "0923456789",
        "Nhóm máu": "A",
        "Số BIB": "",
      },
    ];

    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws["!cols"] = [
      { wch: 20 }, // Họ tên
      { wch: 25 }, // Email
      { wch: 15 }, // Số điện thoại
      { wch: 12 }, // Ngày sinh
      { wch: 10 }, // Giới tính
      { wch: 10 }, // Cự ly
      { wch: 30 }, // Mục tiêu - NEW (wider column)
      { wch: 15 }, // CCCD
      { wch: 25 }, // Địa chỉ
      { wch: 15 }, // Thành phố
      { wch: 10 }, // Loại áo
      { wch: 12 }, // Kiểu áo
      { wch: 8 }, // Size áo
      { wch: 20 }, // Người liên hệ
      { wch: 15 }, // SĐT khẩn cấp
      { wch: 10 }, // Nhóm máu
      { wch: 10 }, // Số BIB
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Danh sách VĐV");

    // Create instructions sheet
    const instructions = [
      { Cột: "Họ tên", "Bắt buộc": "CÓ", "Ghi chú": "Họ và tên đầy đủ" },
      { Cột: "Email", "Bắt buộc": "CÓ", "Ghi chú": "Email hợp lệ" },
      {
        Cột: "Số điện thoại",
        "Bắt buộc": "CÓ",
        "Ghi chú": "Số điện thoại 10 số",
      },
      {
        Cột: "Ngày sinh",
        "Bắt buộc": "CÓ",
        "Ghi chú": "Định dạng: DD/MM/YYYY",
      },
      { Cột: "Giới tính", "Bắt buộc": "CÓ", "Ghi chú": "Nam hoặc Nữ" },
      {
        Cột: "Cự ly",
        "Bắt buộc": "CÓ",
        "Ghi chú": "Phải khớp tên cự ly trong sự kiện",
      },
      {
        Cột: "Mục tiêu",
        "Bắt buộc": "KHÔNG",
        "Ghi chú":
          "Nếu có: phải khớp tên mục tiêu. Ví dụ: 'Hoàn thành trong 45 phút'",
      },
      { Cột: "CCCD", "Bắt buộc": "KHÔNG", "Ghi chú": "Số CCCD/CMND" },
      { Cột: "Địa chỉ", "Bắt buộc": "KHÔNG", "Ghi chú": "" },
      { Cột: "Thành phố", "Bắt buộc": "KHÔNG", "Ghi chú": "" },
      {
        Cột: "Loại áo",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "Nam, Nữ, hoặc Trẻ Em",
      },
      {
        Cột: "Kiểu áo",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "Tay ngắn hoặc Tay dài",
      },
      {
        Cột: "Size áo",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "S, M, L, XL, XXL, XXXL",
      },
      {
        Cột: "Người liên hệ khẩn cấp",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "",
      },
      { Cột: "SĐT khẩn cấp", "Bắt buộc": "KHÔNG", "Ghi chú": "" },
      {
        Cột: "Nhóm máu",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "A, B, AB, O, A+, B+, AB+, O+, A-, B-, AB-, O-",
      },
      {
        Cột: "Số BIB",
        "Bắt buộc": "KHÔNG",
        "Ghi chú": "Để trống để hệ thống tự sinh. Nếu điền phải unique.",
      },
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Hướng dẫn");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau-import-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
