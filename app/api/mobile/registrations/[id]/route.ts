// app/api/mobile/registrations/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/mobile/registrations/:id
 * Get registration info for check-in
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id: params.id },
      include: {
        distance: {
          select: {
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            date: true,
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
        collectedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ registration });
  } catch (error) {
    console.error("Get registration error:", error);
    return NextResponse.json(
      { error: "Failed to get registration" },
      { status: 500 },
    );
  }
}
