import type { Metadata } from "next";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

type EventLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "https://dangkygiaichay.vercel.app";

function toAbsoluteUrl(url?: string | null) {
  if (!url) return undefined;

  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return undefined;
  }
}

function compactDescription(description?: string | null) {
  if (!description) return "Đăng ký tham gia giải chạy online";
  return description.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function generateMetadata({
  params,
}: Pick<EventLayoutProps, "params">): Promise<Metadata> {
  const { slug } = await params;

  const event = await prisma.event.findFirst({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      coverImageUrl: true,
      bannerUrl: true,
    },
  });

  if (!event) {
    return {
      title: "Sự kiện không tồn tại",
      description: "Không tìm thấy thông tin sự kiện",
    };
  }

  const title = event.name;
  const description = compactDescription(event.description);
  const imageUrl = toAbsoluteUrl(event.coverImageUrl || event.bannerUrl);
  const eventUrl = `${SITE_URL}/events/${event.slug}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: eventUrl,
    },
    openGraph: {
      title,
      description,
      url: eventUrl,
      siteName: "Hệ Thống Đăng Ký Giải Chạy",
      type: "website",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function EventLayout({ children }: EventLayoutProps) {
  return children;
}
