// ============================================
// PART 3: API - CREATE SHIRT ORDER
// ============================================
// app/api/shirt-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      registrationId, // NULL for standalone purchase
      orderType, // "WITH_BIB" or "STANDALONE"
      items, // Array of { shirtId, quantity }
    } = body;

    // Validate
    if (!eventId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
          ? shirt.standalonePrice || shirt.price + 50000 // Add 50k if no standalone price set
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

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.shirtOrder.create({
        data: {
          eventId,
          registrationId,
          orderType,
          totalAmount,
          paymentStatus: "PENDING",
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

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
      },
    });
  } catch (error) {
    console.error("Create shirt order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
