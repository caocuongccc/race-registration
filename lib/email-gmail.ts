// lib/email-gmail.ts
// Alternative email service using Gmail SMTP with Nodemailer

import nodemailer from "nodemailer";
import { RegistrationPendingEmail } from "@/emails/registration-pending";
import { PaymentConfirmedEmail } from "@/emails/payment-confirmed";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD, // App Password (NOT your Gmail password)
  },
});

/**
 * Send registration pending email via Gmail SMTP
 */
export async function sendRegistrationPendingEmailGmail(data: any) {
  const { registration, event, bankInfo } = data;

  try {
    const { renderToStaticMarkup } = await import("react-dom/server");
    // Render React component to HTML
    const emailHtml = renderToStaticMarkup(
      RegistrationPendingEmail({ registration, event, bankInfo })
    );

    // Prepare attachments
    const attachments = [];
    if (
      registration.qrPaymentUrl &&
      registration.qrPaymentUrl.startsWith("data:")
    ) {
      // Base64 image
      const base64Data = registration.qrPaymentUrl.split(",")[1];
      attachments.push({
        filename: `qr-thanh-toan-${registration.id}.png`,
        content: base64Data,
        encoding: "base64",
      });
    } else if (registration.qrPaymentUrl) {
      // URL image
      attachments.push({
        filename: `qr-thanh-toan-${registration.id}.png`,
        path: registration.qrPaymentUrl,
      });
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "Ban Tổ Chức"}" <${process.env.GMAIL_USER}>`,
      to: registration.email,
      subject: `Xác nhận đăng ký - ${event.name}`,
      html: emailHtml,
      attachments: attachments,
    });

    console.log("✅ Email sent via Gmail:", info.messageId);
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    throw error;
  }
}

/**
 * Send payment confirmed email via Gmail SMTP
 */
export async function sendPaymentConfirmedEmailGmail(data: any) {
  const { registration, event } = data;

  try {
    const emailHtml = renderToStaticMarkup(
      PaymentConfirmedEmail({ registration, event })
    );

    const attachments = [];
    if (registration.qrCheckinUrl) {
      if (registration.qrCheckinUrl.startsWith("data:")) {
        const base64Data = registration.qrCheckinUrl.split(",")[1];
        attachments.push({
          filename: `qr-checkin-${registration.bibNumber}.png`,
          content: base64Data,
          encoding: "base64",
        });
      } else {
        attachments.push({
          filename: `qr-checkin-${registration.bibNumber}.png`,
          path: registration.qrCheckinUrl,
        });
      }
    }

    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "Ban Tổ Chức"}" <${process.env.GMAIL_USER}>`,
      to: registration.email,
      subject: `Thanh toán thành công - Số BIB ${registration.bibNumber}`,
      html: emailHtml,
      attachments: attachments,
    });

    console.log("✅ Email sent via Gmail:", info.messageId);
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    throw error;
  }
}

// ================================
// SETUP INSTRUCTIONS
// ================================
// 1. Enable 2FA on your Gmail account
// 2. Go to: https://myaccount.google.com/apppasswords
// 3. Generate an App Password
// 4. Add to .env.local:
//
// GMAIL_USER="your-email@gmail.com"
// GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
// FROM_NAME="Ban Tổ Chức Giải Chạy"
//
// 5. Install nodemailer:
// npm install nodemailer react-dom
// npm install -D @types/nodemailer
//
// 6. Replace imports in registration API:
// FROM: import { sendRegistrationPendingEmail } from "@/lib/email";
// TO:   import { sendRegistrationPendingEmailGmail as sendRegistrationPendingEmail } from "@/lib/email-gmail";
//
// ================================
