"use client";

import { useEffect, useState } from "react";
import { Search, UserMinus, UserPlus } from "lucide-react";

export function TeamMembersManager({ eventId, team, onChanged }: { eventId: string; team: any; onChanged: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setAthletes([]); return; }
      const response = await fetch(`/api/admin/challenges/athletes?eventId=${eventId}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setAthletes(data.athletes);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, eventId]);

  async function add(userId: string) {
    setBusy(userId); setError("");
    try {
      const response = await fetch(`/api/admin/challenges/${eventId}/teams/${team.id}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, activeFrom: new Date().toISOString() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setQuery(""); setAthletes([]); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể thêm thành viên"); } finally { setBusy(""); }
  }
  async function remove(userId: string) {
    const reason = window.prompt("Lý do xóa người này khỏi đội và sự kiện:");
    if (!reason?.trim()) return;
    setBusy(userId); setError("");
    try {
      const response = await fetch(`/api/admin/challenges/${eventId}/teams/${team.id}/members/${userId}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason, leftAt: new Date().toISOString() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa thành viên"); } finally { setBusy(""); }
  }

  return <div className="mt-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm người đã kết nối Strava..." className="h-10 w-full rounded-xl border pl-9 pr-3 text-sm" /></div>{error && <p className="mt-2 text-xs text-red-600">{error}</p>}{athletes.length > 0 && <div className="mt-2 max-h-48 overflow-auto rounded-xl border bg-white p-1 shadow-lg">{athletes.map((athlete) => { const active = athlete.enrollments?.[0]?.teamMemberships?.[0]; return <div key={athlete.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><span className="min-w-0 truncate text-sm">{athlete.displayName}{active && <small className="ml-2 text-amber-600">Đang ở {active.team.name}</small>}</span><button disabled={Boolean(active) || busy === athlete.id || team.memberships.length >= team.maxMembers} onClick={() => add(athlete.id)} className="rounded-lg bg-orange-50 p-2 text-orange-700 disabled:opacity-30" title="Thêm vào đội"><UserPlus className="h-4 w-4" /></button></div>; })}</div>}<div className="mt-3 space-y-2">{team.memberships.map((member: any) => <div key={member.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>{member.enrollment.user.displayName}</span><button disabled={busy === member.enrollment.user.id} onClick={() => remove(member.enrollment.user.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Xóa khỏi đội và sự kiện"><UserMinus className="h-4 w-4" /></button></div>)}</div></div>;
}

