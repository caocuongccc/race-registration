import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

async function canPreviewCampaign(campaignId: string) {
  try {
    const user = await getUserSession();
    if (user.role === "ADMIN") return true;
    if (user.role !== "MEMBER") return false;

    const assignment = await prisma.kidRunCampaignUser.findUnique({
      where: {
        campaignId_userId: {
          campaignId,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    return Boolean(assignment);
  } catch {
    return false;
  }
}

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const campaign = await prisma.kidRunCampaign.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categories: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
      waivers: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      shirtStyles: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { variants: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json(
      { error: "Không tìm thấy chương trình Kid Run" },
      { status: 404 },
    );
  }

  const previewRequested = new URL(req.url).searchParams.get("preview") === "1";
  const previewAllowed =
    previewRequested && (await canPreviewCampaign(campaign.id));

  if (!campaign.isPublished && !previewAllowed) {
    return NextResponse.json(
      { error: "Chương trình Kid Run chưa được công khai" },
      { status: 403 },
    );
  }

  const {
    bankName: _bankName,
    bankAccount: _bankAccount,
    bankHolder: _bankHolder,
    bankCode: _bankCode,
    ...publicCampaign
  } = campaign;
  const isOpen =
    campaign.isPublished &&
    campaign.status === "OPEN" &&
    campaign.allowRegistration &&
    campaign.remainingBibCount > 0;

  return NextResponse.json({
    campaign: {
      ...publicCampaign,
      isOpen,
      isPreview: previewAllowed,
      closedReason: isOpen
        ? null
        : previewAllowed && !campaign.isPublished
          ? "Bạn đang xem trước bản nháp. Hãy công khai chương trình để nhận đăng ký."
          : campaign.remainingBibCount <= 0
            ? `Chương trình đã đủ ${campaign.bibCapacity} BIB.`
            : campaign.status === "CLOSED"
              ? "Chương trình đã đóng đăng ký."
              : "Ban tổ chức chưa mở đăng ký.",
      waiver: campaign.waivers[0] || null,
      waiverId: campaign.waivers[0]?.id || null,
      waivers: undefined,
    },
  });
}