// lib/qr-inline.ts
import QRCode from "qrcode";

/**
 * Generate QR Code as Buffer (for email attachment)
 */
export async function generateQRBuffer(data: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(data, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return buffer;
  } catch (error) {
    console.error("QR generation error:", error);
    throw new Error("Không thể tạo QR code");
  }
}

/**
 * Generate Check-in QR data
 */
export function generateCheckinQRData(
  registrationId: string,
  bibNumber: string,
  fullName: string,
  gender: string,
  dob: Date,
  phone: string,
  shirtCategory: string | null,
  shirtType: string | null,
  shirtSize: string | null
): string {
  const qrData = [
    "THÔNG TIN CHECK-IN",
    `BIB: ${bibNumber}`,
    `Tên: ${fullName}`,
    `GT: ${gender === "MALE" ? "Nam" : "Nữ"}`,
    `NS: ${dob.toISOString().split("T")[0]}`,
    `SĐT: ${phone}`,
    shirtCategory && `Áo: ${shirtCategory}`,
    shirtSize && `Size: ${shirtSize}`,
  ]
    .filter(Boolean)
    .join("\r\n");

  return qrData;
}

/**
 * Generate Check-in QR as Buffer
 */
export async function generateCheckinQRBuffer(
  registrationId: string,
  bibNumber: string,
  fullName: string,
  gender: string,
  dob: Date,
  phone: string,
  shirtCategory: string | null,
  shirtType: string | null,
  shirtSize: string | null
): Promise<Buffer> {
  const qrData = generateCheckinQRData(
    registrationId,
    bibNumber,
    fullName,
    gender,
    dob,
    phone,
    shirtCategory,
    shirtType,
    shirtSize
  );

  return await generateQRBuffer(qrData);
}