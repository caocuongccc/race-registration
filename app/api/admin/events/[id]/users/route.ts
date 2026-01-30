// app/api/admin/events/[id]/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET - Get all users assigned to this event
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

    // Get event with assigned users via EventUser junction table
    const eventUsers = await prisma.eventUser.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get event creator
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Map to user format with EventUser role
    const users = eventUsers.map((eu) => ({
      ...eu.user,
      eventUserRole: eu.role, // ADMIN, EDITOR, VIEWER from EventUser
      eventUserId: eu.id, // For deletion
    }));

    return NextResponse.json({
      users,
      creator: event.createdBy,
    });
  } catch (error) {
    console.error("Error fetching event users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

/**
 * POST - Assign users to event (supports multiple users)
 */
export async function POST(
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

    // Support both single user and multiple users
    let userIds: string[] = [];
    let role: string = "VIEWER"; // Default role

    if (body.userIds && Array.isArray(body.userIds)) {
      // Multiple users
      userIds = body.userIds;
      role = body.role || "VIEWER";
    } else if (body.userId) {
      // Single user (backward compatibility)
      userIds = [body.userId];
      role = body.role || "VIEWER";
    } else {
      return NextResponse.json(
        { error: "userId or userIds is required" },
        { status: 400 },
      );
    }

    // Validate role
    if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, EDITOR, or VIEWER" },
        { status: 400 },
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
    });

    if (users.length !== userIds.length) {
      return NextResponse.json(
        { error: "Some users not found" },
        { status: 400 },
      );
    }

    // Create EventUser records (skip duplicates)
    const created = await Promise.all(
      userIds.map(async (userId) => {
        return await prisma.eventUser.upsert({
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
            role, // Update role if already exists
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });
      }),
    );

    return NextResponse.json({
      success: true,
      message: `Assigned ${created.length} user(s) successfully`,
      assigned: created.map((eu) => ({
        ...eu.user,
        eventUserRole: eu.role,
        eventUserId: eu.id,
      })),
    });
  } catch (error) {
    console.error("Error assigning users:", error);
    return NextResponse.json(
      { error: "Failed to assign users" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove user from event
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = (await context.params).id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Delete from EventUser junction table
    await prisma.eventUser.delete({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "User removed from event successfully",
    });
  } catch (error: any) {
    console.error("Error removing user:", error);

    // Handle not found case
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "User assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update user's role on event
 */
export async function PATCH(
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
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!role || !["ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, EDITOR, or VIEWER" },
        { status: 400 },
      );
    }

    // Update role in EventUser
    const updated = await prisma.eventUser.update({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      data: {
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "User role updated successfully",
      user: {
        ...updated.user,
        eventUserRole: updated.role,
        eventUserId: updated.id,
      },
    });
  } catch (error: any) {
    console.error("Error updating user role:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "User assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
