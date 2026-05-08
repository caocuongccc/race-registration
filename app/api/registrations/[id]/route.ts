// app/api/registrations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBankAccount } from "@/lib/bank-account-service";
import { buildRegistrationTransferContent } from "@/lib/payment-content";

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

    const bankAccount = await getEventBankAccount(registration.eventId);
    const isEncryptedValue = (value?: string | null) =>
      Boolean(value && value.split(":").length === 3);
    const registrationNumberRows = await prisma.$queryRaw<
      { registration_number: number }[]
    >`
      SELECT "registration_number"
      FROM "registrations"
      WHERE "id" = ${registration.id}
      LIMIT 1
    `;
    const registrationNumber =
      registrationNumberRows[0]?.registration_number ?? null;
    const transferContent =
      registration.shortCode ||
      buildRegistrationTransferContent(registration.phone, registration.id);
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
