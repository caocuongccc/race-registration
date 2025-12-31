// app/admin/dashboard/emails/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  Check,
} from "lucide-react";

interface Registration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bibNumber: string | null;
  paymentStatus: string;
  distance: { name: string };
  event: { name: string };
}

export default function EmailsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [emailType, setEmailType] = useState("BIB_ANNOUNCEMENT");
  const [events, setEvents] = useState<any[]>([]);

  // NEW: Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent !== "all") {
      loadRegistrations();
    } else {
      setRegistrations([]);
    }
  }, [selectedEvent, emailType]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("eventId", selectedEvent);

      // Filter based on email type
      if (emailType === "BIB_ANNOUNCEMENT") {
        params.append("hasBib", "true");
        params.append("bibEmailNotSent", "true");
      }

      const res = await fetch(`/api/admin/emails/pending?${params.toString()}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setSelectedIds(new Set()); // Reset selection
    } catch (error) {
      toast.error("Không thể tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === registrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map((r) => r.id)));
    }
  };

  // Send selected emails
  const handleSendSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 email");
      return;
    }

    if (!confirm(`Gửi email cho ${selectedIds.size} VĐV đã chọn?`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/send-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationIds: Array.from(selectedIds),
          emailType,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✅ Đã gửi ${result.sent} email thành công, ${result.failed} thất bại`
        );
        loadRegistrations(); // Reload list
      } else {
        toast.error("Có lỗi xảy ra khi gửi email");
      }
    } catch (error) {
      toast.error("Không thể gửi email");
    } finally {
      setSending(false);
    }
  };

  if (loading && selectedEvent !== "all") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gửi Email Có Chọn Lọc
          </h1>
          <p className="text-gray-600 mt-1">
            Chọn từng email cụ thể để gửi (tránh hết quota)
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button onClick={handleSendSelected} isLoading={sending}>
            <Send className="w-4 h-4 mr-2" />
            Gửi {selectedIds.size} email đã chọn
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="Sự kiện"
            >
              <option value="all">-- Chọn sự kiện --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>

            <Select
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              label="Loại email"
            >
              <option value="BIB_ANNOUNCEMENT">📋 Thông báo số BIB</option>
              <option value="RACE_PACK_INFO">📦 Thông tin race pack</option>
              <option value="REMINDER">⏰ Nhắc nhở</option>
            </Select>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={loadRegistrations}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      {selectedEvent !== "all" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Hướng dẫn:</strong> Tích chọn các VĐV muốn gửi email, sau
            đó bấm nút "Gửi X email đã chọn" ở góc trên bên phải.
            <br />
            Gửi từng batch nhỏ (10-20 email) để tránh vượt quota Resend (100
            email/ngày).
          </p>
        </div>
      )}

      {/* Registration List */}
      {selectedEvent === "all" ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Vui lòng chọn sự kiện để bắt đầu</p>
          </CardContent>
        </Card>
      ) : registrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {emailType === "BIB_ANNOUNCEMENT"
                ? "✅ Tất cả VĐV đã nhận email số BIB"
                : "Không có VĐV nào cần gửi email"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách VĐV ({registrations.length})</CardTitle>
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
                        checked={selectedIds.size === registrations.length}
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map((reg, idx) => (
                    <tr
                      key={reg.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedIds.has(reg.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleSelect(reg.id)}
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(reg.id)}
                          onChange={() => toggleSelect(reg.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {reg.bibNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {reg.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {reg.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {reg.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {reg.distance.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedIds.size > 0 && registrations.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold text-lg">
                Đã chọn: {selectedIds.size} / {registrations.length}
              </div>
              <div className="text-sm opacity-90">
                Nhấn để gửi email cho VĐV đã chọn
              </div>
            </div>
            <Button
              onClick={handleSendSelected}
              isLoading={sending}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Send className="w-4 h-4 mr-2" />
              Gửi ngay
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
