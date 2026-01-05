// app/api/admin/events/[id]/toggle-registration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowRegistration } = await req.json();
    const eventId = (await context.params).id;

    // Update event
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        allowRegistration,
        // Tự động cập nhật status nếu cần
        status: allowRegistration ? "REGISTRATION_OPEN" : "REGISTRATION_CLOSED",
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Toggle registration error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// ============================================
// MIDDLEWARE: Check registration allowed
// ============================================

// app/api/events/[slug]/route.ts - ADD CHECK
// Update existing route to return allowRegistration status
