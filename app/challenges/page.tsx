"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, LogOut, Medal, RefreshCw, Users } from "lucide-react";

export default function ChallengesHomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenges/me", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? (await response.json()).user : null,
      )
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-orange-600" />
      </main>
    );
  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-slate-100 p-5">
        <section className="w-full max-w-lg rounded-3xl border bg-white p-7 text-center shadow-xl md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="mt-6 text-3xl font-black text-slate-950">
            Thử thách chạy bộ
          </h1>
          <p className="mt-3 text-slate-600">
            Kết nối Strava để hoạt động được đồng bộ tự động và xem kết quả cá
            nhân, đội của bạn.
          </p>
          <a
            href="/api/strava/oauth/start?returnTo=/challenges"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#FC4C02] px-5 py-3.5 font-bold text-white hover:bg-[#df4402]"
          >
            Đăng nhập bằng Strava
          </a>
          <p className="mt-4 text-xs text-slate-400">
            Hệ thống chỉ đọc dữ liệu activity cần thiết cho sự kiện.
          </p>
        </section>
      </main>
    );

  const totalBySlug = new Map(
    user.athleteTotals.map((total: any) => [total.event.slug, total]),
  );
  async function logout() {
    await fetch("/api/challenges/logout", { method: "POST" });
    window.location.reload();
  }
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
            )}
            <div>
              <strong className="block text-slate-950">
                {user.displayName}
              </strong>
              <label className="mt-1 block text-xs text-slate-500">
                Giới tính:{" "}
                <select
                  value={user.gender}
                  onChange={async (e) => {
                    const gender = e.target.value;
                    const response = await fetch("/api/challenges/me", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ gender }),
                    });
                    if (response.ok) setUser({ ...user, gender });
                  }}
                  className="bg-transparent font-semibold text-slate-700"
                >
                  <option value="UNSPECIFIED">Chưa chọn</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </label>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-600"
          >
            <LogOut className="h-4 w-4" />
            Thoát
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-7">
        <h1 className="text-3xl font-black text-slate-950">Sự kiện của tôi</h1>
        <p className="mt-2 text-slate-600">
          Kết quả mới thường xuất hiện sau 5–30 giây.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {user.enrollments.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">
              Bạn chưa được thêm vào sự kiện nào. Hãy liên hệ đơn vị tổ chức.
            </div>
          )}
          {user.enrollments.map((enrollment: any) => {
            const total: any = totalBySlug.get(enrollment.event.slug);
            const team = enrollment.teamMemberships[0]?.team;
            return (
              <Link
                href={`/challenges/${enrollment.event.slug}`}
                key={enrollment.id}
                className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {enrollment.event.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(enrollment.event.startsAt).toLocaleDateString(
                        "vi-VN",
                      )}{" "}
                      –{" "}
                      {new Date(enrollment.event.endsAt).toLocaleDateString(
                        "vi-VN",
                      )}
                    </p>
                  </div>
                  <Medal className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Result
                    label="Quãng đường"
                    value={`${((total?.distanceMeters ?? 0) / 1000).toFixed(2)} km`}
                  />
                  {enrollment.event.enablePoints && (
                    <Result
                      label="Điểm"
                      value={Number(total?.points ?? 0).toFixed(2)}
                    />
                  )}
                </div>
                {team && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <Users className="h-4 w-4 text-orange-600" />
                    Đội: <strong>{team.name}</strong>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-orange-50 p-4">
      <span className="text-xs font-semibold uppercase text-orange-700">
        {label}
      </span>
      <strong className="mt-2 block text-2xl text-slate-950">{value}</strong>
    </div>
  );
}
