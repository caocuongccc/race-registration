// app/api/registrations/route.ts - CORRECT SEPAY FLOW
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRegistrationPendingEmailGmailFirst } from "@/lib/email-service-gmail-first";
import { createSepayPayment } from "@/lib/sepay-service";
import { generatePaymentQR } from "@/lib/imgbb"; // Fallback QR generator

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      distanceId,
      shirtId,
      fullName,
      bibName,
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
        { status: 400 },
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
        { status: 404 },
      );
    }

    // Check if registration is allowed
    if (!event.allowRegistration) {
      return NextResponse.json(
        { error: "Sự kiện này đã đóng đăng ký hoặc chưa mở đăng ký" },
        { status: 403 },
      );
    }

    // Check distance
    const distance = event.distances.find((d) => d.id === distanceId);
    if (!distance || !distance.isAvailable) {
      return NextResponse.json(
        { error: "Cự ly không khả dụng" },
        { status: 400 },
      );
    }

    // Check distance capacity
    if (
      distance.maxParticipants &&
      distance.currentParticipants >= distance.maxParticipants
    ) {
      return NextResponse.json(
        { error: "Cự ly đã đủ số lượng" },
        { status: 400 },
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
          shirtId: body.shirtId || null,

          fullName: body.fullName,
          bibName: body.bibName || body.fullName,
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

    console.log(`✅ Registration created: ${registration.id}`);

    // ============================================
    // CHECK requireOnlinePayment
    // ============================================
    const requireOnlinePayment = event.requireOnlinePayment;

    console.log(`💳 requireOnlinePayment: ${requireOnlinePayment}`);

    let qrPaymentUrl: string | null = null;
    let paymentInfo: any = null;

    if (requireOnlinePayment) {
      // ============================================
      // SEPAY QR PAYMENT FLOW
      // ============================================
      console.log("📱 Creating SePay QR payment...");
      // ============================================
      // CÁCH 1: Lấy bank info từ Event fields
      // ============================================
      const eventBankAccount =
        event.bankAccount && event.bankCode
          ? {
              accountNumber: event.bankAccount,
              bankCode: event.bankCode,
              accountName: event.bankHolder || "",
            }
          : null;

      console.log("💳 Bank account:", {
        isEventSpecific: !!eventBankAccount,
        bank: eventBankAccount?.bankCode || "DEFAULT",
      });
      const sepayResult = await createSepayPayment(
        registration.id, // Use registration ID as order code
        totalAmount,
        eventBankAccount,
      );

      if (sepayResult.success && sepayResult.qrUrl) {
        qrPaymentUrl = sepayResult.qrUrl;
        paymentInfo = {
          qrUrl: sepayResult.qrUrl,
          accountNumber: sepayResult.accountNumber,
          bankCode: sepayResult.bankCode,
          accountName: sepayResult.accountName,
          transferContent: sepayResult.transferContent,
          amount: totalAmount,
        };

        console.log("✅ SePay QR created:", qrPaymentUrl);
      } else {
        console.error("❌ SePay QR creation failed:", sepayResult.error);

        // Fallback to imgbb QR if SePay fails
        try {
          qrPaymentUrl = await generatePaymentQR(
            registration.id,
            totalAmount,
            // fullName,
            // phone,
          );
          console.log("✅ Fallback QR created");
        } catch (fallbackError) {
          console.error("❌ Fallback QR also failed:", fallbackError);
        }
      }
    } else {
      // ============================================
      // OFFLINE PAYMENT - GENERATE SIMPLE QR
      // ============================================
      console.log("📱 Generating offline payment QR...");

      try {
        qrPaymentUrl = await generatePaymentQR(
          registration.id,
          totalAmount,
          // fullName,
          // phone,
        );
        console.log("✅ Offline QR created");
      } catch (qrError) {
        console.error("⚠️ QR generation failed:", qrError);
        // Continue without QR - not critical
      }
    }

    // Update registration with QR URL
    if (qrPaymentUrl) {
      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          qrPaymentUrl: qrPaymentUrl,
        },
      });
    }

    // Send notification email
    try {
      await sendRegistrationPendingEmailGmailFirst({
        registration: {
          ...registration,
          qrPaymentUrl: qrPaymentUrl,
        },
        event,
      });

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

      console.log("✅ Email sent");
    } catch (emailError: any) {
      console.error("⚠️ Email sending error:", emailError);

      await prisma.emailLog.create({
        data: {
          registrationId: registration.id,
          emailType: "REGISTRATION_PENDING",
          subject: `Xác nhận đăng ký - ${event.name}`,
          status: "FAILED",
          errorMessage: emailError.message || "Unknown error",
          recipientEmail: registration.email,
          emailProvider: "GMAIL_FIRST",
        },
      });
    }

    // ============================================
    // RETURN RESPONSE
    // ============================================
    return NextResponse.json({
      success: true,
      requireOnlinePayment,
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        email: registration.email,
        totalAmount: registration.totalAmount,
        qrPaymentUrl: qrPaymentUrl,
        paymentInfo: requireOnlinePayment ? paymentInfo : null,
      },
      message: requireOnlinePayment
        ? "Đăng ký thành công! Vui lòng quét mã QR để thanh toán."
        : "Đăng ký thành công! Vui lòng kiểm tra email để biết hướng dẫn thanh toán.",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi xử lý đăng ký" },
      { status: 500 },
    );
  }
}
