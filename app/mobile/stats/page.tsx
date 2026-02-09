// app/mobile/stats/page.tsx
import { Suspense } from "react";
import MobileStatsClient from "./mobile-stats-wrapper";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Đang tải...
        </div>
      }
    >
      <MobileStatsClient />
    </Suspense>
  );
}
