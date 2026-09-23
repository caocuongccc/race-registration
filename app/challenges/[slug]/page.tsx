"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Medal,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";

const tabs = [
  ["overall", "Tổng"],
  ["male", "Nam"],
  ["female", "Nữ"],
  ["team", "Đội"],
] as const;

export default function ChallengeEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tab, setTab] = useState("overall");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [resyncMessage, setResyncMessage] = useState("");

  useEffect(() => {
    fetch(`/api/challenges/${slug}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSummary(data);
        if (data.me)
          fetch(`/api/challenges/${slug}/activities`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((value) => setActivities(value?.activities ?? []));
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [slug]);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/challenges/${slug}/leaderboard?type=${tab}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, [slug, tab]);

  async function resyncActivity(activityId: string) {
    setResyncingId(activityId);
    setResyncMessage("");
    try {
      const response = await fetch(`/api/challenges/${slug}/activities/${activityId}/resync`, { method: "POST" });
      const data = await response.json();
      setResyncMessage(response.ok ? data.message : data.error);
    } finally {
      setResyncingId(null);
    }
  }
  if (!summary && loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-orange-600" />
      </main>
    );
  if (!summary)
    return (
      <main className="p-8 text-center text-red-700">
        {error || "Không tìm thấy sự kiện"}
      </main>
    );
  const event = summary.event;
  const metric =
    event.enablePoints && event.rankingMetric === "POINTS"
      ? "points"
      : "distance";
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Sự kiện của tôi
          </Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-orange-600">
                Strava Challenge
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">
                {event.name}
              </h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                {event.description}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
              <strong className="block text-lg">
                {event._count.enrollments} vận động viên
              </strong>
              <span className="text-sm text-slate-300">
                {event._count.teams} đội tham gia
              </span>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-7">
        {summary.me && (
          <section className="rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Thành tích của bạn</p>
                <h2 className="text-xl font-bold">{summary.me.displayName}</h2>
                {summary.me.team && (
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    {summary.me.team.name}
                  </p>
                )}
              </div>
              <Medal className="h-9 w-9 text-orange-100" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini
                label="Quãng đường"
                value={`${(summary.me.distanceMeters / 1000).toFixed(2)} km`}
              />
              {event.enablePoints && (
                <Mini label="Điểm" value={summary.me.points.toFixed(2)} />
              )}
            </div>
          </section>
        )}
        <section className="mt-7 rounded-2xl border bg-white p-4 shadow-sm md:p-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[60px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500">
              <span>Hạng</span>
              <span>{tab === "team" ? "Đội" : "Vận động viên"}</span>
              <span className="text-right">
                {metric === "points" ? "Điểm" : "Km"}
              </span>
            </div>
            {rows.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">
                Chưa có thành tích.
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.teamId ?? row.userId}
                className="grid grid-cols-[60px_1fr_120px] items-center border-t px-4 py-3"
              >
                <strong
                  className={
                    row.rank <= 3 ? "text-orange-600" : "text-slate-500"
                  }
                >
                  #{row.rank}
                </strong>
                <div className="min-w-0">
                  <strong className="truncate">{row.name}</strong>
                  {tab === "team" && (
                    <span className="ml-2 text-xs text-slate-400">
                      {row.memberCount}/{row.maxMembers} người
                    </span>
                  )}
                </div>
                <strong className="text-right">
                  {metric === "points"
                    ? row.points.toFixed(2)
                    : `${(row.distanceMeters / 1000).toFixed(2)}`}
                </strong>
              </div>
            ))}
          </div>
        </section>
        {summary.me && (
          <section className="mt-7">
            <h2 className="text-xl font-bold text-slate-950">
              Activity của tôi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Activity bị loại vẫn được giữ để bạn biết lý do.
            </p>
{resyncMessage && <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-700">{resyncMessage}</p>}
            <div className="mt-4 space-y-3">
              {activities.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-400">
                  Chưa có activity được đồng bộ.
                </div>
              )}
              {activities.map((item) => (
                <article
                  key={item.evaluationId}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {item.activity.name || item.activity.sportType}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(item.activity.startDate).toLocaleString(
                          "vi-VN",
                        )}{" "}
                        · {(item.activity.distanceMeters / 1000).toFixed(2)} km
                      </p>
                    </div>
{item.status === "REJECTED" ? (
                      <XCircle className="h-6 w-6 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    )}
                  </div>
<button
                    type="button"
                    disabled={resyncingId === item.activity.id}
                    onClick={() => resyncActivity(item.activity.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-orange-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${resyncingId === item.activity.id ? "animate-spin" : ""}`} />
                    Đồng bộ lại từ Strava
                  </button>
                  {item.status === "REJECTED" ? (
                    <ul className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      {item.reasons.map((reason: string) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                        Cá nhân:{" "}
                        {(item.creditedIndividualMeters / 1000).toFixed(2)} km
                      </span>
                      {item.teamName && (
                        <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                          Đội: {(item.creditedTeamMeters / 1000).toFixed(2)} km
                        </span>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <span className="text-xs text-orange-100">{label}</span>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}


