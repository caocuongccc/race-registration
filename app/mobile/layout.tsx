// app/mobile/layout.tsx - ADD THIS FILE
import { ReactNode } from "react";

export default function MobileLayout({ children }: { children: ReactNode }) {
  return <div className="mobile-layout">{children}</div>;
}
