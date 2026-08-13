"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + " đ";

export default function KidRunPaymentReconciliationPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/kid-run-payment-reconciliation");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions(data.transactions || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const confirmMatch = async (transaction: any, application: any) => {
    if (
      !window.confirm(
        `Gán giao dịch ${transaction.transactionId} (${money(transaction.amount)}) cho ${application.guardianName} - ${application.publicCode}?`,
      )
    )
      return;
    setProcessing(`${transaction.id}:${application.id}`);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/kid-run-payment-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: transaction.id,
          applicationId: application.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(
        `Đã xác nhận ${data.publicCode}. Hệ thống đã cập nhật thanh toán và kích hoạt gửi email xác nhận áo.`,
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing("");
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Đối soát tiền áo Kid Run</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ghép thủ công webhook chưa có mã với hồ sơ đang chờ thanh toán có
            cùng số tiền. Hãy đối chiếu giờ, ngân hàng và người chuyển trước khi
            xác nhận.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Tải lại
        </button>
      </div>
      {error && <div className="mt-4 rounded-md bg-red-50 p-4 text-red-700">{error}</div>}
      {notice && <div className="mt-4 rounded-md bg-emerald-50 p-4 text-emerald-700">{notice}</div>}
      <div className="mt-6 space-y-5">
        {transactions.map((transaction) => (
          <section key={transaction.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="grid gap-2 text-sm md:grid-cols-4">
              <div><span className="text-slate-500">Thời gian</span><div className="font-semibold">{new Date(transaction.createdAt).toLocaleString("vi-VN")}</div></div>
              <div><span className="text-slate-500">Số tiền</span><div className="text-lg font-bold text-emerald-700">{money(transaction.amount)}</div></div>
              <div><span className="text-slate-500">Ngân hàng</span><div className="font-semibold">{transaction.bank || "—"}</div></div>
              <div><span className="text-slate-500">Transaction ID</span><div className="font-mono">{transaction.transactionId}</div></div>
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
              Nội dung ngân hàng: {transaction.content || "Không có"}
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold">{transaction.matchType === "EXACT_CODE" ? "Hồ sơ khớp chính xác theo mã chuyển khoản" : "Hồ sơ chỉ khớp theo số tiền"}</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${transaction.matchType === "EXACT_CODE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {transaction.matchType === "EXACT_CODE" ? transaction.detectedCode : "Cần đối chiếu thủ công"}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {transaction.candidates.map((application: any) => (
                  <div key={application.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm">
                      <div className="font-bold">{application.guardianName} · {application.publicCode}</div>
                      <div>{application.phone} · {application.email}</div>
                      <div className="text-slate-500">{application.participants.map((p: any) => `${p.fullName} (${p.bibNumber})`).join("; ")}</div>
                      <div className="mt-1">Áo: {application.shirts.map((s: any) => `${s.styleName} ${s.size} x${s.quantity}`).join("; ")}</div>
                    </div>
                    <button
                      disabled={Boolean(processing)}
                      onClick={() => confirmMatch(transaction, application)}
                      className="shrink-0 rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      {processing === `${transaction.id}:${application.id}` ? "Đang xử lý..." : "Xác nhận cho hồ sơ này"}
                    </button>
                  </div>
                ))}
                {transaction.candidates.length === 0 && (
                  <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Không có hồ sơ PENDING nào khớp đúng số tiền.</div>
                )}
              </div>
            </div>
          </section>
        ))}
        {!loading && transactions.length === 0 && (
          <div className="rounded-lg border bg-white p-10 text-center text-slate-500">Không còn webhook NO CODE cần đối soát.</div>
        )}
      </div>
    </div>
  );
}
