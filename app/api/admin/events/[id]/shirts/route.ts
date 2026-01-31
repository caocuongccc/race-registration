// ============================================
// app/api/admin/events/[id]/shirts/route.ts
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all shirts for event
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

    const shirts = await prisma.eventShirt.findMany({
      where: { eventId },
      orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
    });

    return NextResponse.json({ shirts });
  } catch (error) {
    console.error("Error fetching shirts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shirts" },
      { status: 500 }
    );
  }
}

// POST create/update multiple shirts
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
    const { shirts } = await req.json();

    // Validate input
    if (!Array.isArray(shirts)) {
      return NextResponse.json(
        { error: "Shirts must be an array" },
        { status: 400 }
      );
    }

    // Delete removed shirts and create/update others
    const result = await prisma.$transaction(async (tx) => {
      const existingIds = shirts.filter((s) => !s.isNew).map((s) => s.id);

      // Delete shirts not in the list
      await tx.eventShirt.deleteMany({
        where: {
          eventId,
          id: {
            notIn: existingIds,
          },
        },
      });

      // Upsert each shirt
      const updated = await Promise.all(
        shirts.map(async (shirt) => {
          const data = {
            eventId,
            category: shirt.category,
            type: shirt.type,
            size: shirt.size,
            price: parseInt(shirt.price),
            stockQuantity: parseInt(shirt.stockQuantity),
            isAvailable: shirt.isAvailable !== false,
          };

          if (shirt.isNew) {
            return tx.eventShirt.create({ data });
          } else {
            return tx.eventShirt.update({
              where: { id: shirt.id },
              data,
            });
          }
        })
      );

      return updated;
    });

    return NextResponse.json({
      success: true,
      shirts: result,
    });
  } catch (error: any) {
    console.error("Error saving shirts:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Mẫu áo này đã tồn tại (trùng loại + kiểu + size)" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save shirts" },
      { status: 500 }
    );
  }
}
