// app/admin/dashboard/bibs/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Mail, CheckCircle, Clock } from "lucide-react";

export default function BibManagementPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [stats, setStats] = useState({
    totalPaid: 0,
    withBib: 0,
    bibEmailSent: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent !== "all") {
      loadStats();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/admin/bibs/stats?eventId=${selectedEvent}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      toast.error("Không thể tải thống kê");
    }
  };

  const handleSendBibEmails = async () => {
    if (selectedEvent === "all") {
      toast.error("Vui lòng chọn sự kiện");
      return;
    }

    if (
      !confirm(
        `Gửi email thông báo số BIB cho ${stats.withBib} VĐV đã thanh toán?`
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/bibs/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEvent }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✅ Đã gửi ${result.sent.success} email thành công, ${result.sent.failed} thất bại`
        );
        loadStats();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể gửi email");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Quản lý số BIB & Email
        </h1>
        <p className="text-gray-600 mt-1">
          Công bố số BIB và gửi email thông báo cho VĐV
        </p>
      </div>

      {/* Event Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="Chọn sự kiện"
            >
              <option value="all">-- Chọn sự kiện --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>

            {selectedEvent !== "all" && (
              <div className="flex items-end">
                <Button
                  onClick={handleSendBibEmails}
                  isLoading={sending}
                  disabled={stats.pending === 0}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Gửi email thông báo số BIB ({stats.pending})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedEvent !== "all" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalPaid}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Đã thanh toán</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🏃</div>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.withBib}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Đã có số BIB</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Mail className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.bibEmailSent}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Đã gửi email BIB</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Chờ gửi email</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-900">
                📋 Hướng dẫn sử dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">1️⃣</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Tắt "Gửi số BIB ngay" khi tạo/sửa sự kiện
                    </p>
                    <p className="text-gray-600">
                      Vào <strong>Sự kiện → Sửa → Tab Thanh toán</strong> → Bỏ
                      tích "Gửi số BIB ngay khi thanh toán thành công"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">2️⃣</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      VĐV thanh toán → Nhận email xác nhận (chưa có BIB)
                    </p>
                    <p className="text-gray-600">
                      Email thông báo: "Đã nhận thanh toán, sẽ thông báo số BIB
                      sau"
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">3️⃣</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Hệ thống tự động sinh số BIB
                    </p>
                    <p className="text-gray-600">
                      Số BIB được sinh theo thứ tự thanh toán (hoặc admin có thể
                      sửa thủ công)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">4️⃣</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Admin bấm nút "Gửi email thông báo số BIB"
                    </p>
                    <p className="text-gray-600">
                      Tất cả VĐV đã thanh toán sẽ nhận email có số BIB và mã QR
                      check-in
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">
                  💡 <strong>Lưu ý:</strong> Email chỉ được gửi 1 lần cho mỗi
                  VĐV. Nếu cần gửi lại, vào trang Registrations → Chọn VĐV →
                  "Gửi lại email"
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
