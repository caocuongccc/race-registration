// app/api/events/[slug]/order-shirt/route.ts
// API endpoint for standalone shirt orders (no BIB)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentQR } from "@/lib/imgbb";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const body = await req.json();
    const eventSlug = (await context.params).slug;

    // Validate required fields
    const { fullName, email, phone, items, address, city, notes } = body;

    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin liên hệ" },
        { status: 400 },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn ít nhất 1 áo" },
        { status: 400 },
      );
    }

    // Get event
    const event = await prisma.event.findFirst({
      where: { slug: eventSlug },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Sự kiện không tồn tại" },
        { status: 404 },
      );
    }

    // Validate shirts and calculate total
    let totalAmount = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const shirt = await prisma.eventShirt.findUnique({
        where: { id: item.shirtId },
      });

      if (!shirt || !shirt.isAvailable) {
        return NextResponse.json(
          { error: `Áo ${item.shirtId} không khả dụng` },
          { status: 400 },
        );
      }

      // Check stock
      const remaining = shirt.stockQuantity - shirt.soldQuantity;
      if (remaining < item.quantity) {
        return NextResponse.json(
          { error: `Áo size ${shirt.size} chỉ còn ${remaining} cái` },
          { status: 400 },
        );
      }

      const itemTotal = (shirt.standalonePrice || shirt.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        shirtId: item.shirtId,
        quantity: item.quantity,
        unitPrice: shirt.standalonePrice || shirt.price,
        totalPrice: itemTotal,
      });
    }

    // Create order with buyer information
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.shirtOrder.create({
        data: {
          eventId: event.id,
          orderType: "STANDALONE",
          totalAmount,
          paymentStatus: "PENDING",

          // ✅ Buyer information
          fullName,
          email,
          phone,
          address: address || null,
          city: city || null,
          notes: notes || null,

          items: {
            create: validatedItems,
          },
        },
        include: {
          items: {
            include: {
              shirt: true,
            },
          },
        },
      });

      // Update shirt sold quantity
      for (const item of validatedItems) {
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

    console.log(`✅ Shirt order created: ${order.id} for ${fullName}`);

    // Generate payment QR
    let qrPaymentUrl: string | null = null;
    try {
      qrPaymentUrl = await generatePaymentQR(`SHIRT-${order.id}`, totalAmount);
    } catch (qrError) {
      console.warn("⚠️ QR generation failed:", qrError);
    }

    // TODO: Send confirmation email
    // await sendShirtOrderConfirmationEmail({ order, event });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        qrPaymentUrl,
      },
      message: "Đặt hàng thành công! Vui lòng thanh toán để hoàn tất.",
    });
  } catch (error) {
    console.error("❌ Shirt order error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xử lý đơn hàng" },
      { status: 500 },
    );
  }
}
