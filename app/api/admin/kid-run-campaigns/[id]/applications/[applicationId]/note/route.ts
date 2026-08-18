import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; applicationId: string }> },
) {
  try {
    const user = await getUserSession();
    const { id, applicationId } = await context.params;
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (user.role === "MEMBER") {
      const access = await prisma.kidRunCampaignUser.findUnique({
        where: { campaignId_userId: { campaignId: id, userId: user.id } },
      });
      if (!access)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const notes = String(body.notes || "").trim();
    if (notes.length > 1000)
      return NextResponse.json(
        { error: "Ghi chú không được vượt quá 1.000 ký tự" },
        { status: 400 },
      );

    const result = await prisma.kidRunFamilyApplication.updateMany({
      where: { id: applicationId, campaignId: id },
      data: { notes: notes || null },
    });
    if (!result.count)
      return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

    return NextResponse.json({ success: true, notes: notes || null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không lưu được ghi chú" },
      { status: 400 },
    );
  }
}
