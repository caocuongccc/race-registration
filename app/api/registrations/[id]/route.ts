// app/api/registrations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getEventBankAccount,
  getRequiredEventBankAccount,
} from "@/lib/bank-account-service";
import {
  buildManualRegistrationTransferContent,
  buildRegistrationTransferContent,
} from "@/lib/payment-content";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const registration = await prisma.registration.findUnique({
      where: {
        id: (await context.params).id,
      },
      include: {
        distance: {
          select: {
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            name: true,
            date: true,
            location: true,
            logoUrl: true,
            bankName: true,
            bankAccount: true,
            bankHolder: true,
            bankCode: true,
            requireOnlinePayment: true,
            registrationServiceOnly: true,
            hotline: true,
            emailSupport: true,
            racePackLocation: true,
            racePackTime: true,
          },
        },
        shirt: {
          select: {
            category: true,
            type: true,
            size: true,
            price: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Không tìm thấy đăng ký" },
        { status: 404 },
      );
    }

    const bankAccount = registration.event.requireOnlinePayment
      ? await getRequiredEventBankAccount(registration.eventId)
      : await getEventBankAccount(registration.eventId);
    const isEncryptedValue = (value?: string | null) =>
      Boolean(value && value.split(":").length === 3);
    const registrationNumber = registration.registrationNumber ?? null;
    const transferContent = registration.event.requireOnlinePayment
      ? registration.shortCode ||
        buildRegistrationTransferContent(
          registration.phone,
          registration.id,
          bankAccount?.bankCode ||
            (isEncryptedValue(registration.event.bankCode)
              ? undefined
              : registration.event.bankCode || undefined),
        )
      : buildManualRegistrationTransferContent(
          registration.phone,
          registrationNumber,
        );
    const event = {
      ...registration.event,
      bankName:
        bankAccount?.bankName ||
        (isEncryptedValue(registration.event.bankName)
          ? ""
          : registration.event.bankName || ""),
      bankAccount:
        bankAccount?.accountNumber ||
        (isEncryptedValue(registration.event.bankAccount)
          ? ""
          : registration.event.bankAccount || ""),
      bankHolder:
        bankAccount?.accountName ||
        (isEncryptedValue(registration.event.bankHolder)
          ? ""
          : registration.event.bankHolder || ""),
    };

    return NextResponse.json({
      registration: {
        id: registration.id,
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        dob: registration.dob,
        gender: registration.gender,

        raceFee: registration.raceFee,
        shirtFee: registration.shirtFee,
        totalAmount: registration.totalAmount,
        paymentStatus: registration.paymentStatus,

        bibNumber: registration.bibNumber,
        registrationNumber,
        shortCode: transferContent,
        qrPaymentUrl: registration.qrPaymentUrl,
        qrCheckinUrl: registration.qrCheckinUrl,

        distance: registration.distance,
        event,

        shirtCategory: registration.shirtCategory,
        shirtType: registration.shirtType,
        shirtSize: registration.shirtSize,
        finisherShirtCategory: registration.finisherShirtCategory,
        finisherShirtType: registration.finisherShirtType,
        finisherShirtSize: registration.finisherShirtSize,

        registrationDate: registration.registrationDate,
        paymentDate: registration.paymentDate,
        bibName: registration.bibName,
        idCard: registration.idCard,
        city: registration.city,
      },
    });
  } catch (error) {
    console.error("Error fetching registration:", error);
    return NextResponse.json({ error: "Đã có lỗi xảy ra" }, { status: 500 });
  }
}
