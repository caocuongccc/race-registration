// ============================================
// app/api/admin/events/[id]/distances/route.ts
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all distances for event
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = (await context.params).id;

    const distances = await prisma.distance.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ distances });
  } catch (error) {
    console.error("Error fetching distances:", error);
    return NextResponse.json(
      { error: "Failed to fetch distances" },
      { status: 500 }
    );
  }
}

// POST create/update multiple distances
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = (await context.params).id;
    const { distances } = await req.json();

    // Validate input
    if (!Array.isArray(distances)) {
      return NextResponse.json(
        { error: "Distances must be an array" },
        { status: 400 }
      );
    }

    // Delete removed distances and create/update others
    const result = await prisma.$transaction(async (tx) => {
      const existingIds = distances.filter((d) => !d.isNew).map((d) => d.id);

      // Delete distances not in the list
      await tx.distance.deleteMany({
        where: {
          eventId,
          id: {
            notIn: existingIds,
          },
        },
      });

      // Upsert each distance
      const updated = await Promise.all(
        distances.map(async (distance, index) => {
          const data = {
            eventId,
            name: distance.name,
            price: parseInt(distance.price),
            bibPrefix: distance.bibPrefix.toUpperCase(),
            maxParticipants: distance.maxParticipants
              ? parseInt(distance.maxParticipants)
              : null,
            isAvailable: distance.isAvailable !== false,
            sortOrder: index,
          };

          if (distance.isNew) {
            return tx.distance.create({ data });
          } else {
            return tx.distance.update({
              where: { id: distance.id },
              data,
            });
          }
        })
      );

      return updated;
    });

    return NextResponse.json({
      success: true,
      distances: result,
    });
  } catch (error) {
    console.error("Error saving distances:", error);
    return NextResponse.json(
      { error: "Failed to save distances" },
      { status: 500 }
    );
  }
}
