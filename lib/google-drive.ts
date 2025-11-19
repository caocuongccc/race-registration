// lib/google-drive.ts
import { google } from "googleapis";
import QRCode from "qrcode";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

/**
 * Upload file to Google Drive
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  webContentLink: string;
}> {
  try {
    // Create file
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(fileBuffer),
      },
      fields: "id,name,webViewLink,webContentLink",
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Get direct link
    const file = await drive.files.get({
      fileId: response.data.id!,
      fields: "webContentLink",
    });

    return {
      fileId: response.data.id!,
      fileName: response.data.name!,
      webViewLink: response.data.webViewLink!,
      webContentLink: file.data.webContentLink!,
    };
  } catch (error) {
    console.error("Google Drive upload error:", error);
    throw new Error("Không thể upload file lên Google Drive");
  }
}

/**
 * Generate QR Code và upload lên Google Drive
 */
export async function generateAndUploadQR(
  data: string,
  fileName: string,
  folderId?: string
): Promise<string> {
  try {
    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(data, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    // Upload to Google Drive
    const result = await uploadToGoogleDrive(
      qrBuffer,
      fileName,
      "image/png",
      folderId || process.env.GOOGLE_DRIVE_QR_FOLDER_ID
    );

    // Return direct download link
    return result.webContentLink;
  } catch (error) {
    console.error("QR generation/upload error:", error);
    throw new Error("Không thể tạo QR code");
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
  const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
  const content = `DK ${registrationId}`;

  // VietQR format
  const qrData = `${bankCode}|${accountNumber}|${amount}|${content}`;

  return await generateAndUploadQR(qrData, `payment-qr-${registrationId}.png`);
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

  return await generateAndUploadQR(qrData, `checkin-qr-${registrationId}.png`);
}
