// lib/email-service.ts
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  attachments?: any[];
  fromName?: string;
  fromEmail?: string;
}

/**
 * Send email with auto-fallback to Gmail SMTP
 */
export async function sendEmailWithFallback(
  options: EmailOptions,
  emailConfigId?: string
): Promise<{ success: boolean; provider: "resend" | "gmail"; error?: string }> {
  const { to, subject, react, attachments, fromName, fromEmail } = options;

  // Try Resend first
  try {
    await resend.emails.send({
      from: `${fromName || process.env.FROM_NAME} <${fromEmail || process.env.FROM_EMAIL}>`,
      to,
      subject,
      react,
      attachments,
    });

    return { success: true, provider: "resend" };
  } catch (resendError: any) {
    console.error("Resend failed:", resendError.message);

    // Check if quota exceeded
    const isQuotaError =
      resendError.message?.includes("quota") ||
      resendError.message?.includes("limit") ||
      resendError.statusCode === 429;

    if (!isQuotaError) {
      // Not a quota error, rethrow
      throw resendError;
    }

    console.warn("⚠️ Resend quota exceeded, trying Gmail SMTP...");

    // Fallback to Gmail SMTP
    try {
      const gmailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      // Render React component to HTML
      const { renderToStaticMarkup } = await import("react-dom/server");
      const emailHtml = renderToStaticMarkup(react);

      await gmailTransporter.sendMail({
        from: `"${fromName || process.env.FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: emailHtml,
        attachments,
      });

      // Update EmailConfig to use Gmail by default if this happens often
      if (emailConfigId) {
        await prisma.emailConfig.update({
          where: { id: emailConfigId },
          data: { useGmailFallback: true },
        });
      }

      return { success: true, provider: "gmail" };
    } catch (gmailError: any) {
      return {
        success: false,
        provider: "gmail",
        error: gmailError.message,
      };
    }
  }
}

/**
 * Send payment confirmation based on event configuration
 */
export async function sendPaymentConfirmationEmail(data: {
  registration: any;
  event: any;
}): Promise<void> {
  const { registration, event } = data;

  // Get email config
  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });

  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

  // Check if we should send BIB immediately
  const sendBibNow = event.sendBibImmediately ?? true;

  let emailReact;
  let subject;
  let attachments: any[] = [];

  if (sendBibNow) {
    // CASE 1: Send full confirmation with BIB
    const { PaymentConfirmedEmail } =
      await import("@/emails/payment-confirmed");
    emailReact = PaymentConfirmedEmail({ registration, event });
    subject =
      emailConfig?.subjectPaymentConfirmed ||
      `Thanh toán thành công - Số BIB ${registration.bibNumber}`;

    // Attach QR checkin
    if (registration.qrCheckinUrl && emailConfig?.attachQrCheckin) {
      attachments.push({
        filename: `qr-checkin-${registration.bibNumber}.png`,
        path: registration.qrCheckinUrl,
      });
    }
  } else {
    // CASE 2: Send payment received without BIB
    const { PaymentReceivedNoBibEmail } =
      await import("@/emails/payment-received-no-bib");
    emailReact = PaymentReceivedNoBibEmail({ registration, event });
    subject =
      emailConfig?.subjectPaymentReceivedNoBib ||
      `Đã nhận thanh toán - ${event.name}`;
  }

  // Send email with auto-fallback
  const result = await sendEmailWithFallback(
    {
      to: registration.email,
      subject,
      react: emailReact,
      attachments,
      fromName,
      fromEmail,
    },
    emailConfig?.id
  );

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  // Log email
  await prisma.emailLog.create({
    data: {
      registrationId: registration.id,
      emailType: sendBibNow ? "PAYMENT_CONFIRMED" : "PAYMENT_RECEIVED_NO_BIB",
      subject,
      status: "SENT",
      recipientEmail: registration.email,
      emailProvider: result.provider,
    },
  });
}

/**
 * Bulk send BIB announcements (called manually by admin)
 */
export async function sendBibAnnouncementEmails(eventId: string): Promise<{
  success: number;
  failed: number;
}> {
  // Get all paid registrations without email sent
  const registrations = await prisma.registration.findMany({
    where: {
      eventId,
      paymentStatus: "PAID",
      bibNumber: { not: null },
    },
    include: {
      event: true,
      distance: true,
    },
  });

  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId },
  });

  let success = 0;
  let failed = 0;

  // Send in batches
  const batchSize = 50;
  for (let i = 0; i < registrations.length; i += batchSize) {
    const batch = registrations.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (registration: any) => {
        try {
          const { BibAnnouncementEmail } =
            await import("@/emails/bib-announcement");

          const result = await sendEmailWithFallback(
            {
              to: registration.email,
              subject:
                emailConfig?.subjectBibAnnouncement ||
                `Thông báo số BIB - ${registration.event.name}`,
              react: BibAnnouncementEmail({ registration }),
              fromName: emailConfig?.fromName,
              fromEmail: emailConfig?.fromEmail,
            },
            emailConfig?.id
          );

          if (result.success) {
            await prisma.emailLog.create({
              data: {
                registrationId: registration.id,
                emailType: "BIB_ANNOUNCEMENT",
                status: "SENT",
                recipientEmail: registration.email,
                emailProvider: result.provider,
              },
            });
            success++;
          } else {
            throw new Error(result.error);
          }
        } catch (error: any) {
          console.error(`Failed to send to ${registration.email}:`, error);
          await prisma.emailLog.create({
            data: {
              registrationId: registration.id,
              emailType: "BIB_ANNOUNCEMENT",
              status: "FAILED",
              errorMessage: error.message,
              recipientEmail: registration.email,
              emailProvider: "unknown",
            },
          });
          failed++;
        }
      })
    );

    // Wait between batches
    if (i + batchSize < registrations.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { success, failed };
}
