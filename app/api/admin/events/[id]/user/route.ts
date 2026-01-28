import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserSession,
  requireEventPermission,
} from "@/lib/event-permissions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserSession();
    const eventId = (await context.params).id;

    // ✅ Only ADMIN can manage users
    await requireEventPermission(eventId, user.id, "admin");

    const assignedUsers = await prisma.eventUser.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users: assignedUsers });
  } catch (error: any) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Add user to event
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserSession();
    const eventId = (await context.params).id;

    // ✅ Only ADMIN can add users
    await requireEventPermission(eventId, user.id, "admin");

    const { userId, role } = await req.json();

    // Validate role
    if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add assignment
    const assignment = await prisma.eventUser.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        userId,
        role,
      },
      update: {
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to assign user" },
      { status: 500 }
    );
  }
}

// Remove user from event
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserSession();
    const eventId = (await context.params).id;

    // ✅ Only ADMIN can remove users
    await requireEventPermission(eventId, user.id, "admin");

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await prisma.eventUser.delete({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 }
    );
  }
}
