// app/api/registrations/route.ts - FIX EMAIL SENDING
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentQR } from "@/lib/imgbb";
import { sendRegistrationPendingEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.eventId || !body.distanceId || !body.fullName || !body.email) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check event exists and is published
    const event = await prisma.event.findFirst({
      where: {
        id: body.eventId,
        isPublished: true,
      },
      include: {
        distances: true,
        shirts: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Sự kiện không tồn tại" },
        { status: 404 }
      );
    }

    // Check distance
    const distance = event.distances.find((d) => d.id === body.distanceId);
    if (!distance || !distance.isAvailable) {
      return NextResponse.json(
        { error: "Cự ly không khả dụng" },
        { status: 400 }
      );
    }

    if (
      distance.maxParticipants &&
      distance.currentParticipants >= distance.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Cự ly đã đủ số lượng" },
        { status: 400 }
      );
    }

    // Calculate fees
    let raceFee = distance.price;
    let shirtFee = 0;
    let shirt: any = null;

    if (body.shirtId) {
      shirt = event.shirts.find((s) => s.id === body.shirtId);
      if (!shirt || !shirt.isAvailable) {
        return NextResponse.json(
          { error: "Áo không khả dụng" },
          { status: 400 }
        );
      }

      if (shirt.soldQuantity >= shirt.stockQuantity) {
        return NextResponse.json({ error: "Áo đã hết hàng" }, { status: 400 });
      }

      shirtFee = shirt.price;
    }

    const totalAmount = raceFee + shirtFee;

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    let isNewUser = false;
    let temporaryPassword = "";

    // Create user account if not exists
    if (!user) {
      const bcrypt = require("bcryptjs");

      // Generate random password
      temporaryPassword =
        Math.random().toString(36).slice(-4).toUpperCase() +
        Math.random().toString(36).slice(-4) +
        "!@" +
        Math.floor(Math.random() * 100);

      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.fullName,
          role: "MEMBER",
        },
      });

      isNewUser = false;
      console.log(`✅ Created user account for ${body.email}`);
    }

    // Create registration in transaction
    const registration = await prisma.$transaction(async (tx) => {
      const newRegistration = await tx.registration.create({
        data: {
          eventId: body.eventId,
          distanceId: body.distanceId,
          shirtId: body.shirtId || null,
          userId: user!.id,

          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          dob: new Date(body.dob),
          gender: body.gender,
          idCard: body.idCard,
          address: body.address || null,
          city: body.city || null,

          emergencyContactName: body.emergencyContactName || null,
          emergencyContactPhone: body.emergencyContactPhone || null,

          healthDeclaration: body.healthDeclaration || false,
          bloodType: body.bloodType || null,

          shirtCategory: body.shirtCategory || null,
          shirtType: body.shirtType || null,
          shirtSize: shirt?.size || null,

          raceFee: raceFee,
          shirtFee: shirtFee,
          totalAmount: totalAmount,
          paymentStatus: "PENDING",

          utmSource: body.utmSource || null,
        },
        include: {
          distance: true,
          shirt: true,
          event: true,
        },
      });

      // Update distance participant count
      await tx.distance.update({
        where: { id: body.distanceId },
        data: {
          currentParticipants: {
            increment: 1,
          },
        },
      });

      // Update shirt sold quantity
      if (body.shirtId) {
        await tx.eventShirt.update({
          where: { id: body.shirtId },
          data: {
            soldQuantity: {
              increment: 1,
            },
          },
        });
      }

      return newRegistration;
    });

    // Generate Payment QR Code
    const qrPaymentUrl = await generatePaymentQR(registration.id, totalAmount);

    // Update registration with QR URL
    await prisma.registration.update({
      where: { id: registration.id },
      data: { qrPaymentUrl },
    });

    // ✅ FIX: Send email with proper error handling
    console.log(`📧 Sending registration email to ${registration.email}...`);
    var emailError = null;
    try {
      await sendRegistrationPendingEmail({
        registration: {
          ...registration,
          qrPaymentUrl,
        },
        event,
        isNewUser,
        temporaryPassword: isNewUser ? temporaryPassword : undefined,
      });

      console.log(`✅ Email sent successfully to ${registration.email}`);

      // Log email success
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "SENT",
        },
      });
    } catch (emailErrors: any) {
      console.error("❌ Email sending error:", emailErrors);
      emailError = emailErrors;
      // Log email failure but don't fail the registration
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "FAILED",
          errorMessage: emailErrors.message || "Unknown error",
        },
      });

      // Show warning to user but still return success
      console.warn(
        `⚠️ Registration created but email failed for ${registration.email}`
      );
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        email: registration.email,
        totalAmount: registration.totalAmount,
        qrPaymentUrl,
      },
      accountInfo: isNewUser
        ? {
            message:
              "Tài khoản đã được tạo. Thông tin đăng nhập đã gửi qua email.",
            email: body.email,
          }
        : null,
      emailWarning: emailError
        ? "Email có thể gửi chậm, vui lòng kiểm tra sau."
        : null,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xử lý đăng ký" },
      { status: 500 }
    );
  }
}
