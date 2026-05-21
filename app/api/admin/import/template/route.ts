// app/api/admin/import/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { deflateRawSync, inflateRawSync } from "zlib";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BASE_IMPORT_COLUMNS = [
  "Email",
  "Họ tên",
  "Tên BIB",
  "Ngày sinh",
  "CCCD/CMND/Hộ chiếu",
  "Giới tính",
  "Cự ly",
  "Loại áo",
  "Kiểu áo",
  "Size áo",
];

const FINISHER_IMPORT_COLUMNS = [
  "Loại áo finish",
  "Kiểu áo finish",
  "Size áo finish",
];

const categoryLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  KID: "Kid",
};

const typeLabel: Record<string, string> = {
  SHORT_SLEEVE: "T-shirt",
  TANK_TOP: "Singlet",
};

type ZipEntry = {
  name: string;
  data: Buffer;
};

type ValidationRule = {
  column: string;
  formula: string;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readZipEntries(zip: Buffer): ZipEntry[] {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = zip.length - 22; offset >= 0; offset--) {
    if (zip.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid XLSX file");
  }

  const entryCount = zip.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = zip.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid XLSX central directory");
    }

    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const name = zip
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    const localNameLength = zip.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = zip.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = zip.subarray(dataStart, dataStart + compressedSize);

    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported XLSX compression method: ${method}`);
    }

    entries.push({
      name,
      data: method === 8 ? inflateRawSync(compressedData) : Buffer.from(compressedData),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function rebuildZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data);
    const checksum = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function addDropdownsToSheet(sheetXml: string, rules: ValidationRule[]) {
  const validations = rules.filter((rule) => rule.formula);
  if (validations.length === 0) return sheetXml;

  const xml = `<dataValidations count="${validations.length}">${validations
    .map(
      (rule) =>
        `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${rule.column}2:${rule.column}1000"><formula1>${escapeXml(
          rule.formula,
        )}</formula1></dataValidation>`,
    )
    .join("")}</dataValidations>`;

  if (sheetXml.includes("<dataValidations")) {
    return sheetXml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/, xml);
  }

  const sheetDataEnd = sheetXml.indexOf("</sheetData>");
  if (sheetDataEnd >= 0) {
    const insertAt = sheetDataEnd + "</sheetData>".length;
    return `${sheetXml.slice(0, insertAt)}${xml}${sheetXml.slice(insertAt)}`;
  }

  return sheetXml.replace("</worksheet>", `${xml}</worksheet>`);
}

function patchXlsxDropdowns(buffer: Buffer, rules: ValidationRule[]) {
  const entries = readZipEntries(buffer);
  const mainSheet = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml");
  if (!mainSheet) return buffer;

  mainSheet.data = Buffer.from(
    addDropdownsToSheet(mainSheet.data.toString("utf8"), rules),
    "utf8",
  );

  return rebuildZip(entries);
}

function catalogRange(column: string, count: number) {
  if (count <= 0) return "";
  return `'Danh mục'!$${column}$2:$${column}$${count + 1}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing eventId" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        distances: {
          where: { isAvailable: true },
          orderBy: { sortOrder: "asc" },
        },
        shirts: {
          where: { isAvailable: true },
          orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const hasFinisherDistance = event.distances.some(
      (distance) => distance.requiresFinisherShirt,
    );
    const importColumns = hasFinisherDistance
      ? [...BASE_IMPORT_COLUMNS, ...FINISHER_IMPORT_COLUMNS]
      : BASE_IMPORT_COLUMNS;
    const distances = event.distances.map((distance) => distance.name);
    const shirtCategories = Array.from(
      new Set(event.shirts.map((shirt) => categoryLabel[shirt.category])),
    ).filter(Boolean);
    const racekitCategoryOptions =
      event.hasShirt && !hasFinisherDistance
        ? ["Không mua", ...shirtCategories]
        : shirtCategories;
    const shirtTypes = Array.from(
      new Set(event.shirts.map((shirt) => typeLabel[shirt.type])),
    ).filter(Boolean);
    const shirtSizes = Array.from(
      new Set(event.shirts.map((shirt) => shirt.size)),
    ).filter(Boolean);

    const sampleRow: Record<string, string> = {
        Email: "runner@example.com",
        "Họ tên": "Nguyễn Văn A",
        "Tên BIB": "VAN A",
        "Ngày sinh": "15/08/1990",
        "CCCD/CMND/Hộ chiếu": "001234567890",
        "Giới tính": "Nam",
        "Cự ly": distances[0] || "",
        "Loại áo": racekitCategoryOptions[0] || "",
        "Kiểu áo": shirtTypes[0] || "",
        "Size áo": shirtSizes[0] || "",
    };

    if (hasFinisherDistance) {
      sampleRow["Loại áo finish"] = shirtCategories[0] || "";
      sampleRow["Kiểu áo finish"] = shirtTypes[0] || "";
      sampleRow["Size áo finish"] = shirtSizes[0] || "";
    }

    const sampleData = [sampleRow];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: importColumns });

    ws["!cols"] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      ...(hasFinisherDistance
        ? [{ wch: 16 }, { wch: 16 }, { wch: 14 }]
        : []),
    ];


    XLSX.utils.book_append_sheet(wb, ws, "Danh sách VĐV");

    const guide = [
      { Cot: "Email", "Bat buoc": "KHONG", "Ghi chu": "Neu de trong, batch van tao BIB va danh dau thanh toan nhung khong gui email." },
      { Cot: "Ho ten", "Bat buoc": "CO", "Ghi chu": "Ho ten day du." },
      { Cot: "Ten BIB", "Bat buoc": "KHONG", "Ghi chu": "Neu de trong, he thong tu lay Ho ten." },
      { Cot: "Ngay sinh", "Bat buoc": "KHONG", "Ghi chu": "Co the de trong. Neu nhap thi dung dinh dang dd/mm/yyyy." },
      { Cot: "CCCD/CMND/Ho chieu", "Bat buoc": "KHONG", "Ghi chu": "Co the de trong." },
      { Cot: "Gioi tinh", "Bat buoc": "KHONG", "Ghi chu": "Co the de trong. Neu nhap thi chon Nam hoac Nu." },
      { Cot: "Cu ly", "Bat buoc": "CO", "Ghi chu": "Nhap dung ten cu ly trong sheet Danh muc." },
      { Cot: "Loai ao / Kieu ao / Size ao", "Bat buoc": "KHONG", "Ghi chu": hasFinisherDistance ? "Event co ao finish nen khong co lua chon Khong mua. Dien du 3 cot ao racekit." : "Neu khong mua ao, co the chon Khong mua o cot Loai ao hoac de trong ca 3 cot ao. Neu chon ao, dien du ca 3 cot." },
      ...(hasFinisherDistance
        ? [
            { Cot: "Loai ao finish / Kieu ao finish / Size ao finish", "Bat buoc": "TUY CU LY", "Ghi chu": "Chi bat buoc khi dong do chon cu ly co ao finish." },
          ]
        : []),
    ];
    const guideSheet = XLSX.utils.json_to_sheet(guide);
    guideSheet["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 72 }];
    XLSX.utils.book_append_sheet(wb, guideSheet, "Hướng dẫn");

    const maxCatalogRows = Math.max(
      distances.length,
      racekitCategoryOptions.length,
      shirtTypes.length,
      shirtSizes.length,
      1,
    );
    const catalogRows = Array.from({ length: maxCatalogRows }, (_, index) => [
      index === 0 ? "Nam" : index === 1 ? "Nữ" : "",
      distances[index] || "",
      racekitCategoryOptions[index] || "",
      shirtTypes[index] || "",
      shirtSizes[index] || "",
      ...(hasFinisherDistance
        ? [
            shirtCategories[index] || "",
            shirtTypes[index] || "",
            shirtSizes[index] || "",
          ]
        : []),
    ]);
    const catalogSheet = XLSX.utils.aoa_to_sheet([
      [
        "Giới tính",
        "Cự ly",
        "Loại áo",
        "Kiểu áo",
        "Size áo",
        ...(hasFinisherDistance
          ? ["Loại áo finish", "Kiểu áo finish", "Size áo finish"]
          : []),
      ],
      ...catalogRows,
    ]);
    catalogSheet["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      ...(hasFinisherDistance
        ? [{ wch: 16 }, { wch: 16 }, { wch: 14 }]
        : []),
    ];
    XLSX.utils.book_append_sheet(wb, catalogSheet, "Danh mục");

    const rawBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const buffer = patchXlsxDropdowns(rawBuffer, [
      { column: "F", formula: catalogRange("A", 2) },
      { column: "G", formula: catalogRange("B", distances.length) },
      { column: "H", formula: catalogRange("C", racekitCategoryOptions.length) },
      { column: "I", formula: catalogRange("D", shirtTypes.length) },
      { column: "J", formula: catalogRange("E", shirtSizes.length) },
      ...(hasFinisherDistance
        ? [
            { column: "K", formula: catalogRange("F", shirtCategories.length) },
            { column: "L", formula: catalogRange("G", shirtTypes.length) },
            { column: "M", formula: catalogRange("H", shirtSizes.length) },
          ]
        : []),
    ]);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="mau-import-${event.slug}-${Date.now()}.xlsx"`,
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
