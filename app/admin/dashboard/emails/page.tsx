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
} from "lucide-react";

interface EmailLog {
  id: string;
  emailType: string;
  subject: string | null;
  status: string;
  sentAt: Date;
  errorMessage: string | null;
  registration: {
    fullName: string;
    email: string;
    bibNumber: string | null;
  };
}

export default function EmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedEvent, statusFilter, typeFilter]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEvent !== "all") params.append("eventId", selectedEvent);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await fetch(`/api/admin/emails?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs);
    } catch (error) {
      toast.error("Không thể tải danh sách email");
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkEmails = async () => {
    if (selectedEvent === "all") {
      toast.error("Vui lòng chọn sự kiện");
      return;
    }

    if (
      !confirm(
        "Bạn có chắc muốn gửi email thông tin race pack cho tất cả VĐV đã thanh toán?"
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent,
          emailType: "RACE_PACK_INFO",
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✅ Đã gửi ${result.sent} email thành công, ${result.failed} thất bại`
        );
        loadLogs();
      } else {
        toast.error("Có lỗi xảy ra khi gửi email");
      }
    } catch (error) {
      toast.error("Không thể gửi email");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Đã gửi
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Đã giao
          </span>
        );
      case "OPENED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Đã mở
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" />
            Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      REGISTRATION_PENDING: "Xác nhận đăng ký",
      PAYMENT_CONFIRMED: "Thanh toán thành công",
      RACE_PACK_INFO: "Thông tin race pack",
      REMINDER: "Nhắc nhở",
      CUSTOM: "Tùy chỉnh",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sentCount = logs.filter((l) => l.status === "SENT").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Email</h1>
          <p className="text-gray-600 mt-1">
            Tổng: {logs.length} email (
            <span className="text-green-600 font-medium">
              {sentCount} thành công
            </span>
            ,{" "}
            <span className="text-red-600 font-medium">
              {failedCount} thất bại
            </span>
            )
          </p>
        </div>
        <Button onClick={handleSendBulkEmails} isLoading={sending}>
          <Send className="w-4 h-4 mr-2" />
          Gửi email hàng loạt
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="Sự kiện"
            >
              <option value="all">Tất cả sự kiện</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="SENT">Đã gửi</option>
              <option value="DELIVERED">Đã giao</option>
              <option value="OPENED">Đã mở</option>
              <option value="FAILED">Thất bại</option>
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Loại email"
            >
              <option value="all">Tất cả loại</option>
              <option value="REGISTRATION_PENDING">Xác nhận đăng ký</option>
              <option value="PAYMENT_CONFIRMED">Thanh toán thành công</option>
              <option value="RACE_PACK_INFO">Thông tin race pack</option>
              <option value="REMINDER">Nhắc nhở</option>
            </Select>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadLogs} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Người nhận
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loại email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.sentAt)}
                      <br />
                      <span className="text-xs text-gray-400">
                        {new Date(log.sentAt).toLocaleTimeString("vi-VN")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.registration.fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.registration.email}
                      </div>
                      {log.registration.bibNumber && (
                        <div className="text-xs text-blue-600 font-mono">
                          BIB: {log.registration.bibNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getEmailTypeLabel(log.emailType)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.subject || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.errorMessage ? (
                        <span className="text-red-600 text-xs">
                          {log.errorMessage}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có email nào được gửi</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
