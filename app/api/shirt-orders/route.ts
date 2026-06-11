import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentQR } from "@/lib/imgbb";
import { sendEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { ShirtOrderPendingEmail } from "@/emails/shirt-order-pending";
import { getEventBankAccount } from "@/lib/bank-account-service";
import { buildShirtOrderTransferContent } from "@/lib/payment-content";

function buildManualShirtOrderTransferContent(
  phone: string | undefined,
  orderId: string,
): string {
  const normalizedPhone = phone?.replace(/\D/g, "") || "AO";
  return `AO ${normalizedPhone} ${orderId.slice(-6).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      registrationId,
      orderType = "STANDALONE",
      items,
      customerInfo,
    } = body;

    if (!eventId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (orderType === "STANDALONE" && !customerInfo) {
      return NextResponse.json(
        { error: "Customer info required for standalone orders" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { distances: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const shirt = await prisma.eventShirt.findUnique({
        where: { id: item.shirtId },
      });

      if (!shirt) {
        return NextResponse.json(
          { error: `Shirt ${item.shirtId} not found` },
          { status: 404 },
        );
      }

      if (shirt.soldQuantity + item.quantity > shirt.stockQuantity) {
        return NextResponse.json(
          { error: `Insufficient stock for size ${shirt.size}` },
          { status: 400 },
        );
      }

      const unitPrice =
        orderType === "STANDALONE"
          ? shirt.standalonePrice ?? shirt.price
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

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.shirtOrder.create({
        data: {
          eventId,
          registrationId: registrationId || null,
          orderType,
          totalAmount,
          paymentStatus: "PENDING",
          email: customerInfo?.email || null,
          fullName: customerInfo?.fullName || null,
          phone: customerInfo?.phone || null,
          address: customerInfo?.address || null,
          city: customerInfo?.city || null,
          notes: customerInfo?.notes || null,
        },
      });

      await tx.shirtOrderItem.createMany({
        data: orderItems.map((item) => ({
          orderId: newOrder.id,
          ...item,
        })),
      });

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

    const eventBankAccount = await getEventBankAccount(eventId);
    const transferContent = event.requireOnlinePayment
      ? buildShirtOrderTransferContent(order.id, eventBankAccount?.bankCode)
      : buildManualShirtOrderTransferContent(customerInfo?.phone, order.id);
    const emailBankInfo = eventBankAccount
      ? {
          bankName: eventBankAccount.bankName || eventBankAccount.bankCode,
          accountNumber: eventBankAccount.accountNumber,
          accountHolder: eventBankAccount.accountName,
          bankCode: eventBankAccount.bankCode,
        }
      : null;
    const qrPaymentUrl = await generatePaymentQR(
      transferContent,
      totalAmount,
      eventBankAccount,
    );

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

      if (customerInfo?.email && fullOrder) {
        const result = await sendEmailGmailFirst({
          to: customerInfo.email,
          subject: `Xac nhan don hang ao - ${event.name}`,
          react: ShirtOrderPendingEmail({
            order: fullOrder,
            event: fullOrder.event,
            qrPaymentUrl,
            bankInfo: emailBankInfo,
            transferContent,
            requireOnlinePayment: event.requireOnlinePayment,
          }),
          fromName: event.name || process.env.FROM_NAME,
          fromEmail: process.env.FROM_EMAIL,
        });

        if (registrationId) {
          await prisma.emailLog.create({
            data: {
              registrationId,
              recipientEmail: customerInfo.email,
              emailType: "CUSTOM",
              subject: `Xac nhan don hang ao - ${event.name}`,
              status: result.success ? "SENT" : "FAILED",
              errorMessage: result.error,
              emailProvider: result.provider,
            },
          });
        }

        console.log(`Order email sent via ${result.provider.toUpperCase()}`);
      }
    } catch (emailError) {
      console.error("Failed to send order email:", emailError);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        transferContent,
      },
      requireOnlinePayment: event.requireOnlinePayment,
      paymentMode: event.requireOnlinePayment ? "ONLINE" : "MANUAL",
      bankInfo: emailBankInfo,
      qrPaymentUrl,
    });
  } catch (error) {
    console.error("Create shirt order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
