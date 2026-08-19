"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, QrCode, ScanLine } from "lucide-react";

type ScannerMode = "scanning" | "loading" | "review" | "done";

function extractToken(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed, window.location.origin);
    const match = url.pathname.match(/\/kid-run\/checkin\/([^/]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {}
  return /^[A-Za-z0-9_-]{20,}$/.test(trimmed) ? trimmed : null;
}

export default function KidRunContinuousScannerPage() {
  const { id } = useParams<{ id: string }>();
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);
  const [mode, setMode] = useState<ScannerMode>("scanning");
  const [application, setApplication] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {}
  }, []);

  const loadToken = useCallback(
    async (nextToken: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      setError("");
      setMode("loading");
      await stopScanner();
      try {
        const res = await fetch(`/api/admin/kid-run/checkin/${nextToken}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.application.campaignId !== id)
          throw new Error("QR này thuộc chương trình Kid Run khác");
        setToken(nextToken);
        setApplication(data.application);
        setSelected(
          data.application.participants
            .filter((participant: any) => !participant.bibCollectedAt)
            .map((participant: any) => participant.id),
        );
        setMode(
          data.application.participants.every(
            (participant: any) => participant.bibCollectedAt,
          )
            ? "done"
            : "review",
        );
      } catch (loadError: any) {
        setError(loadError.message || "Không đọc được QR");
        handledRef.current = false;
        setMode("scanning");
      }
    },
    [id, stopScanner],
  );

  useEffect(() => {
    if (mode !== "scanning") return;
    let cancelled = false;
    handledRef.current = false;
    setApplication(null);
    setSelected([]);
    setToken("");

    void import("html5-qrcode").then(async ({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode("kid-run-continuous-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const nextToken = extractToken(decodedText);
            if (nextToken) void loadToken(nextToken);
            else setError("QR không thuộc hệ thống nhận BIB Kid Run");
          },
          () => undefined,
        );
      } catch (cameraError: any) {
        setError(
          cameraError?.message ||
            "Không mở được camera. Hãy cấp quyền camera hoặc nhập mã thủ công.",
        );
      }
    });

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [loadToken, mode, stopScanner]);

  const confirmPickup = async () => {
    if (!selected.length || !token) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/kid-run/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplication((current: any) => ({
        ...current,
        participants: current.participants.map((participant: any) =>
          selected.includes(participant.id)
            ? { ...participant, bibCollectedAt: new Date().toISOString() }
            : participant,
        ),
      }));
      setMode("done");
    } catch (confirmError: any) {
      setError(confirmError.message || "Không xác nhận được BIB");
    } finally {
      setSaving(false);
    }
  };

  const scanNext = () => {
    setError("");
    setManualValue("");
    setMode("scanning");
  };

  const submitManual = () => {
    const nextToken = extractToken(manualValue);
    if (!nextToken) return setError("Link hoặc token QR không hợp lệ");
    void loadToken(nextToken);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/admin/dashboard/kid-run/${id}`}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <div className="flex items-center gap-2 font-bold text-emerald-800">
          <ScanLine className="h-5 w-5" /> Quét BIB liên tục
        </div>
      </div>

      {mode === "scanning" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div
            id="kid-run-continuous-reader"
            className="mx-auto max-w-lg overflow-hidden rounded-lg"
          />
          <p className="mt-3 text-center text-sm text-slate-600">
            Đưa mã QR vào giữa khung. Camera sẽ tự dừng khi nhận được mã.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitManual()}
              placeholder="Dán link QR hoặc token nếu cần"
              className="h-11 min-w-0 flex-1 rounded-md border px-3"
            />
            <button
              onClick={submitManual}
              className="rounded-md border border-emerald-700 px-4 font-semibold text-emerald-700"
            >
              Mở
            </button>
          </div>
        </div>
      )}

      {mode === "loading" && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-700" />
          <p className="mt-3 font-semibold">Đang tải hồ sơ BIB...</p>
        </div>
      )}

      {application && (mode === "review" || mode === "done") && (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <QrCode className="mt-1 h-7 w-7 text-emerald-700" />
            <div>
              <h1 className="text-xl font-bold">{application.guardianName}</h1>
              <p className="text-sm text-slate-600">
                {application.phone} · {application.publicCode}
              </p>
            </div>
          </div>

          {application.notes && (
            <div className="mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-4">
              <div className="text-sm font-bold uppercase text-amber-800">
                ⚠️ Ghi chú phát BIB
              </div>
              <div className="mt-2 whitespace-pre-wrap font-semibold text-amber-950">
                {application.notes}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {application.participants.map((participant: any) => (
              <label
                key={participant.id}
                className={`flex items-start gap-3 rounded-lg border p-4 ${participant.bibCollectedAt ? "bg-emerald-50" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  disabled={!!participant.bibCollectedAt || mode === "done"}
                  checked={
                    !!participant.bibCollectedAt || selected.includes(participant.id)
                  }
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, participant.id]
                        : current.filter((value) => value !== participant.id),
                    )
                  }
                  className="mt-1 h-6 w-6"
                />
                <div>
                  <div className="text-lg font-bold">
                    BIB {participant.bibNumber} — {participant.fullName}
                  </div>
                  <div className="text-sm text-slate-600">
                    {participant.category.name} · Sinh năm {participant.birthYear}
                  </div>
                  {participant.bibCollectedAt && (
                    <div className="mt-1 text-sm font-semibold text-emerald-700">
                      Đã nhận BIB
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          {mode === "review" ? (
            <button
              disabled={!selected.length || saving}
              onClick={confirmPickup}
              className="mt-5 w-full rounded-lg bg-emerald-700 py-4 text-lg font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Đang xác nhận..."
                : `Xác nhận đã nhận ${selected.length} BIB`}
            </button>
          ) : (
            <div className="mt-5">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-100 p-4 font-bold text-emerald-800">
                <CheckCircle2 /> Đã xác nhận nhận BIB
              </div>
              <button
                onClick={scanNext}
                autoFocus
                className="mt-3 w-full rounded-lg bg-slate-900 py-4 text-lg font-bold text-white"
              >
                Quét mã tiếp theo
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
