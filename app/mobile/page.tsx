import { Suspense } from "react";
import MobileClient from "./mobile-wapper";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <MobileClient />
    </Suspense>
  );
}
