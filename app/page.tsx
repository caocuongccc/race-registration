import { Suspense } from "react";
import HomeClient from "./home-client";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <HomeClient />
    </Suspense>
  );
}
