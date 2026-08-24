"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Webhook, XCircle } from "lucide-react";

export function StravaStatusPanel() {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function load() { const response = await fetch("/api/admin/challenges/strava-status", { cache: "no-store" }); setStatus(await response.json()); }
  useEffect(() => { void load(); }, []);
  async function subscribe() { setBusy(true); try { const response = await fetch("/api/admin/challenges/strava-status", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await load(); } catch (error) { setStatus((current: any) => ({ ...current, actionError: error instanceof Error ? error.message : "Không thể đăng ký webhook" })); } finally { setBusy(false); } }
  if (!status) return <div className="mt-6 flex items-center gap-2 rounded-2xl border bg-white p-4 text-sm text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" />Đang kiểm tra kết nối Strava...</div>;
  const subscribed = status.subscriptions?.length > 0;
  return <section className={`mt-6 rounded-2xl border p-5 ${status.ready && subscribed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3">{status.ready && subscribed ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <XCircle className="h-6 w-6 text-amber-600" />}<div><h2 className="font-bold text-slate-950">Trạng thái tích hợp Strava</h2>{status.ready ? <div className="mt-1 space-y-1 text-sm text-slate-600"><p>{subscribed ? `Webhook đang hoạt động · subscription #${status.subscriptions[0].id}` : "Chưa đăng ký webhook subscription."}</p><p>{status.connectedAthletes} tài khoản kết nối · {status.pendingJobs} job đang chờ · {status.failedJobs} job lỗi</p><p className="break-all text-xs">Callback OAuth: {status.redirectUri}</p><p className="break-all text-xs">Webhook: {status.callbackUrl}</p></div> : <p className="mt-1 text-sm text-amber-800">{status.error}</p>}</div></div>{status.ready && !subscribed && <button disabled={busy || !status.callbackUsesHttps} onClick={subscribe} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Webhook className="h-4 w-4" />{busy ? "Đang đăng ký..." : "Đăng ký webhook"}</button>}</div>{status.actionError && <p className="mt-3 text-sm text-red-700">{status.actionError}</p>}{status.ready && !status.callbackUsesHttps && <p className="mt-3 text-sm text-amber-800">Webhook chỉ đăng ký được sau khi deploy lên domain HTTPS public.</p>}</section>;
}

