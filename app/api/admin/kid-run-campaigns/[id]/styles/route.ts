import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const body = await req.json();
    const sizes = [
      ...new Set((Array.isArray(body.sizes) ? body.sizes : []).map(String)),
    ];
    if (
      !body.name ||
      !body.category ||
      !body.type ||
      !Number.isInteger(Number(body.price)) ||
      !sizes.length
    ) {
      return NextResponse.json(
        { error: "Vui lòng nhập đủ tên, loại, kiểu, giá và size áo" },
        { status: 400 },
      );
    }
    const style = await prisma.kidRunShirtStyle.create({
      data: {
        campaignId: id,
        name: String(body.name).trim(),
        category: body.category,
        type: body.type,
        price: Number(body.price),
        frontImageUrl: String(body.frontImageUrl || "").trim() || null,
        backImageUrl: String(body.backImageUrl || "").trim() || null,
        sizeGuideImageUrl: String(body.sizeGuideImageUrl || "").trim() || null,
        variants: {
          create: sizes.map((size, index) => ({
            size: size as any,
            sortOrder: index,
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
