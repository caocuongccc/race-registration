// app/api/admin/registrations/[id]/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { generateCheckinQR } from "@/lib/google-drive";
import { generateCheckinQR } from "@/lib/imgbb";
import { sendPaymentConfirmedEmail } from "@/lib/email";

/**
 * Generate BIB number for manual confirmation
 */
async function generateBibNumber(
  registrationId: string,
  distanceId: string
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
 * Admin manually confirm payment (for offline payment events)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notes } = await req.json();
    console.log("Manual confirmation notes:", notes);
    const registrationId = (await context.params).id;
    console.log("Manual confirming payment for registration:", registrationId);
    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        distance: true,
        event: true,
        shirt: true,
      },
    });
    console.log("Registration data:", registration);
    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Check if already paid
    if (registration.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
    }

    // Generate BIB number
    const bibNumber = await generateBibNumber(
      registrationId,
      registration.distanceId
    );
    console.log("Generated BIB number:", bibNumber);
    // Generate check-in QR code
    const qrCheckinUrl = await generateCheckinQR(registrationId, bibNumber);
    console.log("Generated check-in QR URL:", qrCheckinUrl);
    // Update registration
    const updatedRegistration = await prisma.$transaction(async (tx) => {
      const updated = await tx.registration.update({
        where: { id: registrationId },
        data: {
          paymentStatus: "PAID",
          bibNumber: bibNumber,
          qrCheckinUrl: qrCheckinUrl,
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
    });

    // Send confirmation email
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
        },
      });

      console.log(`✅ Manual confirmation email sent for ${bibNumber}`);
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);

      await prisma.emailLog.create({
        data: {
          registrationId: registrationId,
          emailType: "PAYMENT_CONFIRMED",
          subject: `Thanh toán thành công - Số BIB ${bibNumber}`,
          status: "FAILED",
          errorMessage: (emailError as Error).message,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bibNumber: bibNumber,
      registration: updatedRegistration,
    });
  } catch (error) {
    console.error("Manual confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}

/**
 * Admin manually reject/cancel payment
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
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
        { status: 404 }
      );
    }

    // Update to failed status
    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: "FAILED",
        notes: "Hủy bởi admin",
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
      { status: 500 }
    );
  }
}
