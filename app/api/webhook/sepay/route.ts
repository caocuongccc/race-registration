// app/api/webhook/sepay/route.ts - CORRECT SEPAY WEBHOOK
import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCheckinQR } from "@/lib/imgbb";
import { parseSepayWebhook, verifySepayWebhook } from "@/lib/sepay-service";
import { sendPaymentConfirmationEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { generateBibNumberHybrid } from "@/lib/bib-generator";
import { getEventBankAccount } from "@/lib/bank-account-service"; // ✅ Decrypted bank account

/**
 * Generate BIB number
 */
async function sendPaymentConfirmationInBackground(
  registrationId: string,
  bibNumber: string,
) {
  let recipientEmail = "unknown";
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        distance: true,
        event: true,
        shirt: true,
      },
    });

    if (!registration) {
      throw new Error(`Registration not found for email: ${registrationId}`);
    }
    recipientEmail = registration.email;

    let registrationForEmail = registration;
    if (!registrationForEmail.qrCheckinUrl && registrationForEmail.bibNumber) {
      const qrCheckinUrl = await generateCheckinQR(
        registrationForEmail.id,
        registrationForEmail.bibNumber,
        registrationForEmail.fullName,
        registrationForEmail.gender,
        registrationForEmail.dob,
        registrationForEmail.phone,
        registrationForEmail.shirtCategory,
        registrationForEmail.shirtType,
        registrationForEmail.shirtSize,
      );

      registrationForEmail = await prisma.registration.update({
        where: { id: registrationForEmail.id },
        data: { qrCheckinUrl },
        include: {
          distance: true,
          event: true,
          shirt: true,
        },
      });
    }

    await sendPaymentConfirmationEmailGmailFirst({
      registration: registrationForEmail,
      event: registrationForEmail.event,
    });

    console.log(`âœ… Confirmation email sent`);

    await prisma.emailLog.create({
      data: {
        registrationId,
        emailType: "PAYMENT_CONFIRMED",
        subject: `Thanh toÃ¡n thÃ nh cÃ´ng - Sá»‘ BIB ${bibNumber}`,
        status: "SENT",
        recipientEmail,
        emailProvider: "GMAIL_FIRST",
      },
    });
  } catch (emailError) {
    console.error("âŒ Email error:", emailError);

    await prisma.emailLog.create({
      data: {
        registrationId,
        emailType: "PAYMENT_CONFIRMED",
        subject: `Thanh toÃ¡n thÃ nh cÃ´ng - Sá»‘ BIB ${bibNumber}`,
        status: "FAILED",
        recipientEmail,
        emailProvider: "GMAIL_FIRST",
        errorMessage: (emailError as Error).message,
      },
    });
  }
}

async function logSepayWebhook(
  event: string,
  status: string,
  payload: unknown,
  errorMessage?: string,
  eventId?: string | null,
) {
  try {
    await prisma.webhookLog.create({
      data: {
        provider: "sepay",
        event,
        payload: JSON.stringify(payload),
        status,
        errorMessage,
        eventId,
      },
    });
  } catch (logError) {
    console.error("Failed to write SePay webhook log:", logError);
  }
}

/**
 * Process payment confirmation
 */
async function processPaymentConfirmation(
  registrationCode: string,
  transactionId: string,
  amount: number,
  webhookData: any,
) {
  try {
    let registrationId = registrationCode;
    if (/^\d+$/.test(registrationCode)) {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "registrations"
        WHERE "registration_number" = ${Number(registrationCode)}
        LIMIT 1
      `;
      registrationId = rows[0]?.id || registrationCode;
    }

    console.log(`🔄 Processing payment for: ${registrationId}`);

    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        distance: true,
        event: true,
        shirt: true,
      },
    });

    if (!registration) {
      throw new Error(`Registration not found: ${registrationId}`);
    }

    // Check if already paid (idempotency - same registration)
    if (registration.paymentStatus === "PAID") {
      console.log(`✅ Already paid: ${registrationId}`);
      return {
        success: true,
        message: "Already paid",
        bibNumber: registration.bibNumber,
        registrationId,
        eventId: registration.eventId,
      };
    }

    // ============================================
    // ✅ DUPLICATE TRANSACTION CHECK (idempotency)
    // SePay retries webhooks - use SePay's unique `id` field to prevent
    // processing the same transaction twice
    // ============================================
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId },
    });
    if (existingPayment) {
      console.log(`✅ Transaction ${transactionId} already processed (idempotency)`);
      return {
        success: true,
        message: "Transaction already processed",
        bibNumber: registration.bibNumber,
        registrationId,
        eventId: registration.eventId,
      };
    }

    // ============================================
    // ✅ VERIFY ACCOUNT NUMBER (using decrypted bank account)
    // ============================================
    const receivedAccountNumbers = [
      webhookData.subAccount,
      webhookData.accountNumber,
    ].filter(Boolean);
    if (receivedAccountNumbers.length > 0) {
      const eventBank = await getEventBankAccount(registration.eventId);
      const expectedAccount = eventBank?.accountNumber || process.env.SEPAY_ACCOUNT_NUMBER;
      const isExpectedAccount = expectedAccount
        ? receivedAccountNumbers.includes(expectedAccount)
        : true;

      if (!isExpectedAccount) {
        console.warn(
          `⚠️ Account mismatch: received ${receivedAccountNumbers.join(", ")}, expected ${expectedAccount?.substring(0, 4)}****`
        );
        // Log but don't block - could be legitimate if multiple accounts configured
      } else {
        console.log(`✅ Account verified: ${expectedAccount?.substring(0, 4)}****`);
      }
    }
    // Verify amount (allow small difference)
    const amountDiff = Math.abs(amount - registration.totalAmount);
    if (amountDiff > 1000) {
      console.warn(
        `⚠️ Amount mismatch: ${amount} vs ${registration.totalAmount}`,
      );

      // If amount is more, it's OK (customer paid extra)
      if (amount < registration.totalAmount) {
        throw new Error(
          `Payment amount ${amount} is less than required ${registration.totalAmount}`,
        );
      }
    }

    // Generate BIB number
    const bibNumber = await generateBibNumberHybrid(
      registrationId,
      registration.distanceId,
      registration.distanceGoalId,
    );
    console.log(`🎫 BIB number: ${bibNumber}`);

    // Keep the webhook transaction short so SePay gets a fast response.
    await prisma.$transaction([
      prisma.registration.update({
        where: { id: registrationId },
        data: {
          paymentStatus: "PAID",
          bibNumber: bibNumber,
          paymentDate: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          registrationId: registrationId,
          transactionId: transactionId,
          amount: amount,
          status: "PAID",
          paymentMethod: "sepay_transfer",
          webhookData: webhookData,
        },
      }),
    ]);

    console.log(`✅ Registration updated successfully`);

    after(async () => {
      await sendPaymentConfirmationInBackground(registrationId, bibNumber);
    });

    return {
      success: true,
      bibNumber: bibNumber,
      registrationId: registrationId,
      eventId: registration.eventId,
    };

  } catch (error) {
    console.error("❌ Payment processing error:", error);
    throw error;
  }
}

/**
 * SePay Webhook Handler
 * Receives bank transaction notifications from SePay
 */
export async function POST(req: NextRequest) {
  let webhookData: any = null;
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔔 SePay Webhook at:", new Date().toISOString());
    console.log("=".repeat(60));

    // Get webhook body
    webhookData = await req.json();
    console.log("📥 Webhook data:", JSON.stringify(webhookData, null, 2));
    await logSepayWebhook("payment.received", "RECEIVED", webhookData);

    // Verify webhook
    const authHeader = req.headers.get("authorization");
    const secretKeyHeader = req.headers.get("x-secret-key");
    if (!verifySepayWebhook(webhookData, authHeader, secretKeyHeader)) {
      console.error("❌ Invalid webhook data or unauthorized");
      await logSepayWebhook(
        "payment.auth",
        "UNAUTHORIZED",
        webhookData,
        "Invalid webhook data or unauthorized",
      );
      return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
    }

    // Parse webhook data
    const parsed = parseSepayWebhook(webhookData);
    console.log("📋 Parsed:", parsed);

    const { orderCode, amount, transactionId, transactionDate, bankName } =
      parsed;

    // Check if order code found
    if (!orderCode) {
      console.error("❌ No order code found in webhook");
      console.log("Content:", webhookData.content);
      await logSepayWebhook(
        "payment.parse",
        "NO_ORDER_CODE",
        webhookData,
        "No order code found in transaction content",
      );

      // Return 200 to avoid SePay retry
      return NextResponse.json({
        success: false,
        message: "No order code found in transaction content",
      });
    }

    console.log(`📦 Processing order: ${orderCode}`);

    // Process payment
    const result = await processPaymentConfirmation(
      orderCode,
      transactionId,
      amount,
      webhookData,
    );

    console.log(`✅ Payment processed:`, result);
    console.log("=".repeat(60) + "\n");
    await logSepayWebhook("payment.processed", "SUCCESS", {
      webhookData,
      result,
    }, undefined, result.eventId);

    // Return success
    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
      bibNumber: result.bibNumber,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    console.log("=".repeat(60) + "\n");

    // Log to database
    await logSepayWebhook(
      "payment.error",
      "FAILED",
      webhookData || { error: String(error) },
      (error as Error).message,
    );

    // Return 200 to avoid retry
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 200 },
    );
  }
}

/**
 * GET endpoint for testing
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "SePay Webhook Endpoint",
    timestamp: new Date().toISOString(),
    webhookUrl: `${req.nextUrl.origin}/api/webhook/sepay`,
    status: "active",
  });
}
