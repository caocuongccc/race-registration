"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface WebhookLog {
  id: string;
  event: string;
  eventId: string | null;
  eventName: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  rawPayload: string;
  code: string | null;
  content: string | null;
  transactionId: string | number | null;
  registrationId: string | null;
  amount: number | null;
  accountNumber: string | null;
  subAccount: string | null;
  bank: string | null;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  lastRetryAt: string | null;
  retrySourceId: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusOptions = [
  "all",
  "RECEIVED",
  "SUCCESS",
  "FAILED",
  "NO_ORDER_CODE",
  "UNAUTHORIZED",
];

const eventOptions = [
  "all",
  "payment.received",
  "payment.processed",
  "payment.retry",
  "payment.error",
  "payment.parse",
  "payment.auth",
];

function formatCurrency(amount: number | null) {
  if (!amount) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatRetryTime(value: string | null) {
  if (!value) return "-";
  return formatDateTime(value);
}

function getStatusBadge(status: string) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" /> SUCCESS
      </span>
    );
  }

  if (status === "FAILED" || status === "UNAUTHORIZED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> {status}
      </span>
    );
  }

  if (status === "NO_ORDER_CODE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        <AlertCircle className="h-3 w-3" /> NO CODE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
      <ClipboardList className="h-3 w-3" /> {status}
    </span>
  );
}

function formatPayload(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [event, setEvent] = useState("all");
  const [eventId, setEventId] = useState("all");
  const [events, setEvents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryCodeById, setRetryCodeById] = useState<Record<string, string>>(
    {},
  );

  const params = useMemo(() => {
    const next = new URLSearchParams();
    next.set("page", String(pagination.page));
    next.set("limit", String(pagination.limit));
    if (status !== "all") next.set("status", status);
    if (event !== "all") next.set("event", event);
    if (eventId !== "all") next.set("eventId", eventId);
    if (search.trim()) next.set("search", search.trim());
    return next;
  }, [event, eventId, pagination.limit, pagination.page, search, status]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/webhooks?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load logs");
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (error: any) {
      toast.error(error.message || "Khong the tai webhook logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [params]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/admin/events");
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error("Failed to load events:", error);
      }
    };

    loadEvents();
  }, []);

  const resetToFirstPage = () => {
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const canRetry = (log: WebhookLog) =>
    ["FAILED", "NO_ORDER_CODE"].includes(log.status);

  const retryWebhook = async (log: WebhookLog) => {
    const overrideCode = retryCodeById[log.id]?.trim();

    if (log.status === "NO_ORDER_CODE" && !overrideCode) {
      toast.error("Nhap ma dang ky hoac ma don ao de retry webhook nay");
      return;
    }

    setRetryingId(log.id);
    try {
      const res = await fetch(`/api/admin/webhooks/${log.id}/retry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ overrideCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.result?.error ||
            data.result?.message ||
            "Retry failed",
        );
      }

      toast.success("Retry webhook thanh cong");
      setRetryCodeById((current) => {
        const next = { ...current };
        delete next[log.id];
        return next;
      });
      await loadLogs();
    } catch (error: any) {
      toast.error(error.message || "Retry webhook that bai");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Webhook Logs</h1>
          <p className="mt-1 text-gray-600">
            Theo doi request SePay va ket qua xu ly thanh toan
          </p>
        </div>
        <Button onClick={loadLogs} variant="outline" disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Lam moi
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Input
              placeholder="Tim DH..., transaction, account..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetToFirstPage();
              }}
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                resetToFirstPage();
              }}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Tat ca trang thai" : option}
                </option>
              ))}
            </Select>
            <Select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                resetToFirstPage();
              }}
            >
              <option value="all">Tat ca su kien</option>
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                resetToFirstPage();
              }}
            >
              {eventOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Tat ca event" : option}
                </option>
              ))}
            </Select>
            <Select
              value={String(pagination.limit)}
              onChange={(e) =>
                setPagination((current) => ({
                  ...current,
                  page: 1,
                  limit: Number(e.target.value),
                }))
              }
            >
              <option value="25">25 dong</option>
              <option value="50">50 dong</option>
              <option value="100">100 dong</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Danh sach log ({pagination.total.toLocaleString("vi-VN")})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Thoi gian</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Su kien</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Retry</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">So tien</th>
                    <th className="px-4 py-3">Tai khoan</th>
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Loi</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {log.event}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3">
                        {log.eventName || log.eventId || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <div className="font-medium">
                          {log.retryCount}/{log.maxRetries}
                          {log.retryable ? " - auto" : ""}
                        </div>
                        <div className="text-gray-500">
                          {formatRetryTime(log.nextRetryAt)}
                        </div>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 font-mono">
                        {log.code || log.registrationId || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-blue-600">
                        {formatCurrency(log.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <div>{log.bank || "-"}</div>
                        <div className="text-gray-500">
                          {log.subAccount || log.accountNumber || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {log.transactionId || "-"}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-red-600">
                        {log.errorMessage || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canRetry(log) && (
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-9 w-44"
                                placeholder="Ma DK/AO neu can"
                                value={retryCodeById[log.id] || ""}
                                onChange={(e) =>
                                  setRetryCodeById((current) => ({
                                    ...current,
                                    [log.id]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryWebhook(log)}
                                disabled={retryingId === log.id}
                              >
                                {retryingId === log.id ? "Dang retry" : "Retry"}
                              </Button>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            Payload
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logs.length === 0 && (
                <div className="py-16 text-center text-gray-500">
                  Chua co webhook log phu hop.
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: Math.max(current.page - 1, 1),
                  }))
                }
              >
                Truoc
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[85vh] w-full max-w-4xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle>Raw Payload</CardTitle>
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Dong
              </Button>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-auto pt-6">
              <pre className="whitespace-pre-wrap break-words rounded bg-gray-950 p-4 text-xs text-gray-100">
                {formatPayload(selectedLog.rawPayload)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
