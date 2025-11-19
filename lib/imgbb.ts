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
    console.log(`✅ Uploaded to ImgBB: ${data.data.url}`);
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
export async function generatePaymentQR(
  registrationId: string,
  amount: number
): Promise<string> {
  const bankCode = process.env.SEPAY_BANK_CODE || "MB";
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER || "0123456789";
  const content = `DK ${registrationId}`;

  // VietQR format
  const qrData = `${bankCode}|${accountNumber}|${amount}|${content}`;

  console.log(
    `Generating payment QR for registration ${registrationId}, amount: ${amount}`
  );

  return await generateAndUploadQR(qrData, `payment-qr-${registrationId}`);
}

/**
 * Generate Check-in QR Code
 * Format: Simple registration ID for scanning
 */
export async function generateCheckinQR(
  registrationId: string,
  bibNumber: string
): Promise<string> {
  // JSON format for easy parsing when scanning
  const qrData = JSON.stringify({
    type: "checkin",
    registrationId: registrationId,
    bibNumber: bibNumber,
  });

  console.log(`Generating checkin QR for BIB ${bibNumber}`);

  return await generateAndUploadQR(qrData, `checkin-qr-${bibNumber}`);
}
