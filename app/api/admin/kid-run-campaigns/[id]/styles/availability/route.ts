import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await context.params;
    const isAvailable = (await req.json()).isAvailable === true;
    const campaign = await prisma.kidRunCampaign.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!campaign)
      return NextResponse.json(
        { error: "Không tìm thấy chương trình" },
        { status: 404 },
      );

    const result = await prisma.kidRunShirtStyle.updateMany({
      where: { campaignId: id },
      data: { isAvailable },
    });
    return NextResponse.json({
      success: true,
      isAvailable,
      updated: result.count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không cập nhật được trạng thái bán áo" },
      { status: 400 },
    );
  }
}
