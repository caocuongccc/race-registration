// lib/email.ts
import { Resend } from "resend";
import { RegistrationPendingEmail } from "@/emails/registration-pending";
import { PaymentConfirmedEmail } from "@/emails/payment-confirmed";
import { prisma } from "./prisma";
import { RacePackInfoEmail } from "@/emails/race-pack-info";
const resend = new Resend(process.env.RESEND_API_KEY);

interface RegistrationEmailData {
  registration: any;
  event: any;
  isNewUser?: boolean;
  temporaryPassword?: string;
}

/**
 * Send registration pending email with payment QR (if online payment enabled)
 */
export async function sendRegistrationPendingEmail(
  data: RegistrationEmailData
) {
  const { registration, event, isNewUser, temporaryPassword } = data;

  // Get email config from database
  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });

  // Use default template if no custom config
  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

  // Generate QR attachment if needed (always attach for both modes)
  let attachments: any[] = [];

  if (registration.qrPaymentUrl && emailConfig?.attachQrPayment) {
    // If URL is from VietQR API, include as attachment
    if (registration.qrPaymentUrl.startsWith("http")) {
      attachments.push({
        filename: `qr-thanh-toan-${registration.id}.png`,
        path: registration.qrPaymentUrl,
      });
    }
  }

  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: registration.email,
      subject: `Xác nhận đăng ký ${isNewUser ? "& Thông tin tài khoản" : ""} - ${event.name}`,
      react: RegistrationPendingEmail({
        registration,
        event,
        bankInfo: {
          bankName: event.bankName || process.env.SEPAY_BANK_NAME,
          accountNumber: event.bankAccount || process.env.SEPAY_ACCOUNT_NUMBER,
          accountHolder: event.bankHolder || process.env.SEPAY_BANK_HOLDER,
        },
        isNewUser,
        temporaryPassword,
      }),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

/**
 * Send payment confirmed email with BIB number
 */
export async function sendPaymentConfirmedEmail(data: RegistrationEmailData) {
  const { registration, event } = data;
  // Get email config
  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });
  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;
  // Attach QR checkin if enabled
  let attachments: any[] = [];

  if (registration.qrCheckinUrl && emailConfig?.attachQrCheckin) {
    attachments.push({
      filename: `qr-checkin-${registration.bibNumber}.png`,
      path: registration.qrCheckinUrl,
    });
  }

  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: registration.email,
      subject: `Thanh toán thành công - Số BIB ${registration.bibNumber}`,
      react: PaymentConfirmedEmail({
        registration,
        event,
      }),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

/**
 * Send race pack info email (bulk)
 */
export async function sendRacePackInfoEmails(eventId: string) {
  // Get all paid registrations
  const registrations = await prisma.registration.findMany({
    where: {
      eventId: eventId,
      paymentStatus: "PAID",
    },
    include: {
      event: true,
      distance: true,
    },
  });

  const results = {
    success: 0,
    failed: 0,
  };

  // Send in batches of 100 to avoid rate limits
  const batchSize = 100;
  for (let i = 0; i < registrations.length; i += batchSize) {
    const batch = registrations.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (registration: any) => {
        try {
          await resend.emails.send({
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: registration.email,
            subject: `Thông tin quan trọng - ${registration.event.name}`,
            react: RacePackInfoEmail({ registration }),
          });

          // Log success
          await prisma.emailLog.create({
            data: {
              registrationId: registration.id,
              emailType: "RACE_PACK_INFO",
              status: "SENT",
            },
          });

          results.success++;
        } catch (error) {
          console.error(
            `Failed to send email to ${registration.email}:`,
            error
          );

          // Log failure
          await prisma.emailLog.create({
            data: {
              registrationId: registration.id,
              emailType: "RACE_PACK_INFO",
              status: "FAILED",
              errorMessage: (error as Error).message,
            },
          });

          results.failed++;
        }
      })
    );

    // Wait 1 second between batches
    if (i + batchSize < registrations.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
