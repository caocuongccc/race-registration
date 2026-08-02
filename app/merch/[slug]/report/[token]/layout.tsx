import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Báo cáo bán áo",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  referrer: "no-referrer",
};

export default function MerchReportLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
