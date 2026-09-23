"use client";

import { useState } from "react";

export function EventStatusControl({ eventId, status, onChanged }: { eventId: string; status: string; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function change(next: string) { setBusy(true); const response = await fetch(`/api/admin/challenges/${eventId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) }); if (!response.ok) alert((await response.json()).error); else await onChanged(); setBusy(false); }
  return <select disabled={busy} value={status} onChange={(e) => change(e.target.value)} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option><option value="ACTIVE">Đang diễn ra</option><option value="COMPLETED">Đã kết thúc</option><option value="CANCELLED">Đã hủy</option></select>;
}

