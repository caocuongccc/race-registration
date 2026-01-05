// app/api/admin/import/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Helper: Parse date from DD/MM/YYYY format
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const year = parseInt(parts[2]);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  return new Date(year, month, day);
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
  categoryStr: string
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
        { status: 400 }
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

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File Excel không có dữ liệu" },
        { status: 400 }
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
      },
    });

    // Process rows
    const errors: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)

      try {
        // Validate required fields
        if (
          !row["Họ tên"] ||
          !row["Email"] ||
          !row["Số điện thoại"] ||
          !row["Ngày sinh (DD/MM/YYYY)"] ||
          !row["Giới tính (Nam/Nữ)"] ||
          !row["Cự ly"]
        ) {
          throw new Error("Thiếu thông tin bắt buộc");
        }

        // Parse date
        const dob = parseDate(row["Ngày sinh (DD/MM/YYYY)"]);
        if (!dob) {
          throw new Error("Ngày sinh không hợp lệ (phải là DD/MM/YYYY)");
        }

        // Parse gender
        const gender = parseGender(row["Giới tính (Nam/Nữ)"]);
        if (!gender) {
          throw new Error("Giới tính không hợp lệ (phải là Nam hoặc Nữ)");
        }

        // Find distance
        const distance = event.distances.find(
          (d) => d.name.toLowerCase() === row["Cự ly"].toLowerCase().trim()
        );
        if (!distance) {
          throw new Error(`Không tìm thấy cự ly: ${row["Cự ly"]}`);
        }

        // Parse shirt info (optional)
        let shirtId = null;
        let shirtCategory = null;
        let shirtType = null;
        let shirtSize = null;
        let shirtFee = 0;

        if (row["Loại áo (Nam/Nữ/Trẻ em)"]) {
          shirtCategory = parseShirtCategory(row["Loại áo (Nam/Nữ/Trẻ em)"]);
          shirtType = parseShirtType(row["Kiểu áo (Có tay/3 lỗ)"]);
          shirtSize = row["Size áo"]?.toString().toUpperCase().trim();

          if (shirtCategory && shirtType && shirtSize) {
            const shirt = event.shirts.find(
              (s) =>
                s.category === shirtCategory &&
                s.type === shirtType &&
                s.size === shirtSize
            );

            if (shirt) {
              shirtId = shirt.id;
              shirtFee = shirt.price;
            } else {
              console.warn(
                `Không tìm thấy áo: ${shirtCategory} ${shirtType} ${shirtSize}`
              );
            }
          }
        }

        // BIB number (optional - if provided in Excel)
        const providedBibNumber = row["Số BIB (tùy chọn)"]?.toString().trim();

        // Calculate total amount
        const raceFee = distance.price;
        const totalAmount = raceFee + shirtFee;

        // Create registration
        await prisma.registration.create({
          data: {
            eventId,
            distanceId: distance.id,
            shirtId,
            importBatchId: batch.id,
            registrationSource: "EXCEL",

            fullName: row["Họ tên"].toString().trim(),
            email: row["Email"].toString().trim(),
            phone: row["Số điện thoại"].toString().trim(),
            dob,
            gender,
            idCard: row["CCCD"]?.toString().trim() || null,
            address: row["Địa chỉ"]?.toString().trim() || null,

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

        // Update shirt sold quantity
        if (shirtId) {
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
      },
      errors: errors.slice(0, 10), // Return first 10 errors for display
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "Failed to process Excel file" },
      { status: 500 }
    );
  }
}
