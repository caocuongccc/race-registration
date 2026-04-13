// app/api/admin/events/[id]/distances/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET - Lấy danh sách cự ly
 * ✅ FIX: Không return success: true để tránh false toast
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

    const distances = await prisma.distance.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });

    // ✅ FIX: Return plain data, no success flag
    return NextResponse.json({ distances });
  } catch (error) {
    console.error("Error fetching distances:", error);
    return NextResponse.json(
      { error: "Failed to fetch distances" },
      { status: 500 },
    );
  }
}

/**
 * POST - Lưu cấu hình cự ly
 * ✅ Chỉ POST mới có success flag
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
    const { distances } = await req.json();

    if (!Array.isArray(distances)) {
      return NextResponse.json(
        { error: "Distances must be an array" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingIds = distances.filter((d) => !d.isNew).map((d) => d.id);

      await tx.distance.deleteMany({
        where: {
          eventId,
          id: {
            notIn: existingIds,
          },
        },
      });

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
        }),
      );

      return updated;
    });

    // ✅ POST có success flag để trigger toast
    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình cự ly",
      distances: result,
    });
  } catch (error) {
    console.error("Error saving distances:", error);
    return NextResponse.json(
      { error: "Failed to save distances" },
      { status: 500 },
    );
  }
}
