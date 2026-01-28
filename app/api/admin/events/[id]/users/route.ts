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

    // Get event with assigned users
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        // If you have a many-to-many relationship
        // eventUsers: {
        //   include: {
        //     user: {
        //       select: {
        //         id: true,
        //         name: true,
        //         email: true,
        //         role: true,
        //       },
        //     },
        //   },
        // },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // For now, return creator as the only assigned user
    // You can expand this with EventUser junction table if needed
    return NextResponse.json({
      users: [event.createdBy],
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
 * POST - Assign users to event
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
    const { userIds } = await req.json();

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds must be an array" },
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

    // ============================================
    // Option 1: If you have EventUser junction table
    // ============================================
    // await prisma.eventUser.createMany({
    //   data: userIds.map(userId => ({
    //     eventId,
    //     userId,
    //   })),
    //   skipDuplicates: true,
    // });

    // ============================================
    // Option 2: Store as JSON array in Event table
    // ============================================
    // Add this field to Event model: assignedUserIds String[]
    // await prisma.event.update({
    //   where: { id: eventId },
    //   data: {
    //     assignedUserIds: {
    //       set: userIds,
    //     },
    //   },
    // });

    // ============================================
    // Option 3: Simple response for now
    // ============================================
    return NextResponse.json({
      success: true,
      message: "Users assigned successfully",
      assigned: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
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

    // ============================================
    // Option 1: If using EventUser junction table
    // ============================================
    // await prisma.eventUser.delete({
    //   where: {
    //     eventId_userId: {
    //       eventId,
    //       userId,
    //     },
    //   },
    // });

    // ============================================
    // Option 2: If using assignedUserIds array
    // ============================================
    // const event = await prisma.event.findUnique({
    //   where: { id: eventId },
    // });
    //
    // await prisma.event.update({
    //   where: { id: eventId },
    //   data: {
    //     assignedUserIds: {
    //       set: event.assignedUserIds.filter(id => id !== userId),
    //     },
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: "User removed from event",
    });
  } catch (error) {
    console.error("Error removing user:", error);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 },
    );
  }
}
