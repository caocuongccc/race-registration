import { Suspense } from "react";
import MobileHistoryClient from "./mobile-history-wapper";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <MobileHistoryClient />
    </Suspense>
  );
}
