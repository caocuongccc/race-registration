import { Suspense } from "react";
import MobileClient from "./mobile-search-wapper";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <MobileClient />
    </Suspense>
  );
}
