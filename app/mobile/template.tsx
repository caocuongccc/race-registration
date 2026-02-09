// app/mobile/template.tsx - FORCE CLIENT-SIDE RENDERING
"use client";

import { ReactNode } from "react";

export default function MobileTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
