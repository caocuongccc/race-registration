// app/api/webhook/sepay/route.ts - CORRECT SEPAY WEBHOOK
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateCheckinQR } from "@/lib/imgbb";
import { parseSepayWebhook, verifySepayWebhook } from "@/lib/sepay-service";
import { sendPaymentConfirmationEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { getEventBankAccount } from "@/lib/bank-account-service"; // ✅ Decrypted bank account

/**
 * Generate BIB number
 */
async function generateBibNumber(
  registrationId: string,
  distanceId: string,
): Promise<string> {
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
  });

  if (!distance) {
    throw new Error("Distance not found");
  }

  const paidCount = await prisma.registration.count({
    where: {
      distanceId: distanceId,
      paymentStatus: "PAID",
      bibNumber: {
        not: null,
      },
    },
  });

  const bibNumber = `${distance.bibPrefix}${String(paidCount + 1).padStart(3, "0")}`;
  return bibNumber;
}

/**
 * Process payment confirmation
 */
async function processPaymentConfirmation(
  registrationId: string,
  transactionId: string,
  amount: number,
  webhookData: any,
) {
  try {
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
      };
    }

    // ============================================
    // ✅ VERIFY ACCOUNT NUMBER (using decrypted bank account)
    // ============================================
    const receivedAccountNumber = webhookData.accountNumber;
    if (receivedAccountNumber) {
      const eventBank = await getEventBankAccount(registration.eventId);
      const expectedAccount = eventBank?.accountNumber || process.env.SEPAY_ACCOUNT_NUMBER;

      if (expectedAccount && receivedAccountNumber !== expectedAccount) {
        console.warn(
          `⚠️ Account mismatch: received ${receivedAccountNumber}, expected ${expectedAccount?.substring(0, 4)}****`
        );
        // Log but don't block - could be legitimate if multiple accounts configured
      } else {
        console.log(`✅ Account verified: ${receivedAccountNumber?.substring(0, 4)}****`);
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
    const bibNumber = await generateBibNumber(
      registrationId,
      registration.distanceId,
    );
    console.log(`🎫 BIB number: ${bibNumber}`);

    // Generate check-in QR
    const qrCheckinUrl = await generateCheckinQR(
      registrationId,
      bibNumber,
      registration.fullName,
      registration.gender,
      registration.dob,
      registration.phone,
      registration.shirtCategory,
      registration.shirtType,
      registration.shirtSize,
    );

    // Update registration
    const updatedRegistration = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.registration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: "PAID",
            bibNumber: bibNumber,
            qrCheckinUrl: qrCheckinUrl,
            paymentDate: new Date(),
          },
          include: {
            distance: true,
            event: true,
            shirt: true,
          },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            registrationId: registrationId,
            transactionId: transactionId,
            amount: amount,
            status: "PAID",
            paymentMethod: "sepay_transfer",
            webhookData: webhookData,
          },
        });

        return updated;
      },
    );

    console.log(`✅ Registration updated successfully`);

    // Send confirmation email
    try {
      await sendPaymentConfirmationEmailGmailFirst({
        registration: updatedRegistration,
        event: registration.event,
      });

      console.log(`✅ Confirmation email sent`);

      await prisma.emailLog.create({
        data: {
          registrationId: registrationId,
          emailType: "PAYMENT_CONFIRMED",
          subject: `Thanh toán thành công - Số BIB ${bibNumber}`,
          status: "SENT",
          recipientEmail: registration.email,
          emailProvider: "GMAIL_FIRST",
        },
      });
    } catch (emailError) {
      console.error("❌ Email error:", emailError);

      await prisma.emailLog.create({
        data: {
          registrationId: registrationId,
          emailType: "PAYMENT_CONFIRMED",
          subject: `Thanh toán thành công - Số BIB ${bibNumber}`,
          status: "FAILED",
          recipientEmail: registration.email,
          emailProvider: "GMAIL_FIRST",
          errorMessage: (emailError as Error).message,
        },
      });
    }

    return {
      success: true,
      bibNumber: bibNumber,
      registrationId: registrationId,
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
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔔 SePay Webhook at:", new Date().toISOString());
    console.log("=".repeat(60));

    // Get webhook body
    const webhookData = await req.json();
    console.log("📥 Webhook data:", JSON.stringify(webhookData, null, 2));

    // Verify webhook
    if (!verifySepayWebhook(webhookData)) {
      console.error("❌ Invalid webhook data");
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
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
    try {
      await prisma.webhookLog.create({
        data: {
          provider: "sepay",
          event: "payment",
          payload: JSON.stringify(error),
          status: "FAILED",
          errorMessage: (error as Error).message,
        },
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

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
