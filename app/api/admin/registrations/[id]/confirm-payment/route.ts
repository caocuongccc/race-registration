// app/api/admin/registrations/[id]/confirm-payment/route.ts
// UPDATED: Generate QR inline, no ImgBB upload

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateIndividualQR } from "@/lib/qr-individual";
import { generateBibNumberHybrid } from "@/lib/bib-generator";
import { sendPaymentConfirmationEmailGmailFirst } from "@/lib/email-service-gmail-first";

/**
 * Generate BIB number for manual confirmation
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

  const basePrefix = distance.bibPrefix;
  const MAX_PER_PREFIX = 999;

  // ✅ CASE 1: Numeric prefix (17, 57) → Auto increment
  if (/^\d+$/.test(basePrefix)) {
    const prefixIncrement = Math.floor(paidCount / MAX_PER_PREFIX);
    const numberInCurrentPrefix = (paidCount % MAX_PER_PREFIX) + 1;
    const numericPrefix = parseInt(basePrefix) + prefixIncrement;
    const finalPrefix = String(numericPrefix);
    const bibNumber = `${finalPrefix}${String(numberInCurrentPrefix).padStart(3, "0")}`;

    console.log(`📊 BIB (Numeric Prefix):
    - Base: ${basePrefix} → Current: ${finalPrefix}
    - Paid: ${paidCount} → BIB: ${bibNumber}
    `);

    return bibNumber;
  }

  // ✅ CASE 2: Alphanumeric prefix (5K, 10K) → Fixed range
  if (paidCount >= MAX_PER_PREFIX) {
    throw new Error(
      `❌ Đã hết BIB cho cự ly ${distance.name} (prefix: ${basePrefix}). ` +
        `Tối đa ${MAX_PER_PREFIX} VĐV. ` +
        `Hiện tại: ${paidCount} VĐV đã thanh toán.`,
    );
  }

  const bibNumber = `${basePrefix}${String(paidCount + 1).padStart(3, "0")}`;

  console.log(`📊 BIB (Alpha Prefix):
  - Prefix: ${basePrefix}
  - Paid: ${paidCount}/${MAX_PER_PREFIX}
  - BIB: ${bibNumber}
  `);

  return bibNumber;
}

/**
 * Admin manually confirm payment (for offline payment events)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notes } = await req.json();
    const registrationId = (await context.params).id;

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
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Check if already paid
    if (registration.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
    }

    console.log(
      "📝 Manual payment confirmation for registration:",
      registrationId,
    );
    console.log("📝 registration.distanceId:", registration.distanceId);

    // Generate BIB number
    const bibNumber = await generateBibNumber(
      registrationId,
      registration.distanceId,
    );

    console.log(`✅ BIB generated: ${bibNumber}`);

    // ✅ Generate check-in QR code INLINE (no ImgBB upload)
    console.log("🔄 Generating QR code inline...");
    let qrCode = "";
    try {
      qrCode = await generateIndividualQR(
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
      console.log("✅ QR code generated successfully");
    } catch (qrError: any) {
      console.error("❌ QR generation failed:", qrError.message);
      // Continue without QR - email will show fallback
    }

    // ✅ Update registration - NO qrCheckinUrl saved to DB
    const updatedRegistration = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.registration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: "PAID",
            bibNumber: bibNumber,
            // ❌ NO qrCheckinUrl - QR not saved to DB
            paymentDate: new Date(),
            notes: notes || "Xác nhận thủ công bởi admin",
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
            amount: registration.totalAmount,
            status: "PAID",
            paymentMethod: "manual_confirmation",
          },
        });

        return updated;
      },
    );

    console.log("✅ Registration updated to PAID");

    // ✅ Send email with inline QR
    try {
      console.log("📧 Sending confirmation email...");

      await sendPaymentConfirmationEmailGmailFirst({
        registration: {
          ...updatedRegistration,
          qrCode, // ✅ Pass QR inline (not from DB)
        },
        event: registration.event,
      });

      console.log("✅ Email sent successfully");
    } catch (emailError: any) {
      console.error("❌ Failed to send confirmation email:", emailError);

      // Log email failure but don't fail the payment confirmation
      await prisma.emailLog.create({
        data: {
          registrationId: registrationId,
          emailType: "PAYMENT_CONFIRMED",
          subject: `Thanh toán thành công - Số BIB ${bibNumber}`,
          status: "FAILED",
          errorMessage: emailError.message || "Unknown error",
          recipientEmail: registration.email,
          emailProvider: "gmail_first",
        },
      });

      console.warn(`⚠️ Payment confirmed but email failed for ${bibNumber}`);
    }

    return NextResponse.json({
      success: true,
      bibNumber: bibNumber,
      registration: updatedRegistration,
    });
  } catch (error: any) {
    console.error("❌ Manual confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 },
    );
  }
}

/**
 * Admin manually reject/cancel payment
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const registrationId = (await context.params).id;

    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Update to failed status
    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: "PENDING",
        notes: `Hủy thanh toán bởi admin - ${new Date().toLocaleString("vi-VN")}`,
        bibNumber: null,
        qrCheckinUrl: null,
        paymentDate: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment cancelled",
    });
  } catch (error) {
    console.error("Cancel payment error:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 },
    );
  }
}
