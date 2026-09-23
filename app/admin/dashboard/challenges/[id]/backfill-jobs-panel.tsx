"use client";

import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";

export function BackfillJobsPanel({ eventId, startsAt, endsAt }: { eventId: string; startsAt: string; endsAt: string }) {
  const local = (value: string) => new Date(value).toISOString().slice(0, 16);
  const [range, setRange] = useState({ from: local(startsAt), to: local(endsAt) });
  const [jobs, setJobs] = useState<any[]>([]); const [counts, setCounts] = useState<any>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function load() { const response = await fetch(`/api/admin/challenges/${eventId}/jobs`, { cache: "no-store" }); const data = await response.json(); if (response.ok) { setJobs(data.jobs); setCounts(data.counts); } }
  useEffect(() => { void load(); const timer = setInterval(load, 10000); return () => clearInterval(timer); }, [eventId]);
  async function backfill() { setBusy(true); setMessage(""); try { const response = await fetch(`/api/admin/challenges/${eventId}/backfill`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: new Date(range.from).toISOString(), to: new Date(range.to).toISOString() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage(`Đã tạo job đồng bộ cho ${data.queued} vận động viên.`); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đồng bộ bù"); } finally { setBusy(false); } }
  async function retry(jobId: string) { setBusy(true); const response = await fetch(`/api/admin/challenges/${eventId}/jobs/${jobId}/retry`, { method: "POST" }); const data = await response.json(); setMessage(response.ok ? "Đã đưa job vào hàng đợi." : data.error); await load(); setBusy(false); }
  return <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm md:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Đồng bộ bù & hàng đợi</h2><p className="mt-1 text-sm text-slate-500">Dùng khi vừa kích hoạt lại Strava hoặc webhook bỏ lỡ activity.</p></div><button onClick={load} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Field label="Từ" value={range.from} onChange={(v) => setRange({ ...range, from: v })} /><Field label="Đến" value={range.to} onChange={(v) => setRange({ ...range, to: v })} /><button disabled={busy} onClick={backfill} className="mt-6 h-11 rounded-xl bg-orange-600 px-5 font-bold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : "Tạo đồng bộ bù"}</button></div>{message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{message}</p>}<div className="mt-5 grid grid-cols-4 gap-2">{[["QUEUED","Chờ"],["RUNNING","Chạy"],["COMPLETED","Xong"],["FAILED","Lỗi"]].map(([key,label]) => <div key={key} className="rounded-xl bg-slate-50 p-3 text-center"><strong className="block text-xl">{counts[key] ?? 0}</strong><span className="text-xs text-slate-500">{label}</span></div>)}</div><div className="mt-5 max-h-80 overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Loại</th><th className="p-3">Trạng thái</th><th className="p-3">Thời gian</th><th className="p-3"></th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id} className="border-t"><td className="p-3">{job.type}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${job.status === "FAILED" ? "bg-red-100 text-red-700" : job.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{job.status}</span>{job.lastError && <p className="mt-1 max-w-xs truncate text-xs text-red-600" title={job.lastError}>{job.lastError}</p>}{job.progressJson && <Progress value={job.progressJson} />}</td><td className="p-3 text-xs text-slate-500">{new Date(job.createdAt).toLocaleString("vi-VN")}</td><td className="p-3">{job.status === "FAILED" && <button disabled={busy} onClick={() => retry(job.id)} className="rounded-lg p-2 text-orange-700 hover:bg-orange-50"><RotateCcw className="h-4 w-4" /></button>}</td></tr>)}</tbody></table></div></section>;
}
function Field({ label, value, onChange }: any) { return <label className="text-sm font-medium">{label}<input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3" /></label>; }


function Progress({ value }: { value: any }) {
  const rate = value?.rateLimit;
  const shortPercent = rate?.shortLimit ? Math.round((rate.shortUsage / rate.shortLimit) * 100) : null;
  const dailyPercent = rate?.dailyLimit ? Math.round((rate.dailyUsage / rate.dailyLimit) * 100) : null;
  const warning = (shortPercent ?? 0) >= 80 || (dailyPercent ?? 0) >= 80;
  return <p className={`mt-1 text-xs ${warning ? "font-semibold text-red-600" : "text-slate-500"}`}>
    {value.page ? `Trang ${value.page} · ${value.found ?? 0} activity` : `${value.rebuilt ?? value.enqueued ?? 0} bản ghi`}
    {shortPercent !== null && ` · API 15 phút ${shortPercent}%`}
    {dailyPercent !== null && ` · ngày ${dailyPercent}%`}
  </p>;
}
