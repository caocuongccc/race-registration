import QRCode from "qrcode";

/**
 * Generate QR Code for Batch Check-in
 */
export async function generateBatchQRBuffer(data: string): Promise<Buffer> {
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
    console.error("Batch QR generation error:", error);
    throw new Error("Không thể tạo QR code batch");
  }
}

/**
 * Generate Batch QR Data String
 */
export function generateBatchQRData(batch: {
  id: string;
  bibRangeStart: string;
  bibRangeEnd: string;
  totalRegistrations: number;
  totalShirts: number;
}): string {
  return [
    "BATCH CHECK-IN",
    `Batch ID: ${batch.id}`,
    `BIB: ${batch.bibRangeStart} - ${batch.bibRangeEnd}`,
    `VĐV: ${batch.totalRegistrations} người`,
    `Áo: ${batch.totalShirts} cái`,
  ].join("\n");
}
