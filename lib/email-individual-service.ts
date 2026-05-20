// lib/email-individual-service.ts
// UPDATED: Call generateIndividualQR with full registration info

import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { RegistrationConfirmationEmail } from "@/emails/registration-confirmation";
import { generateIndividualQR } from "@/lib/qr-individual";

export async function sendRegistrationConfirmationEmail(data: {
  registration: any;
  event: any;
}) {
  const { registration, event } = data;

  if (!registration.email) {
    throw new Error("Email address is required");
  }

  if (!registration.bibNumber) {
    throw new Error("BIB number is required");
  }

  try {
    // ✅ Generate QR with full registration info (like old generateCheckinQR)
    console.log(`🔄 Generating QR for registration ${registration.id}...`);
    let qrCode = "";

    try {
      qrCode = await generateIndividualQR(
        registration.id,
        registration.bibNumber,
        registration.bibNumber,
        registration.fullName,
        registration.gender,
        registration.dob,
        registration.phone,
        registration.shirtCategory,
        registration.shirtType,
        registration.shirtSize,
        registration.importBatchId,
      );

      // Validate QR format
      if (!qrCode || !qrCode.startsWith("data:image/png;base64,")) {
        console.warn(`⚠️ Invalid QR generated for ${registration.id}`);
        qrCode = "";
      } else {
        console.log(`✅ QR generated successfully for ${registration.id}`);
      }
    } catch (qrError: any) {
      console.error(
        `❌ QR generation failed for ${registration.id}:`,
        qrError.message,
      );
      qrCode = ""; // Continue without QR
    }
    console.log(
      `📧 Sending registration confirmation email to ${registration.email} with QR: ${qrCode ? "present" : "absent"}`,
    );

    const result = await sendEmailGmailFirst({
      to: registration.email,
      subject: `Thanh toán thành công - ${event.name} - BIB ${registration.bibNumber}`,
      react: RegistrationConfirmationEmail({
        registration: {
          fullName: registration.fullName,
          bibNumber: registration.bibNumber,
          email: registration.email,
          phone: registration.phone || "",
          bibName: registration.bibName || "",
          shirtCategory: registration.shirtCategory || "",
          shirtType: registration.shirtType || "",
          shirtSize: registration.shirtSize || "",
          finisherShirtCategory: registration.finisherShirtCategory || "",
          finisherShirtType: registration.finisherShirtType || "",
          finisherShirtSize: registration.finisherShirtSize || "",
          //qrCheckinUrl: qrCode, // ✅ QR with full info, not just ID
        },
        event: {
          name: event.name,
          date: event.date,
          location: event.location || "",
          logoUrl: event.logoUrl || "",
          racePackLocation: event.racePackLocation || "",
          racePackTime: event.racePackTime || "",
          hotline: event.hotline || "",
          emailSupport: event.emailSupport || "",
          facebookUrl: event.facebookUrl || "",
        },
        distance: {
          name: registration.distance?.name || "N/A",
        },
        shirt: registration.shirt
          ? {
              category: registration.shirtCategory || "N/A",
              type: registration.shirtType || "N/A",
              size: registration.shirtSize || "N/A",
            }
          : undefined,
      }),
      fromName: event.name,
      fromEmail: process.env.FROM_EMAIL || "noreply@raceregistration.vn",
      qrCode,
    });

    if (!result.success) {
      throw new Error(`Email send failed: ${result.error}`);
    }

    console.log(`✅ Email sent successfully to ${registration.email}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Email service error for ${registration.email}:`, error);
    throw error;
  }
}
