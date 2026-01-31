// ============================================
// app/api/admin/events/[id]/shirts/bulk-create/route.ts
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST bulk create all shirt sizes
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
    const { defaultPrice = 150000, defaultStock = 50 } = await req.json();

    const categories = ["MALE", "FEMALE", "KID"];
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
    const type = "SHORT_SLEEVE"; // Default to short sleeve

    // Get existing shirts
    const existing = await prisma.eventShirt.findMany({
      where: { eventId },
      select: { category: true, size: true, type: true },
    });

    const existingSet = new Set(
      existing.map((s) => `${s.category}-${s.type}-${s.size}`)
    );

    // Generate missing combinations
    const toCreate = [];
    for (const category of categories) {
      for (const size of sizes) {
        const key = `${category}-${type}-${size}`;
        if (!existingSet.has(key)) {
          toCreate.push({
            eventId,
            category,
            type,
            size,
            price: defaultPrice,
            stockQuantity: defaultStock,
            isAvailable: true,
          });
        }
      }
    }

    // Bulk create
    if (toCreate.length > 0) {
      await prisma.eventShirt.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      created: toCreate.length,
      message: `Đã tạo ${toCreate.length} mẫu áo mới`,
    });
  } catch (error) {
    console.error("Error bulk creating shirts:", error);
    return NextResponse.json(
      { error: "Failed to create shirts" },
      { status: 500 }
    );
  }
}
