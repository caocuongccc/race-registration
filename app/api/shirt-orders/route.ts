// ============================================
// PART 3: API - CREATE SHIRT ORDER
// ============================================
// app/api/shirt-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentQR } from "@/lib/qr-generator";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { ShirtOrderPendingEmail } from "@/emails/shirt-order-pending";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      registrationId, // NULL for standalone purchase
      orderType, // "WITH_BIB" or "STANDALONE"
      items, // Array of { shirtId, quantity }
      customerInfo, // ✅ NEW: For standalone orders { fullName, email, phone, address }
    } = body;

    // Validate
    if (!eventId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // For standalone orders, require customer info
    if (orderType === "STANDALONE" && !customerInfo) {
      return NextResponse.json(
        { error: "Customer info required for standalone orders" },
        { status: 400 }
      );
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { distances: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    // Calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const shirt = await prisma.eventShirt.findUnique({
        where: { id: item.shirtId },
      });

      if (!shirt) {
        return NextResponse.json(
          { error: `Shirt ${item.shirtId} not found` },
          { status: 404 }
        );
      }

      // Check stock
      if (shirt.soldQuantity + item.quantity > shirt.stockQuantity) {
        return NextResponse.json(
          { error: `Insufficient stock for size ${shirt.size}` },
          { status: 400 }
        );
      }

      // Use standalonePrice if buying without BIB, otherwise use regular price
      const unitPrice =
        orderType === "STANDALONE"
          ? shirt.standalonePrice // Add 50k if no standalone price set
          : shirt.price;

      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        shirtId: item.shirtId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    // ✅ Create temporary registration for standalone orders
    let finalRegistrationId = registrationId;
    if (orderType === "STANDALONE" && customerInfo) {
      // Create a placeholder registration to store customer info
      const tempRegistration = await prisma.registration.create({
        data: {
          eventId,
          distanceId: event.distances[0]?.id || "", // Use first distance as placeholder
          fullName: customerInfo.fullName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
          dob: new Date("2000-01-01"), // Placeholder
          gender: "MALE", // Placeholder
          raceFee: 0,
          totalAmount: 0,
          paymentStatus: "PENDING",
          registrationSource: "MANUAL",
          notes: `Đặt mua áo riêng - Không có BIB`,
        },
      });

      finalRegistrationId = tempRegistration.id;
    }

    // Generate Payment QR
    const description = `${customerInfo?.phone || "SHIRT"} ${orderType}`;
    const qrPaymentUrl = await generatePaymentQR(description, totalAmount);
    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.shirtOrder.create({
        data: {
          eventId,
          registrationId,
          orderType,
          totalAmount,
          paymentStatus: "PENDING",
          email: customerInfo?.email || null,
        },
      });

      // Create order items
      await tx.shirtOrderItem.createMany({
        data: orderItems.map((item) => ({
          orderId: newOrder.id,
          ...item,
        })),
      });

      // Update shirt quantities
      for (const item of items) {
        await tx.eventShirt.update({
          where: { id: item.shirtId },
          data: {
            soldQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    // ✅ NEW: Send email notification
    try {
      const fullOrder = await prisma.shirtOrder.findUnique({
        where: { id: order.id },
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

      if (customerInfo.email != null) {
        const result = await sendEmailGmailFirst({
          to: customerInfo.email,
          subject: `Xác nhận đơn hàng áo - ${event.name}`,
          react: ShirtOrderPendingEmail({
            order: fullOrder,
            event: fullOrder.event,
            qrPaymentUrl,
          }),
          fromName: event.name || process.env.FROM_NAME,
          fromEmail: process.env.FROM_EMAIL,
        });

        // Log email
        await prisma.emailLog.create({
          data: {
            registrationId: finalRegistrationId,
            recipientEmail: customerInfo.email,
            emailType: "CUSTOM",
            subject: `Xác nhận đơn hàng áo - ${event.name}`,
            status: result.success ? "SENT" : "FAILED",
            errorMessage: result.error,
            emailProvider: result.provider,
          },
        });

        console.log(`✅ Order email sent via ${result.provider.toUpperCase()}`);
      }
    } catch (emailError: any) {
      console.error("❌ Failed to send order email:", emailError);
      // Don't fail the order creation if email fails
    }
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
      },
      qrPaymentUrl,
    });
  } catch (error) {
    console.error("Create shirt order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
