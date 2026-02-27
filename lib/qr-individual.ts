// lib/qr-individual.ts - Generate QR with full registration info (like old generateCheckinQR)

import QRCode from "qrcode";

/**
 * Generate individual QR code with full registration info
 * Format similar to old generateCheckinQR from ImgBB
 */
export async function generateIndividualQR(
  registrationId: string,
  frombibNumber: string,
  tobibNumber: string,
  fullName: string,
  gender?: string | null,
  dob?: Date | null,
  phone?: string | null,
  shirtCategory?: string | null,
  shirtType?: string | null,
  shirtSize?: string | null,
  importBatchId?: string | null,
): Promise<string> {
  try {
    // Build QR data string with all info (similar to old format)
    const qrLines: string[] = [
      "THÔNG TIN CHECK-IN",
      `type: batch`,
      `BIB: ${frombibNumber} - ${tobibNumber}`,
      `Tên: ${fullName}`,
    ];
    if (importBatchId) {
      qrLines.push(`batchId: ${importBatchId}`);
    }
    if (gender) {
      qrLines.push(`Giới tính: ${gender}`);
    }

    if (dob) {
      qrLines.push(`Ngày sinh: ${new Date(dob).toLocaleDateString("vi-VN")}`);
    }

    if (phone) {
      qrLines.push(`SĐT: ${phone}`);
    }

    if (shirtCategory && shirtType && shirtSize) {
      qrLines.push(`Áo: ${shirtCategory} - ${shirtType} - Size ${shirtSize}`);
    }

    // Add registration ID for mobile scan
    qrLines.push(`RID: ${registrationId}`);
    qrLines.push(`Registration ID: ${registrationId}`); // For multi-line parsing
    const qrData = qrLines.join("\n");

    console.log(`📱 Generating QR with data:\n${qrData}`);

    // ✅ Generate as data URL (base64)
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Validate output
    if (!qrDataUrl || !qrDataUrl.startsWith("data:image/png;base64,")) {
      console.error(`❌ Invalid QR generated for ${registrationId}`);
      throw new Error("QR generation produced invalid output");
    }

    return qrDataUrl;
  } catch (error: any) {
    console.error("❌ QR generation error:", error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Simple QR with just registration ID (for backward compatibility)
 */
export async function generateSimpleQR(
  registrationId: string,
): Promise<string> {
  try {
    const qrData = `RID: ${registrationId}`;

    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrDataUrl;
  } catch (error: any) {
    console.error("❌ Simple QR generation error:", error);
    throw new Error(`Failed to generate simple QR: ${error.message}`);
  }
}

/**
 * Parse QR data to extract registration ID
 */
export function parseQRData(qrData: string): {
  registrationId: string | null;
  bibNumber: string | null;
} {
  try {
    const lines = qrData.split("\n");

    let registrationId: string | null = null;
    let bibNumber: string | null = null;

    for (const line of lines) {
      // Extract BIB number
      if (line.startsWith("BIB:")) {
        bibNumber = line.replace("BIB:", "").trim();
      }

      // Extract registration ID
      if (line.includes("Registration ID:")) {
        const match = line.match(/Registration ID:\s*(.+)$/);
        if (match) {
          registrationId = match[1].trim();
        }
      }
    }

    return { registrationId, bibNumber };
  } catch (error) {
    console.error("QR parse error:", error);
    return { registrationId: null, bibNumber: null };
  }
}
