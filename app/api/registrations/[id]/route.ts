// app/api/registrations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        qrPaymentUrl: registration.qrPaymentUrl,
        qrCheckinUrl: registration.qrCheckinUrl,

        distance: registration.distance,
        event: registration.event,

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
