import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await prisma.kidRunCampaign.findUnique({ where: { slug }, select: { name: true, description: true, heroImageUrl: true } });
  if (!campaign) return { title: "Kid Run" };
  return { title: campaign.name, description: campaign.description || `Đăng ký ${campaign.name}`, openGraph: { title: campaign.name, description: campaign.description || undefined, images: campaign.heroImageUrl ? [campaign.heroImageUrl] : [] } };
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }