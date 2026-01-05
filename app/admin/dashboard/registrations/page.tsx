"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Download,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Check,
  X,
} from "lucide-react";

interface Registration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bibNumber: string | null;
  totalAmount: number;
  paymentStatus: string;
  registrationDate: Date;
  distance: { name: string };
  event: { name: string };
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<
    Registration[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");

  // NEW STATES NEEDED
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventData, setSelectedEventData] = useState<any | null>(null);
  const [quickConfirmMode, setQuickConfirmMode] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Load event list
  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  // Load registrations for selected event
  const loadRegistrations = async () => {
    try {
      const res = await fetch(
        `/api/admin/registrations?eventId=${selectedEvent}`
      );
      const data = await res.json();
      setRegistrations(data.registrations || []);
      setFilteredRegistrations(data.registrations || []);

      // Load selected event info
      if (selectedEvent !== "all") {
        try {
          const eventRes = await fetch(`/api/admin/events/${selectedEvent}`);
          const eventData = await eventRes.json();
          setSelectedEventData(eventData.event);
        } catch (err) {
          console.error("Failed to load event details:", err);
          setSelectedEventData(null);
        }
      } else {
        setSelectedEventData(null);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đăng ký");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadRegistrations();
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [selectedEvent]);

  // Filter logic
  useEffect(() => {
    let filtered = [...registrations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.fullName.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.phone.includes(query) ||
          r.bibNumber?.includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.paymentStatus === statusFilter);
    }

    if (distanceFilter !== "all") {
      filtered = filtered.filter((r) => r.distance.name === distanceFilter);
    }

    setFilteredRegistrations(filtered);
  }, [searchQuery, statusFilter, distanceFilter, registrations]);

  // EXPORT
  const handleExport = async () => {
    try {
      const res = await fetch(
        `/api/admin/registrations/export?eventId=${selectedEvent}`
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `registrations-${Date.now()}.xlsx`;
      a.click();
      toast.success("Đã xuất file Excel");
    } catch (error) {
      toast.error("Không thể xuất file");
    }
  };

  // CONFIRM PAYMENT
  const handleConfirmPayment = async (registrationId: string) => {
    setConfirming(registrationId);
    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: "Xác nhận thanh toán thủ công bởi admin",
          }),
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success(`Đã xác nhận! BIB: ${result.bibNumber}`);
        loadRegistrations();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch {
      toast.error("Không thể xác nhận thanh toán");
    } finally {
      setConfirming(null);
    }
  };

  // CANCEL PAYMENT
  const handleRejectPayment = async (registrationId: string) => {
    if (!confirm("Hủy đăng ký này?")) return;

    try {
      const res = await fetch(
        `/api/admin/registrations/${registrationId}/confirm-payment`,
        { method: "DELETE" }
      );

      const result = await res.json();

      if (result.success) {
        toast.success("Đã hủy đăng ký");
        loadRegistrations();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch {
      toast.error("Không thể hủy đăng ký");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" /> Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
            <Clock className="w-3 h-3" /> Chờ thanh toán
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      default:
        return status;
    }
  };

  const uniqueDistances = [
    ...new Set(registrations.map((r) => r.distance.name)),
  ];

  const paidCount = filteredRegistrations.filter(
    (r) => r.paymentStatus === "PAID"
  ).length;
  const pendingCount = filteredRegistrations.filter(
    (r) => r.paymentStatus === "PENDING"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý đăng ký</h1>
          <p className="text-gray-600 mt-1">
            Tổng: {filteredRegistrations.length} đăng ký (
            <span className="text-green-600">{paidCount} đã TT</span>,{" "}
            <span className="text-yellow-600">{pendingCount} chờ</span>)
            {selectedEventData && !selectedEventData.requireOnlinePayment && (
              <span className="ml-2 text-orange-600 font-medium">
                • Xác nhận thủ công
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Quick confirm */}
          {selectedEvent !== "all" &&
            selectedEventData &&
            !selectedEventData.requireOnlinePayment && (
              <Button
                variant={quickConfirmMode ? "primary" : "outline"}
                onClick={() => setQuickConfirmMode(!quickConfirmMode)}
              >
                {quickConfirmMode ? "Đang xác nhận nhanh" : "⚡ Xác nhận nhanh"}
              </Button>
            )}

          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="all">Tất cả sự kiện</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </Select>
            {/* <div className="relative md:col-span-2"> */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder={
                quickConfirmMode
                  ? "🔍 Tìm SĐT hoặc tên..."
                  : "Tìm tên, email, SĐT, BIB..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${
                quickConfirmMode ? "border-blue-500 ring-2 ring-blue-100" : ""
              }`}
            />
            {/* </div> */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="FAILED">Thất bại</option>
            </Select>
            <Select
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value)}
            >
              <option value="all">Tất cả cự ly</option>
              {uniqueDistances.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            // Thêm vào phần filters
            <Select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              label="Import Batch"
            >
              <option value="all">Tất cả nguồn</option>
              <option value="ONLINE">Đăng ký online</option>
              <option value="EXCEL">Import từ Excel</option>
              <option value="MANUAL">Thủ công</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs">STT</th>
                  <th className="px-6 py-3 text-left text-xs">BIB</th>
                  <th className="px-6 py-3 text-left text-xs">Họ tên</th>
                  <th className="px-6 py-3 text-left text-xs">Liên hệ</th>
                  <th className="px-6 py-3 text-left text-xs">Cự ly</th>
                  <th className="px-6 py-3 text-left text-xs">Số tiền</th>
                  <th className="px-6 py-3 text-left text-xs">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs">Ngày ĐK</th>
                  <th className="px-6 py-3 text-left text-xs">Nguồn</th>
                  <th className="px-6 py-3 text-left text-xs">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredRegistrations.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50 ${
                      quickConfirmMode && r.paymentStatus === "PENDING"
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4">{idx + 1}</td>

                    <td className="px-6 py-4 font-mono">
                      {r.bibNumber || <span className="text-gray-400">—</span>}
                    </td>

                    <td className="px-6 py-4">{r.fullName}</td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {r.email}
                      <br />
                      {r.phone}
                    </td>

                    <td className="px-6 py-4">{r.distance.name}</td>

                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(r.totalAmount)}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(r.paymentStatus)}
                    </td>

                    <td className="px-6 py-4">
                      {formatDate(r.registrationDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          r.registrationSource === "ONLINE"
                            ? "bg-green-100 text-green-700"
                            : r.registrationSource === "EXCEL"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.registrationSource === "ONLINE"
                          ? "🌐 Online"
                          : r.registrationSource === "EXCEL"
                            ? "📊 Excel"
                            : "✏️ Thủ công"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/registrations/${r.id}/payment`,
                              "_blank"
                            )
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {r.paymentStatus === "PENDING" &&
                          (quickConfirmMode ||
                            (selectedEventData &&
                              !selectedEventData.requireOnlinePayment)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmPayment(r.id)}
                              disabled={confirming === r.id}
                              className="text-green-600 hover:bg-green-50"
                            >
                              {confirming === r.id ? (
                                <div className="animate-spin h-4 w-4 border-b-2 border-green-600 rounded-full" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          )}

                        {r.paymentStatus === "PENDING" &&
                          selectedEventData &&
                          !selectedEventData.requireOnlinePayment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectPayment(r.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRegistrations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Không có kết quả phù hợp
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
