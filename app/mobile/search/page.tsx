import { Suspense } from "react";
import MobileSearchClient from "./mobile-search-wapper";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <MobileSearchClient />
    </Suspense>
  );
}
