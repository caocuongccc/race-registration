// ============================================
// UPDATED: Email Integration in confirm-payment
// ============================================
// app/api/admin/shirt-orders/[id]/confirm-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { ShirtOrderConfirmedEmail } from "@/emails/shirt-order-confirmed";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = (await context.params).id;

    // Get order
    const order = await prisma.shirtOrder.findUnique({
      where: { id: orderId },
      include: {
        registration: true,
        event: true,
        items: {
          include: {
            shirt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
    }

    // Update order
    await prisma.shirtOrder.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentDate: new Date(),
      },
    });
    console.log("Shirt order payment confirmed:", order);
    // ✅ Send confirmation email
    try {
      if (order.email) {
        const result = await sendEmailGmailFirst({
          to: order.email,
          subject: `Xác nhận đơn hàng áo - ${order.event.name}`,
          react: ShirtOrderConfirmedEmail({ order, event: order.event }),
          fromName: order.event.name || process.env.FROM_NAME,
          fromEmail: process.env.FROM_EMAIL,
        });

        // Log email
        await prisma.emailLog.create({
          data: {
            registrationId: order.registrationId!,
            recipientEmail: order.email,
            emailType: "CUSTOM",
            subject: `Xác nhận đơn hàng áo - ${order.event.name}`,
            status: result.success ? "SENT" : "FAILED",
            errorMessage: result.error,
            emailProvider: result.provider,
          },
        });

        console.log(
          `✅ Shirt order email sent via ${result.provider.toUpperCase()}`
        );
      }
    } catch (emailError: any) {
      console.error("❌ Failed to send email:", emailError);
      // Don't fail the payment confirmation if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Payment confirmed and email sent",
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
