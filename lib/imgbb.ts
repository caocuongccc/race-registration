// lib/imgbb.ts
import QRCode from "qrcode";

/**
 * Upload image to ImgBB
 */
async function uploadToImgBB(
  base64Image: string,
  fileName: string
): Promise<string> {
  try {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      console.warn("IMGBB_API_KEY is not configured, using base64 fallback");
      return base64Image; // Return base64 as fallback
    }

    // Remove data:image/png;base64, prefix if exists
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Create form data
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("image", base64Data);
    formData.append("name", fileName);
    formData.append("expiration", "15552000"); // 180 days (6 months)

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ImgBB upload error:", response.status, errorText);
      throw new Error(`ImgBB upload failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data || !data.data.url) {
      console.error("ImgBB response invalid:", data);
      throw new Error("ImgBB upload failed - invalid response");
    }

    // Return direct image URL
    return data.data.url;
  } catch (error) {
    console.error("ImgBB upload error:", error);
    // Return original base64 as fallback
    console.warn("Falling back to base64 data URL");
    return base64Image;
  }
}

/**
 * Generate QR Code and upload to ImgBB
 */
export async function generateAndUploadQR(
  data: string,
  fileName: string
): Promise<string> {
  try {
    // Generate QR code as base64
    const qrBase64 = await QRCode.toDataURL(data, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Try to upload to ImgBB
    const imageUrl = await uploadToImgBB(qrBase64, fileName);

    return imageUrl;
  } catch (error) {
    console.error("QR generation/upload error:", error);

    // Final fallback: generate and return base64
    try {
      const qrBase64 = await QRCode.toDataURL(data, {
        width: 500,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      console.warn("Using base64 data URL as final fallback");
      return qrBase64;
    } catch (fallbackError) {
      console.error("Failed to generate QR code:", fallbackError);
      throw new Error("Không thể tạo QR code");
    }
  }
}

/**
 * Generate Payment QR Code
 * Format: BankCode|AccountNumber|Amount|Content
 */
// export async function generatePaymentQR(
//   registrationId: string,
//   amount: number
// ): Promise<string> {
//   const bankCode = process.env.SEPAY_BANK_CODE || "MB";
//   const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || "0123456789";
//   const content = `DK ${registrationId}`;

//   // VietQR format
//   const qrData = `${bankCode}|${accountNumber}|${amount}|${content}`;

//   console.log(
//     `Generating payment QR for registration ${registrationId}, amount: ${amount}`
//   );

//   return await generateAndUploadQR(qrData, `payment-qr-${registrationId}`);
// }

/**
 * Generate Check-in QR Code
 * Format: Simple registration ID for scanning
 */
export async function generateCheckinQR(
  registrationId: string,
  bibNumber: string,
  fullName: string,
  gender: string,
  dob: Date,
  phone: string,
  shirtCategory: string | null,
  shirtType: string | null,
  shirtSize: string | null
): Promise<string> {
  const qrData = [
    "type: checkin",
    `Tên VDV: ${fullName}`,
    `Giới tính: ${gender}`,
    `Ngày sinh: ${dob.toISOString().split("T")[0]}`,
    `Số bib: ${bibNumber}`,
    `Số điện thoại: ${phone}`,
    `Loại áo: ${shirtCategory}`,
    `Loại áo: ${shirtType}`,
    `Kích thước áo: ${shirtSize}`,
  ].join("\n");

  return await generateAndUploadQR(qrData, `checkin-qr-${bibNumber}`);
}
// /**
//  * Generate Payment QR Code theo chuẩn VietQR/NAPAS
//  * Format: 00020101021238570010A00000072701270006970436011201234567890208QRIBFTTA530370454061000005802VN62150811DK ABC1236304XXXX
//  */
// export async function generatePaymentQR(
//   registrationId: string,
//   amount: number
// ): Promise<string> {
//   const bankCode = process.env.SEPAY_BANK_CODE || "970436"; // MB Bank BIN
//   const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || "0123456789";
//   const content = `DK ${registrationId}`;

//   // VietQR chuẩn theo EMVCo Specification
//   const vietQRData = generateVietQRString({
//     bankBIN: bankCode,
//     accountNumber: accountNumber,
//     amount: amount,
//     description: content,
//   });

//   console.log(
//     `Generating VietQR payment for registration ${registrationId}, amount: ${amount}`
//   );
//   console.log(`QR Data: ${vietQRData}`);

//   return await generateAndUploadQR(vietQRData, `payment-qr-${registrationId}`);
// }

/**
 * Generate VietQR using VietQR API (Recommended)
 */
export async function generatePaymentQR(
  registrationId: string,
  amount: number
): Promise<string> {
  const accountNo = process.env.SEPAY_ACCOUNT_NUMBER || "0123456789";
  const accountName = process.env.SEPAY_BANK_HOLDER || "NGUYEN VAN A";
  const bankId = process.env.SEPAY_BANK_CODE || "MB"; // Mã ngân hàng (MB, VCB, TCB...)
  const template = "compact"; // compact, compact2, qr_only, print
  const description = `${registrationId}`;

  // VietQR API
  const vietqrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

  // Return URL directly (no need to upload)
  return vietqrUrl;
}
/**
 * Generate VietQR string theo chuẩn EMVCo
 */
function generateVietQRString(params: {
  bankBIN: string;
  accountNumber: string;
  amount: number;
  description: string;
}): string {
  const { bankBIN, accountNumber, amount, description } = params;

  // Format theo EMVCo QR Code Specification
  const payload = [
    { id: "00", value: "01" }, // Payload Format Indicator
    { id: "01", value: "12" }, // Point of Initiation Method (12 = QR Static)
    {
      // Merchant Account Information
      id: "38",
      value: [
        { id: "00", value: "A000000727" }, // Guid
        { id: "01", value: bankBIN }, // Bank BIN
        { id: "02", value: accountNumber }, // Account Number
      ]
        .map(
          (item) =>
            `${item.id}${String(item.value.length).padStart(2, "0")}${item.value}`
        )
        .join(""),
    },
    { id: "53", value: "704" }, // Currency Code (704 = VND)
    { id: "54", value: String(amount) }, // Transaction Amount
    { id: "58", value: "VN" }, // Country Code
    {
      // Additional Data
      id: "62",
      value: [{ id: "08", value: description }]
        .map(
          (item) =>
            `${item.id}${String(item.value.length).padStart(2, "0")}${item.value}`
        )
        .join(""),
    },
  ];

  // Build QR string
  let qrString = payload
    .map(
      (item) =>
        `${item.id}${String(item.value.length).padStart(2, "0")}${item.value}`
    )
    .join("");

  // Add CRC (placeholder, tính sau)
  qrString += "6304";

  // Calculate CRC16
  const crc = calculateCRC16(qrString);
  qrString += crc;

  return qrString;
}

/**
 * Calculate CRC16-CCITT checksum
 */
function calculateCRC16(data: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  crc = crc & 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
