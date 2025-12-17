// lib/email-service-gmail-first.ts
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
 * ✅ GMAIL FIRST - Send email with Gmail priority, fallback to Resend
 */
export async function sendEmailGmailFirst(
  options: EmailOptions,
  emailConfigId?: string
): Promise<{ success: boolean; provider: "gmail" | "resend"; error?: string }> {
  const { to, subject, react, attachments, fromName, fromEmail } = options;

  // ============================================
  // 1. TRY GMAIL FIRST
  // ============================================
  const hasGmailConfig =
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

  if (hasGmailConfig) {
    console.log(`📧 Attempting Gmail SMTP for ${to}...`);

    try {
      const gmailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      const { renderToStaticMarkup } = await import("react-dom/server");
      // Render React component to HTML
      const emailHtml = renderToStaticMarkup(react);

      await gmailTransporter.sendMail({
        from: `"${fromName || process.env.FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: emailHtml,
        attachments,
      });

      console.log(`✅ Email sent via Gmail SMTP to ${to}`);
      return { success: true, provider: "gmail" };
    } catch (gmailError: any) {
      console.warn(`⚠️ Gmail failed for ${to}:`, gmailError.message);
      console.log("🔄 Falling back to Resend...");

      // Continue to Resend fallback
    }
  } else {
    console.log("⚠️ Gmail not configured, using Resend directly");
  }

  // ============================================
  // 2. FALLBACK TO RESEND
  // ============================================
  try {
    await resend.emails.send({
      from: `${fromName || process.env.FROM_NAME} <${fromEmail || process.env.FROM_EMAIL}>`,
      to,
      subject,
      react,
      attachments,
    });

    console.log(`✅ Email sent via Resend to ${to}`);
    return { success: true, provider: "resend" };
  } catch (resendError: any) {
    console.error(`❌ Resend also failed for ${to}:`, resendError.message);

    return {
      success: false,
      provider: "resend",
      error: `Gmail failed: ${hasGmailConfig ? "connection error" : "not configured"}, Resend failed: ${resendError.message}`,
    };
  }
}

/**
 * ✅ Send registration pending email (Gmail first)
 */
export async function sendRegistrationPendingEmailGmailFirst(data: {
  registration: any;
  event: any;
  isNewUser?: boolean;
  temporaryPassword?: string;
}): Promise<void> {
  const { registration, event, isNewUser, temporaryPassword } = data;

  // Get email config
  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });

  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

  // Prepare attachments
  let attachments: any[] = [];
  if (registration.qrPaymentUrl && emailConfig?.attachQrPayment) {
    if (registration.qrPaymentUrl.startsWith("http")) {
      attachments.push({
        filename: `qr-thanh-toan-${registration.id}.png`,
        path: registration.qrPaymentUrl,
      });
    }
  }

  // Import email template
  const { RegistrationPendingEmail } =
    await import("@/emails/registration-pending");

  const result = await sendEmailGmailFirst(
    {
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
      attachments,
      fromName,
      fromEmail,
    },
    emailConfig?.id
  );

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  // Log which provider was used
  console.log(
    `📨 Registration email sent via ${result.provider.toUpperCase()}`
  );
}

/**
 * ✅ Send payment confirmation email (Gmail first)
 */
export async function sendPaymentConfirmationEmailGmailFirst(data: {
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

  // Send email (Gmail first)
  const result = await sendEmailGmailFirst(
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
    },
  });
}
