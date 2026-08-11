"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, QrCode } from "lucide-react";

export default function KidRunCheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [application, setApplication] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () => fetch(`/api/admin/kid-run/checkin/${token}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setApplication(d.application); setSelected(d.application.participants.filter((p: any) => !p.bibCollectedAt).map((p: any) => p.id)); }).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, [token]);
  const confirm = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/kid-run/checkin/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantIds: selected }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); await load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };
  if (!application) return <div className="p-8">{error || "Đang tải hồ sơ..."}</div>;
  const allDone = application.participants.every((p: any) => p.bibCollectedAt);
  return <div className="mx-auto max-w-3xl p-4 md:p-8">
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><QrCode className="h-8 w-8 text-emerald-700" /><div><h1 className="text-2xl font-bold">Nhận BIB gia đình</h1><p className="text-slate-600">{application.campaign.name}</p></div></div>
      <div className="mt-5 rounded-md bg-slate-50 p-4"><div className="font-bold">{application.guardianName}</div><div>{application.phone} · {application.email}</div><div className="mt-1 text-sm">Mã hồ sơ: {application.publicCode}</div></div>
      {allDone && <div className="mt-5 flex items-center gap-2 rounded-md bg-emerald-50 p-4 font-bold text-emerald-800"><CheckCircle2 />Gia đình đã nhận đủ BIB</div>}
      <div className="mt-5 space-y-3">{application.participants.map((p: any, index: number) => <label key={p.id} className={`flex items-start gap-3 rounded-md border p-4 ${p.bibCollectedAt ? "bg-emerald-50" : "cursor-pointer"}`}><input type="checkbox" disabled={!!p.bibCollectedAt} checked={p.bibCollectedAt || selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} className="mt-1 h-5 w-5" /><div><div className="font-bold">BIB {index + 1}: {p.bibNumber} - {p.fullName}</div><div className="text-sm text-slate-600">{p.category.name} · Giới tính: {p.gender === "MALE" ? "Nam" : p.gender === "FEMALE" ? "Nữ" : "Chưa cập nhật"} · Sinh năm {p.birthYear}</div>{p.shirts.length > 0 && <div className="mt-1 text-sm">Áo: {p.shirts.map((s: any) => `${s.styleName} size ${s.size}`).join(", ")} · {application.shirtPaymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</div>}{p.bibCollectedAt && <div className="mt-1 text-sm font-semibold text-emerald-700">Đã nhận lúc {new Date(p.bibCollectedAt).toLocaleString("vi-VN")}</div>}</div></label>)}</div>
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {!allDone && <button onClick={confirm} disabled={!selected.length || saving} className="mt-5 w-full rounded-md bg-emerald-700 py-3 font-bold text-white disabled:opacity-50">{saving ? "Đang thực hiện..." : `Xác nhận đã nhận ${selected.length} BIB`}</button>}
    </div>
  </div>;
}