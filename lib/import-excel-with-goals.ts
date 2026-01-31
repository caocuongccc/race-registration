// lib/import-excel-with-goals.ts
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { generateBibNumber } from "@/lib/bib-generator";

interface ImportRow {
  "Họ tên": string;
  Email: string;
  "Số điện thoại": string;
  "Ngày sinh": string;
  "Giới tính": string;
  "Cự ly": string;
  "Mục tiêu"?: string; // NEW: Optional goal name
  CCCD?: string;
  "Địa chỉ"?: string;
  "Thành phố"?: string;
  "Loại áo"?: string;
  "Kiểu áo"?: string;
  "Size áo"?: string;
  "Người liên hệ khẩn cấp"?: string;
  "SĐT khẩn cấp"?: string;
  "Nhóm máu"?: string;
  "Số BIB"?: string;
}

interface ImportResult {
  success: boolean;
  batch?: any;
  errors?: Array<{
    row: number;
    data: ImportRow;
    error: string;
  }>;
}

export async function importExcelWithGoals(
  file: Buffer,
  eventId: string,
  fileName: string
): Promise<ImportResult> {
  const workbook = XLSX.read(file, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: ImportRow[] = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    return {
      success: false,
      errors: [{ row: 0, data: {} as ImportRow, error: "File Excel trống" }],
    };
  }

  // Load event with distances and goals
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      distances: {
        include: {
          goals: true, // NEW: Include goals
        },
      },
      shirts: true,
    },
  });

  if (!event) {
    return {
      success: false,
      errors: [
        { row: 0, data: {} as ImportRow, error: "Sự kiện không tồn tại" },
      ],
    };
  }

  // Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      eventId,
      fileName,
      totalRows: rows.length,
      successCount: 0,
      failedCount: 0,
      status: "PROCESSING",
    },
  });

  const errors: Array<{ row: number; data: ImportRow; error: string }> = [];
  let successCount = 0;

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // Excel row (header is row 1)

    try {
      // Validate required fields
      if (
        !row["Họ tên"] ||
        !row["Email"] ||
        !row["Số điện thoại"] ||
        !row["Ngày sinh"] ||
        !row["Giới tính"] ||
        !row["Cự ly"]
      ) {
        throw new Error("Thiếu thông tin bắt buộc");
      }

      // Find distance
      const distance = event.distances.find(
        (d) => d.name.trim() === row["Cự ly"].trim()
      );

      if (!distance) {
        throw new Error(`Không tìm thấy cự ly: ${row["Cự ly"]}`);
      }

      // NEW: Find goal if specified
      let distanceGoal = null;
      if (row["Mục tiêu"]?.trim()) {
        distanceGoal = distance.goals.find(
          (g) => g.name.trim() === row["Mục tiêu"].trim()
        );

        if (!distanceGoal) {
          throw new Error(
            `Không tìm thấy mục tiêu: ${row["Mục tiêu"]} cho cự ly ${distance.name}`
          );
        }

        // Check goal availability
        if (!distanceGoal.isAvailable) {
          throw new Error(`Mục tiêu "${distanceGoal.name}" đã đóng`);
        }

        // Check goal capacity
        if (
          distanceGoal.maxParticipants &&
          distanceGoal.currentParticipants >= distanceGoal.maxParticipants
        ) {
          throw new Error(`Mục tiêu "${distanceGoal.name}" đã đầy`);
        }
      }

      // Parse date
      const dobParts = row["Ngày sinh"].split("/");
      if (dobParts.length !== 3) {
        throw new Error("Ngày sinh không đúng định dạng DD/MM/YYYY");
      }
      const dob = new Date(
        parseInt(dobParts[2]),
        parseInt(dobParts[1]) - 1,
        parseInt(dobParts[0])
      );

      // Validate gender
      const gender = row["Giới tính"].trim();
      if (gender !== "Nam" && gender !== "Nữ") {
        throw new Error("Giới tính phải là Nam hoặc Nữ");
      }

      // Calculate fees
      let raceFee = distance.price;
      if (distanceGoal?.priceAdjustment) {
        raceFee += distanceGoal.priceAdjustment;
      }

      let shirtFee = 0;
      let shirtId = null;

      // Handle shirt if specified
      if (row["Loại áo"] && row["Kiểu áo"] && row["Size áo"]) {
        const shirt = event.shirts.find(
          (s) =>
            s.category ===
              (row["Loại áo"] === "Nam"
                ? "MALE"
                : row["Loại áo"] === "Nữ"
                  ? "FEMALE"
                  : "KIDS") &&
            s.type ===
              (row["Kiểu áo"] === "Tay ngắn"
                ? "SHORT_SLEEVE"
                : "LONG_SLEEVE") &&
            s.size === row["Size áo"]
        );

        if (shirt) {
          shirtId = shirt.id;
          shirtFee = shirt.price;
        }
      }

      const totalAmount = raceFee + shirtFee;

      // Generate or use provided BIB
      let bibNumber = row["Số BIB"]?.trim();
      if (!bibNumber) {
        const bibPrefix = distanceGoal?.bibPrefix || distance.bibPrefix;
        bibNumber = await generateBibNumber(
          eventId,
          bibPrefix,
          distanceGoal?.id
        );
      }

      // Create registration
      await prisma.registration.create({
        data: {
          eventId,
          distanceId: distance.id,
          distanceGoalId: distanceGoal?.id || null, // NEW
          shirtId,
          fullName: row["Họ tên"],
          email: row["Email"],
          phone: row["Số điện thoại"],
          dob,
          gender: gender === "Nam" ? "MALE" : "FEMALE",
          idCard: row["CCCD"] || null,
          address: row["Địa chỉ"] || null,
          city: row["Thành phố"] || null,
          emergencyContactName: row["Người liên hệ khẩn cấp"] || null,
          emergencyContactPhone: row["SĐT khẩn cấp"] || null,
          bloodType: row["Nhóm máu"] || null,
          raceFee,
          shirtFee,
          totalAmount,
          bibNumber,
          paymentStatus: "PENDING",
          registrationSource: "EXCEL_IMPORT",
          importBatchId: batch.id,
          healthDeclaration: true,
        },
      });

      // Update counters
      if (distanceGoal) {
        await prisma.distanceGoal.update({
          where: { id: distanceGoal.id },
          data: { currentParticipants: { increment: 1 } },
        });
      }

      await prisma.distance.update({
        where: { id: distance.id },
        data: { currentParticipants: { increment: 1 } },
      });

      successCount++;
    } catch (error: any) {
      errors.push({
        row: rowNumber,
        data: row,
        error: error.message,
      });
    }
  }

  // Update batch status
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      successCount,
      failedCount: errors.length,
      status:
        errors.length === rows.length
          ? "FAILED"
          : errors.length > 0
            ? "PARTIAL"
            : "COMPLETED",
      errorLog: errors,
    },
  });

  return {
    success: successCount > 0,
    batch: {
      id: batch.id,
      totalRows: rows.length,
      successCount,
      failedCount: errors.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}
