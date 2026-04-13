// app/api/admin/events/[id]/shirts/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET - Lấy danh sách áo
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

    const shirts = await prisma.eventShirt.findMany({
      where: { eventId },
      orderBy: [{ category: "asc" }, { type: "asc" }, { size: "asc" }],
    });

    // ✅ FIX: Return plain data, no success flag
    return NextResponse.json({ shirts });
  } catch (error) {
    console.error("Error fetching shirts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shirts" },
      { status: 500 },
    );
  }
}

/**
 * POST - Lưu cấu hình áo
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
    const { shirts } = await req.json();

    if (!Array.isArray(shirts)) {
      return NextResponse.json(
        { error: "Shirts must be an array" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingIds = shirts.filter((s) => !s.isNew).map((s) => s.id);

      await tx.eventShirt.deleteMany({
        where: {
          eventId,
          id: {
            notIn: existingIds,
          },
        },
      });

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
        }),
      );

      return updated;
    });

    // ✅ POST có success flag để trigger toast
    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình áo",
      shirts: result,
    });
  } catch (error: any) {
    console.error("Error saving shirts:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Mẫu áo này đã tồn tại (trùng loại + kiểu + size)" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save shirts" },
      { status: 500 },
    );
  }
}
