import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; styleId: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, styleId } = await context.params;
    const body = await req.json();
    const current = await prisma.kidRunShirtStyle.findFirst({
      where: { id: styleId, campaignId: id },
    });
    if (!current)
      return NextResponse.json(
        { error: "Không tìm thấy mẫu áo" },
        { status: 404 },
      );
    const style = await prisma.kidRunShirtStyle.update({
      where: { id: styleId },
      data: {
        name: String(body.name || current.name).trim(),
        category: body.category || current.category,
        type: body.type || current.type,
        price: Number(body.price ?? current.price),
        frontImageUrl: String(body.frontImageUrl || "").trim() || null,
        backImageUrl: String(body.backImageUrl || "").trim() || null,
        sizeGuideImageUrl: String(body.sizeGuideImageUrl || "").trim() || null,
        isAvailable: body.isAvailable !== false,
      },
    });
    if (Array.isArray(body.sizes)) {
      const sizes = [...new Set(body.sizes.map(String))];
      await prisma.kidRunShirtVariant.updateMany({
        where: { styleId },
        data: { isAvailable: false },
      });
      for (let i = 0; i < sizes.length; i++) {
        await prisma.kidRunShirtVariant.upsert({
          where: { styleId_size: { styleId, size: sizes[i] as any } },
          create: { styleId, size: sizes[i] as any, sortOrder: i },
          update: { isAvailable: true, sortOrder: i },
        });
      }
    }
    return NextResponse.json({ success: true, style });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; styleId: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, styleId } = await context.params;
  await prisma.kidRunShirtStyle.updateMany({
    where: { id: styleId, campaignId: id },
    data: { isAvailable: false },
  });
  return NextResponse.json({ success: true });
}
