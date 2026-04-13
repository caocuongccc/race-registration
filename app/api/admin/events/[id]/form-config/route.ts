// app/api/admin/events/[id]/form-config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET - Lấy cấu hình form fields của event
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = (await context.params).id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        showIdCard: true,
        showAddress: true,
        showCity: true,
        showBloodType: true,
        showEmergencyContact: true,
        showHealthDeclaration: true,
        showBibName: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching form config:", error);
    return NextResponse.json(
      { error: "Failed to fetch form config" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Cập nhật cấu hình form fields
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = (await context.params).id;
    const body = await req.json();
    // Validate that the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Update the form configuration fields
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        showIdCard: body.showIdCard ?? true,
        showAddress: body.showAddress ?? true,
        showCity: body.showCity ?? true,
        showBloodType: body.showBloodType ?? false,
        showEmergencyContact: body.showEmergencyContact ?? true,
        showHealthDeclaration: body.showHealthDeclaration ?? true,
        showBibName: body.showBibName ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating form config:", error);
    return NextResponse.json(
      { error: "Failed to update form configuration" },
      { status: 500 },
    );
  }
}
