import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await prisma.merchCampaign.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      heroImageUrl: true,
      isPublished: true,
    },
  });

  if (!campaign?.isPublished) {
    return { title: "Chương trình bán áo" };
  }

  const description =
    campaign.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Đăng ký mua áo ${campaign.name}`;
  const images = campaign.heroImageUrl ? [campaign.heroImageUrl] : undefined;

  return {
    title: campaign.name,
    description,
    openGraph: {
      title: campaign.name,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.name,
      description,
      images,
    },
  };
}

export default function MerchCampaignLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
