// app/admin/dashboard/email-logs/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mail,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
} from "lucide-react";

interface EmailLog {
  id: string;
  bibNumber: string | null;
  emailProvider: string | null;
  recipientEmail: string;
  emailType: string;
  subject: string;
  status: string;
  sentAt: Date;
  errorMessage: string | null;
  registration: {
    fullName: string;
  };
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");

  const [events, setEvents] = useState<any[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedEvent, statusFilter, providerFilter, typeFilter]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEvent !== "all") params.append("eventId", selectedEvent);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (providerFilter !== "all") params.append("provider", providerFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      toast.error("Không thể tải email log");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 log");
      return;
    }

    if (!confirm(`Xóa ${selectedLogs.size} email log?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/email-logs/delete-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logIds: Array.from(selectedLogs),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`✅ Đã xóa ${result.deleted} log`);
        setSelectedLogs(new Set());
        loadLogs();
      } else {
        toast.error("Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể xóa log");
    }
  };

  const toggleSelectLog = (id: string) => {
    const newSet = new Set(selectedLogs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLogs(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(logs.map((l) => l.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" /> Đã gửi
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      default:
        return status;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.bibNumber?.toLowerCase().includes(query) ||
      log.recipientEmail.toLowerCase().includes(query) ||
      log.registration.fullName.toLowerCase().includes(query)
    );
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-gray-600 mt-1">
            Quản lý lịch sử gửi email - {filteredLogs.length} log
          </p>
        </div>

        {selectedLogs.size > 0 && (
          <Button
            onClick={handleDeleteSelected}
            variant="outline"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa ({selectedLogs.size})
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="Sự kiện"
            >
              <option value="all">Tất cả sự kiện</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </Select>

            <Input
              placeholder="Tìm BIB, email, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Trạng thái"
            >
              <option value="all">Tất cả</option>
              <option value="SENT">Đã gửi</option>
              <option value="FAILED">Thất bại</option>
            </Select>

            <Select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              label="Provider"
            >
              <option value="all">Tất cả</option>
              <option value="gmail">Gmail</option>
              <option value="resend">Resend</option>
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Loại email"
            >
              <option value="all">Tất cả</option>
              <option value="REGISTRATION_PENDING">Đăng ký</option>
              <option value="PAYMENT_CONFIRMED">Thanh toán</option>
              <option value="BIB_ANNOUNCEMENT">Thông báo BIB</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedLogs.size === filteredLogs.length &&
                        filteredLogs.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs">BIB</th>
                  <th className="px-6 py-3 text-left text-xs">Người nhận</th>
                  <th className="px-6 py-3 text-left text-xs">Loại email</th>
                  <th className="px-6 py-3 text-left text-xs">Provider</th>
                  <th className="px-6 py-3 text-left text-xs">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs">Thời gian</th>
                  <th className="px-6 py-3 text-left text-xs">Lỗi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-gray-50 ${
                      selectedLogs.has(log.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLogs.has(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      {log.bibNumber || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {log.registration.fullName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.recipientEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{log.emailType}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          log.emailProvider === "gmail"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {log.emailProvider || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.sentAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {log.errorMessage?.substring(0, 50)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Không có log nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
