// app/api/admin/events/[id]/change-status/route.ts
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

    const { status } = await req.json();
    const eventId = (await context.params).id;

    // Validate status
    const validStatuses = [
      "DRAFT",
      "PUBLISHED",
      "REGISTRATION_OPEN",
      "REGISTRATION_CLOSED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update event
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        status,
        // Đồng bộ allowRegistration flag
        allowRegistration: status === "REGISTRATION_OPEN",
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Change status error:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
