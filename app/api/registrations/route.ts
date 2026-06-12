// app/api/registrations/route.ts - CORRECT SEPAY FLOW
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendPaymentConfirmationEmailGmailFirst,
  sendRegistrationPendingEmailGmailFirst,
} from "@/lib/email-service-gmail-first";
import { createSepayPayment } from "@/lib/sepay-service";
import { buildRegistrationTransferContent } from "@/lib/payment-content";
import { generatePaymentQR } from "@/lib/imgbb"; // Fallback QR generator
import { getRequiredEventBankAccount } from "@/lib/bank-account-service";
import { getEventBankAccount } from "@/lib/bank-account-service"; // ✅ Per-event bank account with decryption
import { generateBibNumberHybrid } from "@/lib/bib-generator";
import { generateIndividualQR } from "@/lib/qr-individual";

const FINISHER_SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const FINISHER_SHIRT_CATEGORIES = ["MALE", "FEMALE", "KID"];
const FINISHER_SHIRT_TYPES = ["SHORT_SLEEVE", "TANK_TOP"];

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
      waiverAccepted,
      bloodType,
      shirtCategory,
      shirtType,
      shirtSize,
      finisherShirtCategory,
      finisherShirtType,
      finisherShirtSize,
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

    if (event.requireWaiver && !waiverAccepted) {
      return NextResponse.json(
        { error: "Vui lòng xác nhận miễn trừ trách nhiệm" },
        { status: 400 },
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

    if (distance.requiresFinisherShirt) {
      if (!finisherShirtCategory || !finisherShirtType || !finisherShirtSize) {
        return NextResponse.json(
          { error: "Vui long chon loai, kieu va size ao finish cho cu ly nay" },
          { status: 400 },
        );
      }

      if (!FINISHER_SHIRT_CATEGORIES.includes(finisherShirtCategory)) {
        return NextResponse.json(
          { error: "Loai ao finish khong hop le" },
          { status: 400 },
        );
      }

      if (!FINISHER_SHIRT_TYPES.includes(finisherShirtType)) {
        return NextResponse.json(
          { error: "Kieu ao finish khong hop le" },
          { status: 400 },
        );
      }

      if (!FINISHER_SHIRT_SIZES.includes(finisherShirtSize)) {
        return NextResponse.json(
          { error: "Size ao finish khong hop le" },
          { status: 400 },
        );
      }
    }

    const isRacekitShirtIncluded = event.distances.some(
      (d) => d.requiresFinisherShirt,
    );
    const racekitShirtOptedOut =
      !event.requiresShirtPurchase &&
      !isRacekitShirtIncluded &&
      shirtCategory === "NONE";

    // Calculate fees
    const raceFee = distance.price;
    let shirtFee = 0;

    if (event.hasShirt && !racekitShirtOptedOut && !shirtId) {
      return NextResponse.json(
        { error: "Vui lòng chọn size áo racekit" },
        { status: 400 },
      );
    }

    if (shirtId) {
      const shirt = await prisma.eventShirt.findFirst({
        where: { id: shirtId, eventId },
      });
      if (!shirt) {
        return NextResponse.json({ error: "Áo đã hết hàng" }, { status: 404 });
      }
      if (!shirt.isAvailable || shirt.soldQuantity >= shirt.stockQuantity) {
        return NextResponse.json({ error: "Ao da het hang" }, { status: 400 });
      }
      shirtFee = isRacekitShirtIncluded ? 0 : shirt.price;
    }

    const totalAmount = raceFee + shirtFee;
    const isFreeRegistration = totalAmount <= 0;
    const bankAccountInfo = isFreeRegistration
      ? null
      : event.requireOnlinePayment
        ? await getRequiredEventBankAccount(eventId)
        : await getEventBankAccount(eventId);

    if (!isFreeRegistration && event.requireOnlinePayment && !bankAccountInfo) {
      return NextResponse.json(
        {
          error:
            "Sự kiện chưa cấu hình tài khoản nhận thanh toán. Vui lòng liên hệ ban tổ chức.",
          code: "EVENT_BANK_ACCOUNT_REQUIRED",
        },
        { status: 400 },
      );
    }

    const newRegistration = await prisma.registration.create({
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
        waiverAccepted: event.requireWaiver ? true : false,
        waiverAcceptedAt: event.requireWaiver ? new Date() : null,
        waiverVersion: event.requireWaiver
          ? event.waiverVersion || "default"
          : null,
        bloodType: body.bloodType || null,

        shirtCategory: racekitShirtOptedOut ? null : body.shirtCategory || null,
        shirtType: racekitShirtOptedOut ? null : body.shirtType || null,
        shirtSize: racekitShirtOptedOut ? null : body.shirtSize || null,
        finisherShirtSize: distance.requiresFinisherShirt
          ? body.finisherShirtSize
          : null,

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

    // Get decrypted bank account once so QR and manual transfer info match.
    const eventBankAccount = bankAccountInfo
      ? {
          accountNumber: bankAccountInfo.accountNumber,
          bankCode: bankAccountInfo.bankCode,
          accountName: bankAccountInfo.accountName,
        }
      : null;
    const emailBankInfo = bankAccountInfo
      ? {
          bankName: bankAccountInfo.bankName || bankAccountInfo.bankCode,
          accountNumber: bankAccountInfo.accountNumber,
          accountHolder: bankAccountInfo.accountName,
        }
      : {
          bankName: process.env.SEPAY_BANK_NAME || "",
          accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || "",
          accountHolder: process.env.SEPAY_BANK_HOLDER || "",
        };

    const registrationNumberRows = await prisma.$queryRaw<
      { registration_number: number }[]
    >`
      SELECT "registration_number"
      FROM "registrations"
      WHERE "id" = ${newRegistration.id}
      LIMIT 1
    `;
    const registrationNumber = registrationNumberRows[0]?.registration_number;
    if (distance.requiresFinisherShirt) {
      await prisma.$executeRaw`
        UPDATE "registrations"
        SET
          "finisher_shirt_category" = ${body.finisherShirtCategory}::"ShirtCategory",
          "finisher_shirt_type" = ${body.finisherShirtType}::"ShirtType"
        WHERE "id" = ${newRegistration.id}
      `;
    }

    const shortCode = buildRegistrationTransferContent(
      newRegistration.phone,
      newRegistration.id,
      eventBankAccount?.bankCode || process.env.SEPAY_BANK_CODE,
    );
    console.log("💬 Transfer content built:", {
      registrationId: newRegistration.id,
      bankCode: eventBankAccount?.bankCode || process.env.SEPAY_BANK_CODE,
      shortCode,
    });

    await prisma.$executeRaw`
      UPDATE "registrations"
      SET "short_code" = ${shortCode}
      WHERE "id" = ${newRegistration.id}
    `;

    await prisma.distance.update({
      where: { id: body.distanceId },
      data: {
        currentParticipants: {
          increment: 1,
        },
      },
    });

    if (body.shirtId) {
      await prisma.eventShirt.update({
        where: { id: body.shirtId },
        data: {
          soldQuantity: {
            increment: 1,
          },
        },
      });
    }

    const registration = {
      ...newRegistration,
      registrationNumber,
      shortCode,
      finisherShirtCategory: distance.requiresFinisherShirt
        ? body.finisherShirtCategory
        : null,
      finisherShirtType: distance.requiresFinisherShirt
        ? body.finisherShirtType
        : null,
    };

    console.log(`✅ Registration created: ${registration.id}`);

    if (isFreeRegistration) {
      console.log("🎫 Free registration detected. Marking as PAID and generating BIB...");

      const bibNumber = await generateBibNumberHybrid(
        registration.id,
        registration.distanceId,
        registration.distanceGoalId,
      );

      let qrCode = "";
      try {
        qrCode = await generateIndividualQR(
          registration.id,
          bibNumber,
          bibNumber,
          registration.fullName,
          registration.gender,
          registration.dob,
          registration.phone,
          registration.shirtCategory,
          registration.shirtType,
          registration.shirtSize,
        );
      } catch (qrError: any) {
        console.error("⚠️ Free registration QR generation failed:", qrError);
      }

      const paidRegistration = await prisma.$transaction(async (tx) => {
        const updated = await tx.registration.update({
          where: { id: registration.id },
          data: {
            paymentStatus: "PAID",
            paymentDate: new Date(),
            bibNumber,
            notes: "Tự động xác nhận vì tổng tiền đăng ký bằng 0",
          },
          include: {
            distance: true,
            shirt: true,
            event: true,
          },
        });

        await tx.payment.create({
          data: {
            registrationId: registration.id,
            amount: 0,
            status: "PAID",
            paymentMethod: "free_registration",
          },
        });

        return updated;
      });

      try {
        await sendPaymentConfirmationEmailGmailFirst({
          registration: {
            ...paidRegistration,
          },
          event: {
            ...event,
            sendBibImmediately: true,
          },
          qrCode,
        });
      } catch (emailError: any) {
        console.error("⚠️ Free registration confirmation email failed:", emailError);

        await prisma.emailLog.create({
          data: {
            registrationId: registration.id,
            emailType: "PAYMENT_CONFIRMED",
            subject: `Đăng ký thành công - Số BIB ${bibNumber}`,
            status: "FAILED",
            errorMessage: emailError.message || "Unknown error",
            recipientEmail: registration.email,
            emailProvider: "GMAIL_FIRST",
            bibNumber,
          },
        });
      }

      return NextResponse.json({
        success: true,
        freeRegistration: true,
        requireOnlinePayment: false,
        registration: {
          id: paidRegistration.id,
          registrationNumber,
          fullName: paidRegistration.fullName,
          email: paidRegistration.email,
          totalAmount: paidRegistration.totalAmount,
          paymentStatus: paidRegistration.paymentStatus,
          bibNumber: paidRegistration.bibNumber,
          shortCode,
          qrPaymentUrl: null,
          paymentInfo: null,
        },
        message: "Đăng ký thành công! Hệ thống đã cấp số BIB cho bạn.",
      });
    }

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

      const sepayResult = await createSepayPayment(
        registration.id,
        totalAmount,
        eventBankAccount,
        registration.shortCode,
      );

      if (sepayResult.success && sepayResult.qrUrl) {
        qrPaymentUrl = sepayResult.qrUrl;
        paymentInfo = {
          qrUrl: sepayResult.qrUrl,
          accountNumber: sepayResult.accountNumber,
          bankCode: sepayResult.bankCode,
          accountName: sepayResult.accountName,
          // Nội dung CK dễ đọc: SĐT_timestamp (cho người gạch nợ thủ công)
          transferContent: registration.shortCode,
          amount: totalAmount,
        };

        console.log("✅ SePay QR created:", qrPaymentUrl);
      } else {
        console.error("❌ SePay QR creation failed:", sepayResult.error);

        // Fallback to imgbb QR if SePay fails
        try {
          qrPaymentUrl = await generatePaymentQR(
            registration.shortCode,
            totalAmount,
            eventBankAccount,
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
          registration.shortCode,
          totalAmount,
          eventBankAccount,
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
        bankInfo: emailBankInfo,
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
        registrationNumber: registration.registrationNumber,
        fullName: registration.fullName,
        email: registration.email,
        totalAmount: registration.totalAmount,
        qrPaymentUrl: qrPaymentUrl,
        shortCode: registration.shortCode,
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
