// app/api/admin/import/upload/route.ts - FIXED SHIRT FEE CALCULATION
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Helper: Parse date from DD/MM/YYYY format
export function parseDate(dateStr: string): Date | null {
  if (dateStr == null) return null;

  const str = String(dateStr).trim();
  if (!str || str === "null" || str === "undefined") return null;

  // Match d/M/yyyy or dd/MM/yyyy
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  var day = Number(match[1]);
  var month = Number(match[2]) - 1; // JS month is 0-indexed
  const year = Number(match[3]);
  if (day.toString().length < 2) {
    day = Number("0" + day);
  }
  if ((month + 1).toString().length < 2) {
    month = Number("0" + (month + 1)) - 1;
  }
  // Validate ranges
  if (year < 1900 || year > 2100) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month, day);

  // Final validation (handles 31/02, etc.)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

// Helper: Parse gender
function parseGender(genderStr: string): "MALE" | "FEMALE" | null {
  const normalized = genderStr.trim().toLowerCase();
  if (normalized === "nam" || normalized === "male") return "MALE";
  if (normalized === "nữ" || normalized === "nu" || normalized === "female")
    return "FEMALE";
  return null;
}

// Helper: Parse shirt category
function parseShirtCategory(
  categoryStr: string,
): "MALE" | "FEMALE" | "KID" | null {
  if (!categoryStr) return null;
  const normalized = categoryStr.trim().toLowerCase();
  if (normalized === "nam" || normalized === "male") return "MALE";
  if (normalized === "nữ" || normalized === "nu" || normalized === "female")
    return "FEMALE";
  if (
    normalized === "trẻ em" ||
    normalized === "kid" ||
    normalized === "tre em"
  )
    return "KID";
  return null;
}

// Helper: Parse shirt type
function parseShirtType(typeStr: string): "SHORT_SLEEVE" | "TANK_TOP" | null {
  if (!typeStr) return null;
  const normalized = typeStr.trim().toLowerCase();
  if (
    normalized === "có tay" ||
    normalized === "co tay" ||
    normalized === "short sleeve"
  )
    return "SHORT_SLEEVE";
  if (
    normalized === "3 lỗ" ||
    normalized === "3 lo" ||
    normalized === "tank top"
  )
    return "TANK_TOP";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const eventId = formData.get("eventId") as string;

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Missing file or eventId" },
        { status: 400 },
      );
    }

    // Get event with distances and shirts
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        distances: true,
        shirts: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    // ✅ Get first email
    const firstEmail = rows[0]?.["Email"]?.toString().trim();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File Excel không có dữ liệu" },
        { status: 400 },
      );
    }

    // Create import batch
    const batch = await prisma.importBatch.create({
      data: {
        eventId,
        fileName: file.name,
        uploadedBy: session.user.id,
        totalRows: rows.length,
        status: "PROCESSING",
        contactEmail: firstEmail, // ✅ NEW
      },
    });

    // Process rows
    const errors: any[] = [];
    let successCount = 0;
    let failedCount = 0;
    let totalShirts = 0; // ✅ NEW

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Validate required fields
        const requiredFields = [
          { key: "Họ tên", label: "Họ tên" },

          { key: "Số điện thoại", label: "Số điện thoại" },
          { key: "Ngày sinh", label: "Ngày sinh" },
          { key: "Giới tính", label: "Giới tính" },
          { key: "Cự ly", label: "Cự ly" },
        ];

        const missingFields = requiredFields
          .filter((f) => !row[f.key])
          .map((f) => f.label);

        if (missingFields.length > 0) {
          throw new Error(
            `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
          );
        }

        // Parse date
        const dob = parseDate(row["Ngày sinh"]);
        if (!dob) {
          throw new Error("Ngày sinh không hợp lệ (phải là DD/MM/YYYY)");
        }

        // Parse gender
        const gender = parseGender(row["Giới tính"]);
        if (!gender) {
          throw new Error("Giới tính không hợp lệ (phải là Nam hoặc Nữ)");
        }

        // Find distance
        const distance = event.distances.find(
          (d) => d.name.toLowerCase() === row["Cự ly"].toLowerCase().trim(),
        );
        if (!distance) {
          throw new Error(`Không tìm thấy cự ly: ${row["Cự ly"]}`);
        }

        // ✅ IMPROVED SHIRT HANDLING - Calculate fee correctly
        let shirtId = null;
        let shirtCategory = null;
        let shirtType = null;
        let shirtSize = null;
        let shirtFee = 0;

        // Check if shirt columns are filled
        const hasShirtCategory = row["Loại áo"];
        const hasShirtType = row["Kiểu áo"];
        const hasShirtSize = row["Size áo"];

        if (hasShirtCategory && hasShirtType && hasShirtSize) {
          // Parse shirt info
          shirtCategory = parseShirtCategory(row["Loại áo"]);
          shirtType = parseShirtType(row["Kiểu áo"]);
          shirtSize = row["Size áo"]?.toString().toUpperCase().trim();

          if (!shirtCategory || !shirtType || !shirtSize) {
            throw new Error(
              "Thông tin áo không hợp lệ. Vui lòng chọn đúng từ dropdown.",
            );
          }

          // Find matching shirt in event
          const shirt = event.shirts.find(
            (s) =>
              s.category === shirtCategory &&
              s.type === shirtType &&
              s.size === shirtSize &&
              s.isAvailable,
          );

          if (!shirt) {
            throw new Error(
              `Không tìm thấy áo: ${shirtCategory} ${shirtType} ${shirtSize} trong sự kiện. Hoặc áo đã hết hàng.`,
            );
          }

          // Check stock
          const remainingStock = shirt.stockQuantity - shirt.soldQuantity;
          if (remainingStock <= 0) {
            throw new Error(
              `Áo ${shirtCategory} ${shirtType} ${shirtSize} đã hết hàng`,
            );
          }

          shirtId = shirt.id;
          shirtFee = shirt.price;
        } else if (hasShirtCategory || hasShirtType || hasShirtSize) {
          // Partial shirt info - error
          throw new Error(
            "Nếu chọn áo, phải điền đầy đủ: Loại áo, Kiểu áo, Size áo. Hoặc để trống cả 3 nếu không mua áo.",
          );
        }

        // BIB number (optional - if provided in Excel)
        const providedBibNumber = row["Số BIB"]?.toString().trim();

        // ✅ CALCULATE TOTAL AMOUNT CORRECTLY
        const raceFee = distance.price;
        const totalAmount = raceFee + shirtFee;

        console.log(
          `Row ${rowNum}: raceFee=${raceFee}, shirtFee=${shirtFee}, total=${totalAmount}`,
        );

        // Create registration
        await prisma.registration.create({
          data: {
            eventId,
            distanceId: distance.id,
            shirtId,
            importBatchId: batch.id,
            registrationSource: "EXCEL",
            bibName: row["Họ tên"].toString().trim(),
            fullName: row["Họ tên"].toString().trim(),
            email: row["Email"].toString().trim(),
            phone: row["Số điện thoại"].toString().trim(),
            dob,
            gender,
            idCard: row["CCCD"]?.toString().trim() || null,
            address: row["Địa chỉ"]?.toString().trim() || null,
            city: row["Thành phố"]?.toString().trim() || null,
            emergencyContactName:
              row["Người liên hệ khẩn cấp"]?.toString().trim() || null,
            emergencyContactPhone:
              row["SĐT khẩn cấp"]?.toString().trim() || null,
            bloodType: row["Nhóm máu"]?.toString().trim() || null,

            shirtCategory,
            shirtType,
            shirtSize,

            raceFee,
            shirtFee,
            totalAmount,
            paymentStatus: "PENDING",

            // Use provided BIB if available
            bibNumber: providedBibNumber || null,
          },
        });

        // Update distance participant count
        await prisma.distance.update({
          where: { id: distance.id },
          data: {
            currentParticipants: {
              increment: 1,
            },
          },
        });

        // ✅ Update shirt sold quantity if shirt was selected
        if (shirtId) {
          // ✅ Count shirts
          totalShirts++;

          await prisma.eventShirt.update({
            where: { id: shirtId },
            data: {
              soldQuantity: {
                increment: 1,
              },
            },
          });
        }

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          row: rowNum,
          data: row,
          error: error.message,
        });
        console.error(`Row ${rowNum} error:`, error.message);
      }
    }

    // Update batch status
    const finalStatus =
      failedCount === 0
        ? "COMPLETED"
        : successCount === 0
          ? "FAILED"
          : "PARTIAL";

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        successCount,
        failedCount,
        totalShirts, // ✅ NEW
        errorLog: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        totalRows: rows.length,
        successCount,
        failedCount,
        status: finalStatus,
        contactEmail: firstEmail, // ✅ NEW
        totalShirts, // ✅ NEW
      },
      errors: errors.slice(0, 10), // Return first 10 errors for display
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "Failed to process Excel file" },
      { status: 500 },
    );
  }
}
