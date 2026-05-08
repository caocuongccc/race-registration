import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const registration = await prisma.registration.findUnique({
      where: { id },
      select: {
        id: true,
        paymentStatus: true,
        bibNumber: true,
        qrCheckinUrl: true,
        paymentDate: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Khong tim thay dang ky" },
        { status: 404 },
      );
    }

    return NextResponse.json({ registration });
  } catch (error) {
    console.error("Error fetching registration status:", error);
    return NextResponse.json({ error: "Da co loi xay ra" }, { status: 500 });
  }
}
