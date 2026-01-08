// app/api/webhook/sepay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCheckinQR } from "@/lib/google-drive";
import { sendPaymentConfirmedEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * Verify webhook signature from SePay
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = hmac.update(payload).digest("hex");
  return signature === expectedSignature;
}

/**
 * Generate BIB number based on distance prefix and payment order
 */
async function generateBibNumber(
  registrationId: string,
  distanceId: string
): Promise<string> {
  // Get distance info
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
  });

  if (!distance) {
    throw new Error("Distance not found");
  }

  // Count paid registrations for this distance
  const paidCount = await prisma.registration.count({
    where: {
      distanceId: distanceId,
      paymentStatus: "PAID",
      bibNumber: {
        not: null,
      },
    },
  });

  // Generate BIB: prefix + zero-padded number
  // Example: HM001, HM002, 10K001, 5K001
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
  webhookData: any
) {
  try {
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
      throw new Error("Registration not found");
    }

    // Check if already paid
    if (registration.paymentStatus === "PAID") {
      console.log(`Registration ${registrationId} already paid`);
      return { success: true, message: "Already paid" };
    }

    // Verify amount matches
    if (amount !== registration.totalAmount) {
      console.warn(
        `Amount mismatch: expected ${registration.totalAmount}, got ${amount}`
      );
      // Still process if amount is equal or greater
      if (amount < registration.totalAmount) {
        throw new Error("Payment amount is less than required");
      }
    }

    // Generate BIB number
    const bibNumber = await generateBibNumber(
      registrationId,
      registration.distanceId
    );

    // Generate check-in QR code
    const qrCheckinUrl = await generateCheckinQR(registrationId, bibNumber);

    // Update registration in transaction
    const updatedRegistration = await prisma.$transaction(async (tx) => {
      // Update registration
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
          paymentMethod: "bank_transfer",
          webhookData: webhookData,
        },
      });

      return updated;
    });

    // Send confirmation email with BIB number
    try {
      await sendPaymentConfirmedEmail({
        registration: updatedRegistration,
        event: registration.event,
      });

      // Log email sent
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

      console.log(`✅ Payment confirmed email sent for ${bibNumber}`);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);

      // Log email failure but don't fail the payment
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
    console.error("Payment processing error:", error);
    throw error;
  }
}

/**
 * Webhook endpoint - POST /api/webhook/sepay
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("x-sepay-signature") || "";

    // Verify signature if secret is set
    if (process.env.SEPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(
        body,
        signature,
        process.env.SEPAY_WEBHOOK_SECRET
      );

      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Parse webhook data
    const webhookData = JSON.parse(body);

    console.log("📥 Webhook received:", webhookData);

    // Extract data from webhook
    // Format depends on SePay's webhook structure
    // Common fields: transaction_id, amount, content, status
    const {
      transaction_id: transactionId,
      amount_in: amount,
      transaction_content: content,
      gateway_status: status,
    } = webhookData;

    // Only process successful transactions
    if (status !== "success" && status !== "SUCCESSFUL") {
      console.log(`Transaction status: ${status}, skipping`);
      return NextResponse.json({ success: true, message: "Skipped" });
    }

    // Extract registration ID from content
    // Expected format: "DK {registrationId}" or "DK{registrationId}"
    const match = content?.match(/DK\s*([a-zA-Z0-9_-]+)/i);

    if (!match || !match[1]) {
      console.error("Invalid transaction content format:", content);
      return NextResponse.json(
        { error: "Cannot extract registration ID from content" },
        { status: 400 }
      );
    }

    const registrationId = match[1];

    // Process payment
    const result = await processPaymentConfirmation(
      registrationId,
      transactionId,
      amount,
      webhookData
    );

    console.log(`✅ Payment processed successfully:`, result);

    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
      bibNumber: result.bibNumber,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    // Return 200 to prevent SePay from retrying
    // Log the error for manual review
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    });
  }
}

// For testing webhook locally
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "SePay Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
