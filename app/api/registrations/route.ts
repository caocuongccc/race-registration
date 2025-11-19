// app/api/registrations/route.ts
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

    // Check distance exists and available
    const distance = event.distances.find((d) => d.id === body.distanceId);
    if (!distance || !distance.isAvailable) {
      return NextResponse.json(
        { error: "Cự ly không khả dụng" },
        { status: 400 }
      );
    }

    // Check distance capacity
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
    let shirt = null;

    if (body.shirtId) {
      shirt = event.shirts.find((s) => s.id === body.shirtId);
      if (!shirt || !shirt.isAvailable) {
        return NextResponse.json(
          { error: "Áo không khả dụng" },
          { status: 400 }
        );
      }

      // Check shirt stock
      if (shirt.soldQuantity >= shirt.stockQuantity) {
        return NextResponse.json({ error: "Áo đã hết hàng" }, { status: 400 });
      }

      shirtFee = shirt.price;
    }

    const totalAmount = raceFee + shirtFee;

    // Check if user already exists with this email
    let user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    // Create user account if not exists
    if (!user) {
      const bcrypt = require("bcryptjs");
      // Generate random password (will be sent via email)
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8).toUpperCase() +
        "!";
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.fullName,
          role: "MEMBER",
        },
      });

      console.log(
        `✅ Created user account for ${body.email} with password: ${randomPassword}`
      );
      // Note: Mật khẩu sẽ được gửi qua email ở bước sau
    }

    // Create registration in transaction
    const registration = await prisma.$transaction(async (tx) => {
      // Create registration
      const newRegistration = await tx.registration.create({
        data: {
          eventId: body.eventId,
          distanceId: body.distanceId,
          shirtId: body.shirtId || null,

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

      // Update shirt sold quantity if applicable
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

    // Generate Payment QR Code (always generate for both online & offline)
    const qrPaymentUrl = await generatePaymentQR(registration.id, totalAmount);

    // Update registration with QR URL
    await prisma.registration.update({
      where: { id: registration.id },
      data: { qrPaymentUrl },
    });

    // Send email with registration info & QR code
    try {
      await sendRegistrationPendingEmail({
        registration: {
          ...registration,
          qrPaymentUrl,
        },
        event,
      });

      // Log email sent
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "SENT",
        },
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Don't fail the registration if email fails
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "FAILED",
          errorMessage: (emailError as Error).message,
        },
      });
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
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xử lý đăng ký" },
      { status: 500 }
    );
  }
}
