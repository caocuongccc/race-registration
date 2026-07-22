import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

async function admin() {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") throw new Error("FORBIDDEN");
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; styleId: string }> },
) {
  try {
    await admin();
    const { id, styleId } = await context.params;
    const body = await req.json();
    const current = await prisma.merchShirtStyle.findFirst({
      where: { id: styleId, campaignId: id },
      include: { variants: true },
    });
    if (!current)
      return NextResponse.json(
        { error: "Không tìm thấy mẫu áo" },
        { status: 404 },
      );
    const price = Number(body.price);
    const variants = Array.isArray(body.variants) ? body.variants : [];
    if (
      !String(body.name || "").trim() ||
      !["MALE", "FEMALE", "KID"].includes(body.category) ||
      !["SHORT_SLEEVE", "TANK_TOP"].includes(body.type) ||
      !Number.isInteger(price) ||
      price < 0 ||
      !variants.length
    ) {
      return NextResponse.json(
        { error: "Thông tin mẫu áo chưa hợp lệ" },
        { status: 400 },
      );
    }
    const currentVariants = new Map(
      current.variants.map((variant) => [variant.size, variant]),
    );

    for (const variant of variants) {
      const existing = currentVariants.get(variant.size);
      const stockQuantity = Math.max(Number(variant.stockQuantity) || 0, 0);
      if (
        existing &&
        stockQuantity < existing.soldQuantity + existing.reservedQuantity
      ) {
        throw new Error(
          `Stock for ${variant.size} cannot be lower than sold + reserved`,
        );
      }
    }

    await prisma.$transaction([
      prisma.merchShirtStyle.update({
        where: { id: styleId },
        data: {
          name: String(body.name).trim(),
          category: body.category,
          type: body.type,
          price,
          previewImageUrl: body.previewImageUrl || null,
          cloudinaryPublicId: body.cloudinaryPublicId || null,
          isAvailable: body.isAvailable !== false,
          sortOrder: Number(body.sortOrder) || 0,
        },
      }),
      ...variants.map((variant) =>
        prisma.merchShirtVariant.upsert({
          where: {
            styleId_size: { styleId, size: variant.size },
          },
          update: {
            stockQuantity: Math.max(Number(variant.stockQuantity) || 0, 0),
            isAvailable: variant.isAvailable !== false,
          },
          create: {
            styleId,
            size: variant.size,
            stockQuantity: Math.max(Number(variant.stockQuantity) || 0, 0),
            isAvailable: variant.isAvailable !== false,
          },
        }),
      ),
    ]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; styleId: string }> },
) {
  try {
    await admin();
    const { id, styleId } = await context.params;
    const style = await prisma.merchShirtStyle.findFirst({
      where: { id: styleId, campaignId: id },
    });
    if (!style)
      return NextResponse.json(
        { error: "Không tìm thấy mẫu áo" },
        { status: 404 },
      );
    await prisma.merchShirtStyle.update({
      where: { id: styleId },
      data: { isAvailable: false },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
