"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Baby, CalendarDays, Plus, Users } from "lucide-react";

export default function KidRunAdminPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", eventDate: "", location: "", description: "" });
  const load = () => fetch("/api/admin/kid-run-campaigns").then((r) => r.json()).then((d) => { if (d.error) throw new Error(d.error); setCampaigns(d.campaigns); }).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/kid-run-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); location.href = `/admin/dashboard/kid-run/${data.campaign.id}`;
    } catch (err: any) { setError(err.message); setSaving(false); }
  };
  return <div className="p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Kid Run</h1><p className="mt-1 text-slate-600">Quản lý chương trình, BIB gia đình, áo và check-in</p></div><button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white"><Plus className="h-4 w-4" />Chương trình mới</button></div>
    {error && <div className="mt-5 rounded-md bg-red-50 p-4 text-red-700">{error}</div>}
    {showCreate && <form onSubmit={create} className="mt-6 grid gap-4 rounded-lg border bg-white p-5 shadow-sm md:grid-cols-2">
      <Input label="Tên chương trình" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Input label="Slug" required value={form.slug} onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
      <Input label="Ngày tổ chức" required type="date" value={form.eventDate} onChange={(v) => setForm({ ...form, eventDate: v })} />
      <Input label="Địa điểm" required value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
      <label className="md:col-span-2 text-sm font-medium">Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-28 w-full rounded-md border p-3" /></label>
      <button disabled={saving} className="rounded-md bg-blue-600 px-4 py-3 font-bold text-white md:col-span-2">{saving ? "Đang tạo..." : "Tạo và cấu hình"}</button>
    </form>}
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{campaigns.map((item) => <Link key={item.id} href={`/admin/dashboard/kid-run/${item.id}`} className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-blue-400"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">/kid-run/{item.slug}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status === "OPEN" ? "Đang mở" : item.status === "CLOSED" ? "Đã đóng" : "Bản nháp"}</span></div><div className="mt-4 flex gap-5 text-sm text-slate-600"><span className="flex items-center gap-1"><Users className="h-4 w-4" />{item._count.applications} hồ sơ</span><span className="flex items-center gap-1"><Baby className="h-4 w-4" />{item._count.categories} nhóm</span><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(item.eventDate).toLocaleDateString("vi-VN")}</span></div></Link>)}</div>
  </div>;
}
function Input({ label, value, onChange, type = "text", required = false }: any) { return <label className="text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}<input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-md border px-3" /></label>; }