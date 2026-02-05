// app/api/admin/import/template/route.ts - UPDATED WITH DROPDOWNS
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sample data with all required fields
    const sampleData = [
      {
        "Họ tên": "Nguyễn Văn A",
        Email: "nguyenvana@example.com",
        "Số điện thoại": "0901234567",
        "Ngày sinh": "15/08/1990",
        "Giới tính": "Nam",
        "Cự ly": "5km",
        "Mục tiêu": "Hoàn thành trong 45 phút",
        CCCD: "001234567890",
        "Địa chỉ": "123 Đường ABC",
        "Thành phố": "Hà Nội",
        "Loại áo": "Nam", // Changed column name
        "Kiểu áo": "Có tay", // Changed values
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
        "Mục tiêu": "Hoàn thành trong 60 phút",
        CCCD: "002345678901",
        "Địa chỉ": "456 Đường XYZ",
        "Thành phố": "TP.HCM",
        "Loại áo": "Nữ",
        "Kiểu áo": "3 lỗ",
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
      { wch: 30 }, // Mục tiêu
      { wch: 15 }, // CCCD
      { wch: 25 }, // Địa chỉ
      { wch: 15 }, // Thành phố
      { wch: 12 }, // Loại áo
      { wch: 12 }, // Kiểu áo
      { wch: 8 }, // Size áo
      { wch: 20 }, // Người liên hệ
      { wch: 15 }, // SĐT khẩn cấp
      { wch: 10 }, // Nhóm máu
      { wch: 10 }, // Số BIB
    ];

    // ✅ ADD DATA VALIDATION FOR DROPDOWNS
    // Note: Excel data validation requires specific cell ranges
    // We'll add validation for the most common fields (rows 2-1000)

    // Column E (Giới tính) - Gender dropdown
    ws["!dataValidation"] = ws["!dataValidation"] || [];

    // Gender validation (column E)
    for (let row = 2; row <= 1000; row++) {
      const cell = `E${row}`;
      if (!ws[cell]) ws[cell] = { t: "s", v: "" };
      ws[cell].s = {
        dataValidation: {
          type: "list",
          allowBlank: true,
          showInputMessage: true,
          showErrorMessage: true,
          formula1: '"Nam,Nữ"',
          promptTitle: "Giới tính",
          prompt: "Chọn Nam hoặc Nữ",
          errorTitle: "Giá trị không hợp lệ",
          error: "Vui lòng chọn Nam hoặc Nữ",
        },
      };
    }

    // Shirt Category validation (column K - Loại áo)
    for (let row = 2; row <= 1000; row++) {
      const cell = `K${row}`;
      if (!ws[cell]) ws[cell] = { t: "s", v: "" };
      ws[cell].s = {
        dataValidation: {
          type: "list",
          allowBlank: true,
          showInputMessage: true,
          showErrorMessage: true,
          formula1: '"Nam,Nữ,Trẻ em"',
          promptTitle: "Loại áo",
          prompt: "Chọn Nam, Nữ, hoặc Trẻ em",
          errorTitle: "Giá trị không hợp lệ",
          error: "Vui lòng chọn Nam, Nữ, hoặc Trẻ em",
        },
      };
    }

    // Shirt Type validation (column L - Kiểu áo)
    for (let row = 2; row <= 1000; row++) {
      const cell = `L${row}`;
      if (!ws[cell]) ws[cell] = { t: "s", v: "" };
      ws[cell].s = {
        dataValidation: {
          type: "list",
          allowBlank: true,
          showInputMessage: true,
          showErrorMessage: true,
          formula1: '"Có tay,3 lỗ"',
          promptTitle: "Kiểu áo",
          prompt: "Chọn Có tay hoặc 3 lỗ",
          errorTitle: "Giá trị không hợp lệ",
          error: "Vui lòng chọn Có tay hoặc 3 lỗ",
        },
      };
    }

    // Shirt Size validation (column M - Size áo)
    for (let row = 2; row <= 1000; row++) {
      const cell = `M${row}`;
      if (!ws[cell]) ws[cell] = { t: "s", v: "" };
      ws[cell].s = {
        dataValidation: {
          type: "list",
          allowBlank: true,
          showInputMessage: true,
          showErrorMessage: true,
          formula1: '"XS,S,M,L,XL,XXL,XXXL"',
          promptTitle: "Size áo",
          prompt: "Chọn XS, S, M, L, XL, XXL, hoặc XXXL",
          errorTitle: "Giá trị không hợp lệ",
          error: "Vui lòng chọn một size hợp lệ",
        },
      };
    }

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
      {
        Cột: "Giới tính",
        "Bắt buộc": "CÓ",
        "Ghi chú": "Chọn từ dropdown: Nam hoặc Nữ",
      },
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
        "Ghi chú":
          "Chọn từ dropdown: Nam, Nữ, hoặc Trẻ em. Để trống nếu không mua áo.",
      },
      {
        Cột: "Kiểu áo",
        "Bắt buộc": "KHÔNG (nếu chọn áo)",
        "Ghi chú": "Chọn từ dropdown: Có tay hoặc 3 lỗ",
      },
      {
        Cột: "Size áo",
        "Bắt buộc": "KHÔNG (nếu chọn áo)",
        "Ghi chú": "Chọn từ dropdown: XS, S, M, L, XL, XXL, XXXL",
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
    wsInstructions["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Hướng dẫn");

    // Add additional notes sheet
    const notes = [
      {
        "Lưu ý quan trọng": "TÍNH PHÍ ÁO TỰ ĐỘNG",
        "Chi tiết":
          "Nếu bạn điền đầy đủ Loại áo + Kiểu áo + Size áo, hệ thống sẽ TỰ ĐỘNG tính phí áo và cộng vào tổng chi phí đăng ký.",
      },
      {
        "Lưu ý quan trọng": "ĐỂ TRỐNG NẾU KHÔNG MUA ÁO",
        "Chi tiết":
          "Nếu VĐV không mua áo, hãy để trống CẢ 3 cột: Loại áo, Kiểu áo, Size áo",
      },
      {
        "Lưu ý quan trọng": "SỬ DỤNG DROPDOWN",
        "Chi tiết":
          "Click vào ô trong Excel sẽ hiện mũi tên dropdown. Chọn từ dropdown thay vì gõ tay để tránh lỗi.",
      },
      {
        "Lưu ý quan trọng": "KIỂM TRA TRƯỚC KHI IMPORT",
        "Chi tiết":
          "Hãy kiểm tra kỹ tất cả thông tin trong file Excel trước khi upload. Đặc biệt là: Email (không trùng), Số điện thoại, Ngày sinh, Size áo (nếu có).",
      },
    ];

    const wsNotes = XLSX.utils.json_to_sheet(notes);
    wsNotes["!cols"] = [{ wch: 30 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsNotes, "⚠️ Lưu ý quan trọng");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau-import-v2-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
