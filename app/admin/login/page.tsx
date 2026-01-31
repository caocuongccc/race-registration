import { Suspense } from "react";
import HomeClient from "./admin-login-client";

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <HomeClient />
    </Suspense>
  );
}
