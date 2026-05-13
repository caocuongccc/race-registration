"use client";
// app/admin/dashboard/resend-qr/page.tsx
// Gửi lại QR check-in sau thanh toán - theo pattern trang Email

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  QrCode,
  Send,
  RefreshCw,
  Check,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface Registration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bibNumber: string | null;
  paymentStatus: string;
  paymentDate: string | null;
  shirtCategory: string | null;
  shirtType: string | null;
  shirtSize: string | null;
  distance: { name: string };
  event: { name: string };
  emailLogs: { sentAt: string; status: string }[];
}

export default function ResendQRPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent !== "all") {
      loadRegistrations();
    } else {
      setRegistrations([]);
      setSelectedIds(new Set());
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      toast.error("Không thể tải danh sách sự kiện");
    }
  };

  const loadRegistrations = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await fetch(
        `/api/admin/registrations/resend-qr?eventId=${selectedEvent}`,
      );
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch {
      toast.error("Không thể tải danh sách đăng ký");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === registrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map((r) => r.id)));
    }
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 đơn");
      return;
    }

    if (!confirm(`Gửi lại QR check-in cho ${selectedIds.size} VĐV đã chọn?`)) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/registrations/resend-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: Array.from(selectedIds) }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `✅ Gửi thành công ${data.sent} / ${data.total} — Thất bại: ${data.failed}`,
        );
        loadRegistrations();
      } else {
        toast.error(data.error || "Gửi thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <QrCode className="w-8 h-8 text-blue-600" />
            Gửi lại QR Check-in
          </h1>
          <p className="text-gray-600 mt-1">
            Chọn VĐV đã thanh toán bị lỗi QR và gửi lại email
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button onClick={handleSend} isLoading={sending}>
            <Send className="w-4 h-4 mr-2" />
            Gửi lại QR ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Sự kiện"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="all">-- Chọn sự kiện --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </Select>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={loadRegistrations}
                disabled={selectedEvent === "all" || loading}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hint */}
      {selectedEvent !== "all" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Hướng dẫn:</strong> Danh sách hiển thị tất cả VĐV{" "}
            <strong>đã thanh toán</strong>. Tick chọn những người bị lỗi QR rồi bấm{" "}
            <strong>"Gửi lại QR"</strong> ở góc trên phải.
          </p>
        </div>
      )}

      {/* Empty state - chưa chọn event */}
      {selectedEvent === "all" && (
        <Card>
          <CardContent className="py-16 text-center">
            <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Vui lòng chọn sự kiện để xem danh sách</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && selectedEvent !== "all" && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state - không có ai */}
      {!loading && selectedEvent !== "all" && registrations.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">Không có VĐV đã thanh toán nào trong sự kiện này</p>
          </CardContent>
        </Card>
      )}

      {/* Registration Table */}
      {!loading && registrations.length > 0 && (
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách VĐV đã thanh toán ({registrations.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === registrations.length ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Chọn tất cả
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === registrations.length &&
                          registrations.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Số BIB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Họ tên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SĐT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cự ly
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Áo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày TT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email gần nhất
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map((reg, idx) => {
                    const lastEmail = reg.emailLogs?.[0];
                    const isSelected = selectedIds.has(reg.id);

                    return (
                      <tr
                        key={reg.id}
                        onClick={() => toggleSelect(reg.id)}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(reg.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">
                          {reg.bibNumber || "—"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {reg.fullName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{reg.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{reg.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reg.distance.name}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {reg.shirtSize ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="font-medium text-purple-700">
                                {reg.shirtCategory === "MALE"
                                  ? "Nam"
                                  : reg.shirtCategory === "FEMALE"
                                    ? "Nữ"
                                    : reg.shirtCategory === "KID"
                                      ? "Trẻ em"
                                      : reg.shirtCategory || "—"}
                                {" "}
                                {reg.shirtType === "SHORT_SLEEVE"
                                  ? "(Có tay)"
                                  : reg.shirtType === "SLEEVELESS"
                                    ? "(3 lỗ)"
                                    : ""}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full w-fit">
                                Size {reg.shirtSize}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Không có áo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {formatDate(reg.paymentDate)}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {lastEmail ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                lastEmail.status === "SENT"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {lastEmail.status === "SENT" ? "✅ Đã gửi" : "❌ Lỗi"}
                            </span>
                          ) : (
                            <span className="text-orange-500 font-medium">⚠️ Chưa gửi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating send bar */}
      {selectedIds.size > 0 && registrations.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-xl z-50">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold text-lg">
                Đã chọn: {selectedIds.size} / {registrations.length}
              </div>
              <div className="text-sm opacity-80">Nhấn để gửi lại email QR</div>
            </div>
            <Button
              onClick={handleSend}
              isLoading={sending}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Send className="w-4 h-4 mr-2" />
              Gửi lại QR
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
