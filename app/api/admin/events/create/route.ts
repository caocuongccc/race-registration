// app/api/admin/events/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptBankAccount } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if slug already exists
    const existingEvent = await prisma.event.findUnique({
      where: { slug: body.slug },
    });

    if (existingEvent) {
      return NextResponse.json(
        { error: "Slug này đã được sử dụng" },
        { status: 400 }
      );
    }

    const bankData =
      body.bankAccount && body.bankCode
        ? encryptBankAccount({
            accountNumber: body.bankAccount,
            bankCode: body.bankCode,
            accountName: body.bankHolder || "",
            bankName: body.bankName || "",
          })
        : null;

    // Create event
    const event = await prisma.event.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        date: new Date(body.date),
        location: body.location,
        address: body.address,
        city: body.city,
        status: body.status,
        isPublished: body.isPublished,
        allowRegistration: body.allowRegistration,
        hasShirt: body.hasShirt,
        allowStandaloneShirtSale: body.allowStandaloneShirtSale ?? true,
        requireOnlinePayment: body.requireOnlinePayment,
        sendBibImmediately: body.sendBibImmediately,
        bankName: bankData?.bankNameEncrypted || null,
        bankAccount: bankData?.accountNumberEncrypted || null,
        bankHolder: bankData?.accountNameEncrypted || null,
        bankCode: bankData?.bankCodeEncrypted || null,
        hotline: body.hotline,
        emailSupport: body.emailSupport,
        facebookUrl: body.facebookUrl,
        racePackLocation: body.racePackLocation,
        racePackTime: body.racePackTime,
        createdById: session.user.id,
      },
    });

    // Create default email config
    await prisma.emailConfig.create({
      data: {
        eventId: event.id,
        fromName: `Ban Tổ Chức ${body.name}`,
        fromEmail:
          body.emailSupport || process.env.FROM_EMAIL || "noreply@example.com",
        replyTo: body.emailSupport,
        subjectRegistrationPending: `Xác nhận đăng ký - ${body.name}`,
        subjectPaymentConfirmed: "Thanh toán thành công - Số BIB {{bibNumber}}",
        subjectRacePackInfo: `Thông tin quan trọng - ${body.name}`,
        subjectReminder: `Nhắc nhở - ${body.name}`,
        bodyRegistrationPending: "Cảm ơn bạn đã đăng ký {{eventName}}",
        bodyPaymentConfirmed: "Thanh toán thành công! Số BIB: {{bibNumber}}",
        bodyRacePackInfo: "Thông tin nhận race pack...",
        bodyReminder: "Nhắc nhở về giải {{eventName}}",
        attachQrPayment: true,
        attachQrCheckin: true,
        bodyPaymentReceivedNoBib: "Chúng tôi đã nhận được thanh toán của bạn.",
        subjectPaymentReceivedNoBib: "Xác nhận thanh toán - {{eventName}}",
        bodyBibAnnouncement:
          "Số BIB của bạn là {{bibNumber}}. Hẹn gặp bạn tại sự kiện!",
        subjectBibAnnouncement: "Số BIB của bạn cho {{eventName}}",
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
