import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const body = await req.json();
    const price = Number(body.price);
    const variants = Array.isArray(body.variants) ? body.variants : [];
    if (
      !body.name ||
      !["MALE", "FEMALE", "KID"].includes(body.category) ||
      !["SHORT_SLEEVE", "TANK_TOP"].includes(body.type) ||
      !Number.isInteger(price) ||
      price < 0 ||
      !variants.length
    ) {
      return NextResponse.json(
        { error: "Thông tin mẫu áo chưa đầy đủ" },
        { status: 400 },
      );
    }
    const style = await prisma.merchShirtStyle.create({
      data: {
        campaignId: id,
        name: String(body.name).trim(),
        category: body.category,
        type: body.type,
        price,
        previewImageUrl: body.previewImageUrl || null,
        cloudinaryPublicId: body.cloudinaryPublicId || null,
        backImageUrl: body.backImageUrl || null,
        backCloudinaryPublicId: body.backCloudinaryPublicId || null,
        sortOrder: Number(body.sortOrder) || 0,
        variants: {
          create: variants.map((v: any) => ({
            size: v.size,
            stockQuantity: Math.max(Number(v.stockQuantity) || 0, 0),
          })),
        },
      },
      include: { variants: true },
    });
    return NextResponse.json({ success: true, style });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.code === "P2002" ? "Mẫu áo này đã tồn tại" : error.message,
      },
      { status: 400 },
    );
  }
}
