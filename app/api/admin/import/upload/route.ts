// app/api/admin/import/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export function parseDate(dateStr: string): Date | null {
  if (dateStr == null) return null;

  const str = String(dateStr).trim();
  if (!str || str === "null" || str === "undefined") return null;

  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function getString(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function parseGender(genderStr: string): "MALE" | "FEMALE" | null {
  const normalized = normalizeText(genderStr);
  if (normalized === "nam" || normalized === "male") return "MALE";
  if (normalized === "nu" || normalized === "female") return "FEMALE";
  return null;
}

function parseShirtCategory(
  categoryStr: string,
): "MALE" | "FEMALE" | "KID" | null {
  const normalized = normalizeText(categoryStr);
  if (normalized === "nam" || normalized === "male") return "MALE";
  if (normalized === "nu" || normalized === "female") return "FEMALE";
  if (normalized === "tre em" || normalized === "kid") return "KID";
  return null;
}

function parseShirtType(typeStr: string): "SHORT_SLEEVE" | "TANK_TOP" | null {
  const normalized = normalizeText(typeStr);
  if (
    normalized === "co tay" ||
    normalized === "t-shirt" ||
    normalized === "tshirt" ||
    normalized === "t shirt" ||
    normalized === "short sleeve"
  ) {
    return "SHORT_SLEEVE";
  }

  if (
    normalized === "3 lo" ||
    normalized === "singlet" ||
    normalized === "tank top"
  ) {
    return "TANK_TOP";
  }

  return null;
}

function isNoShirtOption(value: string) {
  const normalized = normalizeText(value);
  return (
    normalized === "khong mua" ||
    normalized === "khong lay" ||
    normalized === "none" ||
    normalized === "no"
  );
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File Excel không có dữ liệu" },
        { status: 400 },
      );
    }

    const firstEmail = getString(rows[0], ["Email"]);
    const batch = await prisma.importBatch.create({
      data: {
        eventId,
        fileName: file.name,
        uploadedBy: session.user.id,
        totalRows: rows.length,
        status: "PROCESSING",
        contactEmail: firstEmail || null,
      },
    });

    const isRacekitShirtIncluded = event.distances.some(
      (distance) => distance.requiresFinisherShirt,
    );

    const errors: any[] = [];
    let successCount = 0;
    let failedCount = 0;
    let totalShirts = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const email = getString(row, ["Email"]);
        const fullName = getString(row, ["Họ tên", "Ho ten"]);
        const bibName =
          getString(row, ["Tên BIB", "Ten BIB"]) || fullName;
        const dobValue = getString(row, ["Ngày sinh", "Ngay sinh"]);
        const idCard =
          getString(row, [
            "CCCD/CMND/Hộ chiếu",
            "CCCD/CMND/Ho chieu",
            "CCCD",
          ]) || null;
        const genderValue = getString(row, ["Giới tính", "Gioi tinh"]);
        const distanceName = getString(row, ["Cự ly", "Cu ly"]);

        const missingFields = [
          !fullName && "Họ tên",
          !distanceName && "Cự ly",
        ].filter(Boolean);

        if (missingFields.length > 0) {
          throw new Error(
            `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
          );
        }

        const dob = dobValue ? parseDate(dobValue) : new Date(1900, 0, 1);
        if (!dob && dobValue) {
          throw new Error("Ngày sinh không hợp lệ, cần định dạng dd/mm/yyyy");
        }

        const gender = genderValue ? parseGender(genderValue) : "MALE";
        if (!gender && genderValue) {
          throw new Error("Giới tính không hợp lệ, chọn Nam hoặc Nữ");
        }

        const distance = event.distances.find(
          (item) => normalizeText(item.name) === normalizeText(distanceName),
        );
        if (!distance) {
          throw new Error(`Không tìm thấy cự ly: ${distanceName}`);
        }

        let shirtId: string | null = null;
        let shirtCategory: "MALE" | "FEMALE" | "KID" | null = null;
        let shirtType: "SHORT_SLEEVE" | "TANK_TOP" | null = null;
        let shirtSize: any = null;
        let shirtFee = 0;
        let finisherShirtCategory: "MALE" | "FEMALE" | "KID" | null = null;
        let finisherShirtType: "SHORT_SLEEVE" | "TANK_TOP" | null = null;
        let finisherShirtSize: any = null;

        const shirtCategoryValue = getString(row, ["Loại áo", "Loai ao"]);
        const shirtTypeValue = getString(row, ["Kiểu áo", "Kieu ao"]);
        const shirtSizeValue = getString(row, ["Size áo", "Size ao"]);
        const racekitShirtBlank =
          !shirtCategoryValue && !shirtTypeValue && !shirtSizeValue;

        const racekitShirtOptedOut =
          !isRacekitShirtIncluded &&
          (racekitShirtBlank || isNoShirtOption(shirtCategoryValue));

        if (racekitShirtOptedOut) {
          shirtId = null;
          shirtCategory = null;
          shirtType = null;
          shirtSize = null;
          shirtFee = 0;
        } else if (shirtCategoryValue && shirtTypeValue && shirtSizeValue) {
          shirtCategory = parseShirtCategory(shirtCategoryValue);
          shirtType = parseShirtType(shirtTypeValue);
          shirtSize = shirtSizeValue.toUpperCase().trim();

          if (!shirtCategory || !shirtType || !shirtSize) {
            throw new Error("Thông tin áo không hợp lệ");
          }

          const shirt = event.shirts.find(
            (item) =>
              item.category === shirtCategory &&
              item.type === shirtType &&
              item.size === shirtSize &&
              item.isAvailable,
          );

          if (!shirt) {
            throw new Error(
              `Không tìm thấy áo: ${shirtCategoryValue} ${shirtTypeValue} ${shirtSizeValue}`,
            );
          }

          const remainingStock = shirt.stockQuantity - shirt.soldQuantity;
          if (remainingStock <= 0) {
            throw new Error(
              `Áo ${shirtCategoryValue} ${shirtTypeValue} ${shirtSizeValue} đã hết hàng`,
            );
          }

          shirtId = shirt.id;
          shirtFee = isRacekitShirtIncluded ? 0 : shirt.price;
        } else if (event.hasShirt && isRacekitShirtIncluded) {
          throw new Error(
            "Event có áo finish nên phải điền đủ Loại áo, Kiểu áo và Size áo racekit",
          );
        } else if (shirtCategoryValue || shirtTypeValue || shirtSizeValue) {
          throw new Error(
            "Nếu chọn áo, phải điền đủ Loại áo, Kiểu áo và Size áo",
          );
        }

        const finisherCategoryValue = getString(row, [
          "Loại áo finish",
          "Loai ao finish",
        ]);
        const finisherTypeValue = getString(row, [
          "Kiểu áo finish",
          "Kieu ao finish",
        ]);
        const finisherSizeValue = getString(row, [
          "Size áo finish",
          "Size ao finish",
        ]);

        if (distance.requiresFinisherShirt) {
          if (!finisherCategoryValue || !finisherTypeValue || !finisherSizeValue) {
            throw new Error(
              "Cự ly này có áo finish, cần điền đủ Loại áo finish, Kiểu áo finish và Size áo finish",
            );
          }

          finisherShirtCategory = parseShirtCategory(finisherCategoryValue);
          finisherShirtType = parseShirtType(finisherTypeValue);
          finisherShirtSize = finisherSizeValue.toUpperCase().trim();

          if (!finisherShirtCategory || !finisherShirtType || !finisherShirtSize) {
            throw new Error("Thông tin áo finish không hợp lệ");
          }

          const finisherShirt = event.shirts.find(
            (item) =>
              item.category === finisherShirtCategory &&
              item.type === finisherShirtType &&
              item.size === finisherShirtSize &&
              item.isAvailable,
          );

          if (!finisherShirt) {
            throw new Error(
              `Không tìm thấy áo finish: ${finisherCategoryValue} ${finisherTypeValue} ${finisherSizeValue}`,
            );
          }
        }

        const raceFee = distance.price;
        const totalAmount = raceFee + shirtFee;
        const phone =
          getString(row, ["Số điện thoại", "So dien thoai", "Phone"]) ||
          idCard ||
          "";

        const registration = await prisma.registration.create({
          data: {
            eventId,
            distanceId: distance.id,
            shirtId,
            importBatchId: batch.id,
            registrationSource: "EXCEL",
            fullName,
            bibName,
            email,
            phone,
            dob,
            gender,
            idCard,
            address: null,
            city: null,
            emergencyContactName: null,
            emergencyContactPhone: null,
            bloodType: null,
            shirtCategory,
            shirtType,
            shirtSize,
            finisherShirtSize: distance.requiresFinisherShirt
              ? finisherShirtSize
              : null,
            raceFee,
            shirtFee,
            totalAmount,
            paymentStatus: "PENDING",
            bibNumber: null,
          },
        });

        if (
          distance.requiresFinisherShirt &&
          finisherShirtCategory &&
          finisherShirtType
        ) {
          await prisma.$executeRaw`
            UPDATE "registrations"
            SET
              "finisher_shirt_category" = ${finisherShirtCategory}::"ShirtCategory",
              "finisher_shirt_type" = ${finisherShirtType}::"ShirtType"
            WHERE "id" = ${registration.id}
          `;
        }

        await prisma.distance.update({
          where: { id: distance.id },
          data: {
            currentParticipants: {
              increment: 1,
            },
          },
        });

        if (shirtId) {
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
        totalShirts,
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
        contactEmail: firstEmail || null,
        totalShirts,
      },
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "Failed to process Excel file" },
      { status: 500 },
    );
  }
}
