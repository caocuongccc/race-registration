// app/api/mobile/registrations/[id]/collect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/mobile/registrations/:id/collect
 * Confirm race pack collection
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const registrationId = params.id;
    const { photoUrl, notes } = await req.json();

    console.log(`📦 Collecting race pack for: ${registrationId}`);

    // Get registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        distance: true,
      },
    });
    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    // Check if already collected
    if (registration.racePackCollected) {
      return NextResponse.json(
        {
          error: "Race pack đã được nhận",
          collectedAt: registration.racePackCollectedAt,
          collectedBy: registration.racePackCollectedBy,
        },
        { status: 400 },
      );
    }

    // Check payment status
    if (registration.paymentStatus !== "PAID") {
      return NextResponse.json(
        {
          error: "Chưa thanh toán",
          paymentStatus: registration.paymentStatus,
        },
        { status: 400 },
      );
    }

    // Update registration
    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        racePackCollected: true,
        racePackCollectedAt: new Date(),
        racePackCollectedBy: session.user.id,
        racePackPhoto: photoUrl || null,
        racePackNotes: notes || null,
      },
      include: {
        distance: true,
        event: true,
        collectedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`✅ Race pack collected for BIB: ${updated.bibNumber}`);

    return NextResponse.json({
      success: true,
      registration: updated,
      message: "Đã xác nhận nhận race pack",
    });
  } catch (error) {
    console.error("❌ Collect race pack error:", error);
    return NextResponse.json(
      { error: "Failed to collect race pack" },
      { status: 500 },
    );
  }
}
