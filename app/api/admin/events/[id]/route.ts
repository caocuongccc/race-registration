// app/api/admin/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: (await context.params).id },
      include: {
        distances: {
          orderBy: { sortOrder: "asc" },
        },
        shirts: {
          orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const event = await prisma.event.update({
      where: { id: (await context.params).id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        date: new Date(body.date),
        location: body.location,
        address: body.address,
        city: body.city,
        status: body.status,
        isPublished: body.isPublished,
        hasShirt: body.hasShirt,
        requireOnlinePayment: body.requireOnlinePayment,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankHolder: body.bankHolder,
        bankCode: body.bankCode,
        hotline: body.hotline,
        emailSupport: body.emailSupport,
        facebookUrl: body.facebookUrl,
        racePackLocation: body.racePackLocation,
        racePackTime: body.racePackTime,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}
