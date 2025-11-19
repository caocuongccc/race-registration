// lib/qr-generator.ts
// Alternative: Store QR codes as base64 data URLs (no external service needed)

import QRCode from "qrcode";

/**
 * Generate QR Code as base64 data URL
 * No external upload - stores directly in database
 */
export async function generateQRAsBase64(data: string): Promise<string> {
  try {
    const qrBase64 = await QRCode.toDataURL(data, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrBase64; // Returns: data:image/png;base64,iVBORw0KG...
  } catch (error) {
    console.error("QR generation error:", error);
    throw new Error("Không thể tạo QR code");
  }
}

/**
 * Generate Payment QR Code
 */
export async function generatePaymentQR(
  registrationId: string,
  amount: number
): Promise<string> {
  const bankCode = process.env.SEPAY_BANK_CODE || "MB";
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  const content = `DK ${registrationId}`;

  const qrData = `${bankCode}|${accountNumber}|${amount}|${content}`;

  return await generateQRAsBase64(qrData);
}

/**
 * Generate Check-in QR Code
 */
export async function generateCheckinQR(
  registrationId: string,
  bibNumber: string
): Promise<string> {
  const qrData = JSON.stringify({
    type: "checkin",
    registrationId: registrationId,
    bibNumber: bibNumber,
  });

  return await generateQRAsBase64(qrData);
}

// ============================
// USAGE: Chỉ cần thay đổi import
// ============================
// FROM: import { generatePaymentQR } from "@/lib/imgbb";
// TO:   import { generatePaymentQR } from "@/lib/qr-generator";
//
// Advantage:
// - No external dependency
// - Always works
// - No rate limits
//
// Disadvantage:
// - Larger database size (base64 strings ~100KB each)
// - Cannot be cached by CDN
