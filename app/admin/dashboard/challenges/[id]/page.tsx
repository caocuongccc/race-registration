"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, ShieldCheck, Users } from "lucide-react";
import { TeamMembersManager } from "./team-members-manager";
import { BackfillJobsPanel } from "./backfill-jobs-panel";
import { ParticipantsManager } from "./participants-manager";
import { EventStatusControl } from "./event-status-control";
import { RuleSimulator } from "./rule-simulator";
import { AdvancedRulesPanel } from "./advanced-rules-panel";
import { ActivityReviewPanel } from "./activity-review-panel";

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState({ name: "", maxMembers: 10 });
  const [rules, setRules] = useState({
    minimumMeters: 1000, gpsMode: "BASIC", heartRate: false, heartRateStream: false,
    paceEnabled: false, minimumPace: 180, maximumPace: 900, individualCapKm: "", teamCapKm: "",
    weekendMultiplier: "", scope: "FROM_NOW", reason: "",
  });

  async function load() {
    try {
      const response = await fetch(`/api/admin/challenges/${id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload.event);
      const config = payload.event.currentRuleset?.configJson;
      if (config) setRules((current) => ({ ...current,
        minimumMeters: config.distance.minimumMeters,
        gpsMode: config.gps.mode,
        heartRate: config.heartRate.enabled,
        heartRateStream: config.heartRate.requireStream,
        paceEnabled: config.pace.enabled,
        minimumPace: config.pace.minimumSecondsPerKm,
        maximumPace: config.pace.maximumSecondsPerKm,
        individualCapKm: config.caps.individualDailyMeters ? String(config.caps.individualDailyMeters / 1000) : "",
        teamCapKm: config.caps.teamDailyMeters ? String(config.caps.teamDailyMeters / 1000) : "",
        weekendMultiplier: config.scoring.weekendMultiplier ? String(config.scoring.weekendMultiplier) : "",
      }));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Không thể tải sự kiện"); }
  }
  useEffect(() => { void load(); }, [id]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/challenges/${id}/teams`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(team) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setTeam({ name: "", maxMembers: data.defaultTeamSize || 10 }); await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không thể tạo đội"); } finally { setBusy(false); }
  }

  async function publishRules(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const previous = data.currentRuleset.configJson;
      const config = { ...previous,
        gps: { ...previous.gps, enabled: true, mode: rules.gpsMode },
        heartRate: { enabled: rules.heartRate, requireStream: rules.heartRate && rules.heartRateStream },
        distance: { minimumMeters: Number(rules.minimumMeters) },
        pace: { ...previous.pace, enabled: rules.paceEnabled, minimumSecondsPerKm: Number(rules.minimumPace), maximumSecondsPerKm: Number(rules.maximumPace) },
        caps: { individualDailyMeters: rules.individualCapKm ? Number(rules.individualCapKm) * 1000 : null, teamDailyMeters: rules.teamCapKm ? Number(rules.teamCapKm) * 1000 : null },
        scoring: { ...previous.scoring, enabled: data.enablePoints, pointsPerKm: Number(data.pointsPerKm), weekendMultiplier: rules.weekendMultiplier ? Number(rules.weekendMultiplier) : null },
      };
      const response = await fetch(`/api/admin/challenges/${id}/rulesets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ effectiveFrom: new Date().toISOString(), applicationScope: rules.scope, changeReason: rules.reason || null, config, specialDays: data.currentRuleset.specialDays.map((day: any) => ({ localDate: day.localDate, name: day.name, multiplier: Number(day.multiplier) })) }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không thể xuất bản rule"); } finally { setBusy(false); }
  }

  if (!data) return <main className="p-8"><div className="rounded-2xl border bg-white p-12 text-center text-slate-500">{error || "Đang tải sự kiện..."}</div></main>;
  return <main className="p-4 md:p-8">
    <Link href="/admin/dashboard/challenges" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700"><ArrowLeft className="h-4 w-4" />Danh sách Challenge</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-orange-600">Ruleset v{data.currentRuleset?.version}</p><h1 className="text-3xl font-bold text-slate-950">{data.name}</h1><p className="mt-2 text-slate-600">{new Date(data.startsAt).toLocaleString("vi-VN")} → {new Date(data.endsAt).toLocaleString("vi-VN")}</p></div><EventStatusControl eventId={id} status={data.status} onChanged={load} /></div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Stat label="Người tham gia" value={data._count.enrollments} icon={Users} /><Stat label="Số đội" value={data.teams.length} icon={Users} /><Stat label="Activity đã xét" value={data._count.evaluations} icon={CheckCircle2} /></div>

    <div className="mt-7 grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={publishRules} className="rounded-2xl border bg-white p-5 shadow-sm md:p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-orange-600" /><div><h2 className="text-xl font-bold">Luật ghi nhận activity</h2><p className="text-sm text-slate-500">Mỗi lần lưu sẽ tạo một version mới, không ghi đè lịch sử.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Tracklog tối thiểu (m)" type="number" value={String(rules.minimumMeters)} onChange={(v) => setRules({ ...rules, minimumMeters: Number(v) })} /><Select label="Kiểm tra GPS" value={rules.gpsMode} onChange={(v) => setRules({ ...rules, gpsMode: v })} options={[["BASIC", "GPS cơ bản"], ["STRICT", "GPS stream nghiêm ngặt"]]} /><Toggle label="Bắt buộc nhịp tim" checked={rules.heartRate} onChange={(v) => setRules({ ...rules, heartRate: v, heartRateStream: v && rules.heartRateStream })} /><Toggle label="Bắt buộc HR stream" checked={rules.heartRateStream} disabled={!rules.heartRate} onChange={(v) => setRules({ ...rules, heartRateStream: v })} /><Toggle label="Kiểm tra pace từng km" checked={rules.paceEnabled} onChange={(v) => setRules({ ...rules, paceEnabled: v })} />{rules.paceEnabled && <><Field label="Pace nhanh nhất (giây/km)" type="number" value={String(rules.minimumPace)} onChange={(v) => setRules({ ...rules, minimumPace: Number(v) })} /><Field label="Pace chậm nhất (giây/km)" type="number" value={String(rules.maximumPace)} onChange={(v) => setRules({ ...rules, maximumPace: Number(v) })} /></>}<Field label="Cap cá nhân/ngày (km, để trống = không cap)" type="number" value={rules.individualCapKm} onChange={(v) => setRules({ ...rules, individualCapKm: v })} /><Field label="Cap đội/ngày (km, để trống = không cap)" type="number" value={rules.teamCapKm} onChange={(v) => setRules({ ...rules, teamCapKm: v })} />{data.enablePoints && <Field label="Hệ số cuối tuần" type="number" value={rules.weekendMultiplier} onChange={(v) => setRules({ ...rules, weekendMultiplier: v })} />}<Select label="Phạm vi áp dụng" value={rules.scope} onChange={(v) => setRules({ ...rules, scope: v })} options={[["FROM_NOW", "Chỉ từ bây giờ"], ["FROM_SELECTED_DATETIME", "Từ thời điểm này và quét lại"], ["RECALCULATE_WHOLE_EVENT", "Quét lại toàn sự kiện"]]} /><label className="text-sm font-medium md:col-span-2">Lý do thay đổi<textarea value={rules.reason} onChange={(e) => setRules({ ...rules, reason: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label></div>
        {rules.scope !== "FROM_NOW" && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Hệ thống sẽ đánh giá lại activity cũ. Điểm và thứ hạng có thể giảm.</div>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? "Đang lưu..." : "Xuất bản ruleset mới"}</button>
      </form>

      <section className="rounded-2xl border bg-white p-5 shadow-sm md:p-6"><h2 className="text-xl font-bold">Đội tham gia</h2><p className="mt-1 text-sm text-slate-500">Quota chỉ đếm thành viên đang hoạt động.</p><form onSubmit={createTeam} className="mt-5 grid grid-cols-[1fr_110px] gap-3"><Field label="Tên đội" required value={team.name} onChange={(v) => setTeam({ ...team, name: v })} /><Field label="Tối đa" type="number" min="1" required value={String(team.maxMembers)} onChange={(v) => setTeam({ ...team, maxMembers: Number(v) })} /><button disabled={busy} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white"><Plus className="h-4 w-4" />Tạo đội</button></form>
        <div className="mt-5 space-y-3">{data.teams.map((item: any) => <div key={item.id} className="rounded-xl border p-4"><div className="flex items-center justify-between"><strong>{item.name}</strong><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.memberships.length}/{item.maxMembers}</span></div><TeamMembersManager eventId={id} team={item} onChanged={load} /></div>)}</div>
      </section>
    </div>
    <AdvancedRulesPanel eventId={id} currentRuleset={data.currentRuleset} enablePoints={data.enablePoints} pointsPerKm={data.pointsPerKm} onChanged={load} />
    <RuleSimulator eventId={id} />
    <ParticipantsManager eventId={id} />
    <ActivityReviewPanel eventId={id} />
    <BackfillJobsPanel eventId={id} startsAt={data.startsAt} endsAt={data.endsAt} />
  </main>;
}

function Field({ label, value, onChange, type = "text", required, ...rest }: any) { return <label className="text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}<input {...rest} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 focus:border-orange-500 focus:outline-none" /></label>; }
function Select({ label, value, onChange, options }: any) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{options.map(([key, text]: string[]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function Toggle({ label, checked, onChange, disabled = false }: any) { return <label className={`flex items-center gap-3 rounded-xl border p-3 ${disabled ? "opacity-50" : ""}`}><input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-orange-600" /><span className="text-sm font-medium">{label}</span></label>; }
function Stat({ label, value, icon: Icon }: any) { return <div className="rounded-2xl border bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-orange-600" /><strong className="mt-3 block text-2xl">{value}</strong><span className="text-sm text-slate-500">{label}</span></div>; }

