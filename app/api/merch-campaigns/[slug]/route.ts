import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const campaign = await prisma.merchCampaign.findUnique({
    where: { slug },
    include: {
      styles: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          variants: { where: { isAvailable: true }, orderBy: { size: "asc" } },
        },
      },
    },
  });
  if (!campaign || !campaign.isPublished) {
    return NextResponse.json(
      { error: "Không tìm thấy chương trình" },
      { status: 404 },
    );
  }
  const {
    bankName: _bankName,
    bankAccount: _bankAccount,
    bankHolder: _bankHolder,
    bankCode: _bankCode,
    ...publicCampaign
  } = campaign;
  const now = new Date();
  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);

  let closedReason: string | null = null;
  if (campaign.status === "DRAFT") {
    closedReason = "Ban tổ chức chưa mở bán chương trình này.";
  } else if (campaign.status === "CLOSED") {
    closedReason = "Chương trình đã đóng nhận đơn.";
  } else if (campaign.saleStartAt && campaign.saleStartAt > now) {
    closedReason = `Chương trình sẽ mở nhận đơn từ ${formatDateTime(campaign.saleStartAt)}.`;
  } else if (campaign.saleEndAt && campaign.saleEndAt < now) {
    closedReason = `Chương trình đã kết thúc nhận đơn lúc ${formatDateTime(campaign.saleEndAt)}.`;
  }

  const isOpen = closedReason === null;
  return NextResponse.json({
    campaign: {
      ...publicCampaign,
      isOpen,
      closedReason,
      styles: publicCampaign.styles.map((style) => ({
        ...style,
        variants: style.variants.map((variant) => ({
          ...variant,
          remaining: Math.max(
            variant.stockQuantity -
              variant.soldQuantity -
              variant.reservedQuantity,
            0,
          ),
        })),
      })),
    },
  });
}
