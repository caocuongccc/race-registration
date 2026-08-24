"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, CalendarDays, Plus, RefreshCw, Users } from "lucide-react";
import { StravaStatusPanel } from "./strava-status-panel";

type ChallengeEvent = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  status: string;
  enablePoints: boolean;
  _count: { teams: number; enrollments: number };
  currentRuleset: { version: number } | null;
};

const initialForm = {
  name: "",
  slug: "",
  startsAt: "",
  endsAt: "",
  timezone: "Asia/Ho_Chi_Minh",
  participationMode: "INDIVIDUAL_AND_TEAM",
  defaultTeamSize: 10,
  enablePoints: false,
  pointsPerKm: 1,
  rankingMetric: "DISTANCE",
  topCount: 3,
  description: "",
};

function statusLabel(status: string) {
  return { DRAFT: "Bản nháp", PUBLISHED: "Đã công bố", ACTIVE: "Đang diễn ra", COMPLETED: "Đã kết thúc", CANCELLED: "Đã hủy" }[status] ?? status;
}

export default function ChallengeAdminPage() {
  const [events, setEvents] = useState<ChallengeEvent[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/challenges", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải sự kiện");
      setEvents(data.events);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải sự kiện");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          defaultTeamSize: form.participationMode === "INDIVIDUAL_ONLY" ? null : Number(form.defaultTeamSize),
          pointsPerKm: Number(form.pointsPerKm),
          topCount: Number(form.topCount),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo sự kiện");
      window.location.href = `/admin/dashboard/challenges/${data.event.id}`;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể tạo sự kiện");
      setSaving(false);
    }
  }

  return (
    <main className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">Strava Challenge</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Sự kiện tích lũy vận động</h1>
          <p className="mt-2 text-slate-600">Quản lý luật chơi, đội và kết quả đồng bộ từ Strava.</p>
        </div>
        <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-orange-700">
          <Plus className="h-4 w-4" /> Tạo sự kiện
        </button>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <StravaStatusPanel />

      {showCreate && (
        <form onSubmit={create} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5"><h2 className="text-xl font-bold">Thông tin nền tảng</h2><p className="mt-1 text-sm text-slate-500">Sau khi tạo, hệ thống sinh ruleset mặc định để bạn cấu hình tiếp.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên sự kiện" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="Slug" required value={form.slug} onChange={(value) => setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
            <Field label="Bắt đầu" type="datetime-local" required value={form.startsAt} onChange={(value) => setForm({ ...form, startsAt: value })} />
            <Field label="Kết thúc" type="datetime-local" required value={form.endsAt} onChange={(value) => setForm({ ...form, endsAt: value })} />
            <Select label="Hình thức" value={form.participationMode} onChange={(value) => setForm({ ...form, participationMode: value })} options={[['INDIVIDUAL_ONLY', 'Chỉ cá nhân'], ['TEAM_ONLY', 'Chỉ đội'], ['INDIVIDUAL_AND_TEAM', 'Cá nhân và đội']]} />
            {form.participationMode !== "INDIVIDUAL_ONLY" && <Field label="Số người mặc định mỗi đội" type="number" min="1" required value={String(form.defaultTeamSize)} onChange={(value) => setForm({ ...form, defaultTeamSize: Number(value) })} />}
            <Field label="Số lượng Top hiển thị" type="number" min="1" required value={String(form.topCount)} onChange={(value) => setForm({ ...form, topCount: Number(value) })} />
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={form.enablePoints} onChange={(event) => setForm({ ...form, enablePoints: event.target.checked, rankingMetric: event.target.checked ? form.rankingMetric : "DISTANCE" })} className="h-5 w-5 accent-orange-600" /><span><strong className="block text-sm">Bật chế độ điểm</strong><span className="text-xs text-slate-500">Tắt: toàn bộ giao diện chỉ sử dụng km.</span></span></label>
            {form.enablePoints && <><Field label="Điểm cho mỗi km" type="number" min="0.01" step="0.01" required value={String(form.pointsPerKm)} onChange={(value) => setForm({ ...form, pointsPerKm: Number(value) })} /><Select label="Xếp hạng chính" value={form.rankingMetric} onChange={(value) => setForm({ ...form, rankingMetric: value })} options={[['DISTANCE', 'Quãng đường'], ['POINTS', 'Điểm']]} /></>}
            <label className="text-sm font-medium md:col-span-2">Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>
          </div>
          <button disabled={saving} className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-60">{saving ? "Đang tạo..." : "Tạo và cấu hình luật chơi"}</button>
        </form>
      )}

      <section className="mt-7 grid gap-4 xl:grid-cols-2">
        {loading && <div className="col-span-full flex items-center justify-center gap-2 rounded-2xl border bg-white p-12 text-slate-500"><RefreshCw className="h-5 w-5 animate-spin" /> Đang tải...</div>}
        {!loading && events.length === 0 && <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">Chưa có sự kiện Challenge.</div>}
        {events.map((item) => (
          <Link key={item.id} href={`/admin/dashboard/challenges/${item.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950 group-hover:text-orange-700">{item.name}</h2><p className="mt-1 text-sm text-slate-500">/challenges/{item.slug}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabel(item.status)}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-sm"><Metric icon={Users} value={item._count.enrollments} label="Người chơi" /><Metric icon={Activity} value={item._count.teams} label="Đội" /><Metric icon={CalendarDays} value={`v${item.currentRuleset?.version ?? 0}`} label="Ruleset" /></div>
            <p className="mt-4 border-t pt-4 text-sm text-slate-600">{new Date(item.startsAt).toLocaleString("vi-VN")} → {new Date(item.endsAt).toLocaleString("vi-VN")} · {item.enablePoints ? "Tính điểm" : "Xếp hạng theo km"}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required, ...inputProps }: any) { return <label className="text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}<input {...inputProps} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>; }
function Select({ label, value, onChange, options }: any) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-orange-500">{options.map(([key, text]: string[]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function Metric({ icon: Icon, value, label }: any) { return <div className="rounded-xl bg-slate-50 p-3"><Icon className="mb-2 h-4 w-4 text-orange-600" /><strong className="block text-lg text-slate-950">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>; }

