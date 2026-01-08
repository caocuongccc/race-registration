// app/api/registrations/route.ts - REMOVED GOALS
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentQR } from "@/lib/imgbb";
import { sendRegistrationPendingEmailGmailFirst } from "@/lib/email-service-gmail-first";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      distanceId,
      // distanceGoalId, // REMOVED
      shirtId,
      fullName,
      email,
      phone,
      dob,
      gender,
      idCard,
      address,
      city,
      emergencyContactName,
      emergencyContactPhone,
      healthDeclaration,
      bloodType,
      shirtCategory,
      shirtType,
      shirtSize,
      utmSource,
    } = body;

    // Validate required fields
    if (
      !eventId ||
      !distanceId ||
      !fullName ||
      !email ||
      !phone ||
      !dob ||
      !gender
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check event exists and is published
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
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

    // Check if registration is allowed
    if (!event.allowRegistration) {
      return NextResponse.json(
        { error: "Sự kiện này đã đóng đăng ký hoặc chưa mở đăng ký" },
        { status: 403 }
      );
    }

    // Check distance
    const distance = event.distances.find((d) => d.id === distanceId);
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

    if (shirtId) {
      const shirt = await prisma.eventShirt.findUnique({
        where: { id: shirtId },
      });
      if (!shirt) {
        return NextResponse.json({ error: "Áo đã hết hàng" }, { status: 404 });
      }
      shirtFee = shirt.price;
    }

    const totalAmount = raceFee + shirtFee;

    // Create registration in transaction
    const registration = await prisma.$transaction(async (tx) => {
      const newRegistration = await tx.registration.create({
        data: {
          eventId: body.eventId,
          distanceId: body.distanceId,
          // distanceGoalId: null, // REMOVED

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
          shirtSize: body.shirtSize || null,

          raceFee: raceFee,
          shirtFee: shirtFee,
          totalAmount: totalAmount,
          paymentStatus: "PENDING",
          registrationSource: "ONLINE",

          utmSource: body.utmSource || null,
          confirmationToken: Math.random().toString(36).substring(7),
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

    const description = [
      registration.phone,
      registration.shirtCategory,
      registration.shirtSize,
    ]
      .filter(Boolean)
      .join(" ");

    // Generate Payment QR Code
    const qrPaymentUrl = await generatePaymentQR(description, totalAmount);

    // Update registration with QR URL
    await prisma.registration.update({
      where: { id: registration.id },
      data: { qrPaymentUrl },
    });

    // Send email
    let emailError: any = null;

    try {
      await sendRegistrationPendingEmailGmailFirst({
        registration: {
          ...registration,
          qrPaymentUrl,
        },
        event,
      });

      // Log email success
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "SENT",
          recipientEmail: registration.email,
          emailProvider: "GMAIL_FIRST",
        },
      });
    } catch (error: any) {
      emailError = error;
      console.error("❌ Email sending error:", error);

      // Log email failure but don't fail the registration
      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "FAILED",
          errorMessage: error.message || "Unknown error",
          recipientEmail: registration.email,
          emailProvider: "GMAIL_FIRST",
        },
      });

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
