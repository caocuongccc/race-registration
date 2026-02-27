// lib/email-service-gmail-first.ts
// FIXED: Send QR as CID attachment, not inline base64

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
  qrCode?: string; // ✅ NEW: QR code base64 data URL
}

/**
 * ✅ GMAIL FIRST - Send email with Gmail priority, fallback to Resend
 * ✅ FIXED: Support QR as CID attachment
 */
export async function sendEmailGmailFirst(
  options: EmailOptions,
  emailConfigId?: string,
): Promise<{ success: boolean; provider: "gmail" | "resend"; error?: string }> {
  const {
    to,
    subject,
    react,
    attachments = [],
    fromName,
    fromEmail,
    qrCode,
  } = options;

  // ✅ Prepare QR attachment if provided
  let qrAttachment: any = null;
  if (qrCode && qrCode.startsWith("data:image/png;base64,")) {
    const base64Data = qrCode.split("base64,")[1];
    qrAttachment = {
      filename: "qr-checkin.png",
      content: base64Data,
      encoding: "base64",
      cid: "qrcheckin", // ✅ Content-ID for inline reference
    };
  }

  // Combine attachments
  const allAttachments = qrAttachment
    ? [...attachments, qrAttachment]
    : attachments;

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
      const emailHtml = renderToStaticMarkup(react);

      await gmailTransporter.sendMail({
        from: `"${fromName || process.env.FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: emailHtml,
        attachments: allAttachments, // ✅ Include QR with CID
      });

      console.log(`✅ Email sent via Gmail SMTP to ${to}`);
      return { success: true, provider: "gmail" };
    } catch (gmailError: any) {
      console.warn(`⚠️ Gmail failed for ${to}:`, gmailError.message);
      console.log("🔄 Falling back to Resend...");
    }
  } else {
    console.log("⚠️ Gmail not configured, using Resend directly");
  }

  // ============================================
  // 2. FALLBACK TO RESEND
  // ============================================
  try {
    // ✅ Resend also supports CID attachments
    await resend.emails.send({
      from: `${fromName || process.env.FROM_NAME} <${fromEmail || process.env.FROM_EMAIL}>`,
      to,
      subject,
      react,
      attachments: allAttachments,
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
 * ✅ Send payment confirmation email (Gmail first)
 * FIXED: Pass QR code for CID attachment
 */
export async function sendPaymentConfirmationEmailGmailFirst(data: {
  registration: any;
  event: any;
}): Promise<void> {
  const { registration, event } = data;

  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });

  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

  const sendBibNow = event.sendBibImmediately ?? true;

  let emailReact;
  let subject;

  if (sendBibNow) {
    const { PaymentConfirmedEmail } =
      await import("@/emails/payment-confirmed");

    // ✅ Pass registration without qrCode in data
    // QR will be sent as CID attachment
    emailReact = PaymentConfirmedEmail({
      registration,
      event,
    });

    subject =
      emailConfig?.subjectPaymentConfirmed?.replace?.(
        "{{bibNumber}}",
        registration.bibNumber,
      ) || `Thanh toán thành công - Số BIB ${registration.bibNumber}`;
  } else {
    const { PaymentReceivedNoBibEmail } =
      await import("@/emails/payment-received-no-bib");
    emailReact = PaymentReceivedNoBibEmail({ registration, event });
    subject =
      emailConfig?.subjectPaymentReceivedNoBib ||
      `Đã nhận thanh toán - ${event.name}`;
  }

  // ✅ Send with QR as CID attachment
  const result = await sendEmailGmailFirst(
    {
      to: registration.email,
      subject,
      react: emailReact,
      fromName,
      fromEmail,
      qrCode: registration.qrCode, // ✅ Pass QR for CID attachment
    },
    emailConfig?.id,
  );

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

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

  console.log(`✅ Payment email sent via ${result.provider.toUpperCase()}`);
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

  const emailConfig = await prisma.emailConfig.findUnique({
    where: { eventId: event.id },
  });

  const fromName = emailConfig?.fromName || process.env.FROM_NAME;
  const fromEmail = emailConfig?.fromEmail || process.env.FROM_EMAIL;

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
      fromName,
      fromEmail,
    },
    emailConfig?.id,
  );

  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  console.log(
    `📨 Registration email sent via ${result.provider.toUpperCase()}`,
  );
}
