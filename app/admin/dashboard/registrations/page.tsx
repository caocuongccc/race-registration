"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";

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
  Loader2,
} from "lucide-react";

interface Registration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bibNumber: string | null;
  bibName: string;
  totalAmount: number;
  paymentStatus: string;
  registrationDate: Date;
  distance: { name: string };
  registrationSource: string;
  event: { name: string };
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
// ✅ OPTIMIZATION 1: Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<
    Registration[]
  >([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState(false);

  // ✅ OPTIMIZATION 2: Separate search state from filter state
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // ✅ OPTIMIZATION 3: Debounce search - only trigger API after 800ms of no typing
  const debouncedSearch = useDebounce(searchInput, 3000);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // NEW STATES NEEDED
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventData, setSelectedEventData] = useState<any | null>(null);
  const [quickConfirmMode, setQuickConfirmMode] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  // ✅ OPTIMIZATION 4: Track if initial load to prevent double fetch
  const initialLoadRef = useRef(true);

  // ✅ Load on mount and when filters change
  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [
    selectedEvent,
    statusFilter,
    distanceFilter,
    sourceFilter,
    pagination.currentPage,
  ]);

  // ✅ OPTIMIZATION 6: Load registrations when filters change OR debounced search changes
  useEffect(() => {
    // Skip on initial mount (will be loaded by selectedEvent change)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    loadRegistrations();
  }, [
    selectedEvent,
    statusFilter,
    distanceFilter,
    sourceFilter,
    pagination.currentPage,
    debouncedSearch, // Only trigger when user stops typing
  ]);

  // ✅ OPTIMIZATION 7: Separate effect for page changes to reset to page 1
  useEffect(() => {
    if (pagination.currentPage !== 1) {
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, [selectedEvent, statusFilter, distanceFilter, sourceFilter]);

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

  // ✅ OPTIMIZATION 8: Memoize API params to prevent unnecessary refetches
  const apiParams = useMemo(() => {
    const params = new URLSearchParams({
      page: pagination.currentPage.toString(),
      limit: pagination.itemsPerPage.toString(),
    });

    if (selectedEvent !== "all") params.append("eventId", selectedEvent);
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (distanceFilter !== "all") params.append("distance", distanceFilter);
    if (sourceFilter !== "all") params.append("source", sourceFilter);
    if (debouncedSearch) params.append("search", debouncedSearch);

    return params.toString();
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    selectedEvent,
    statusFilter,
    distanceFilter,
    sourceFilter,
    debouncedSearch,
  ]);

  // Load registrations for selected event
  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations?${apiParams}`);
      const data = await res.json();

      setRegistrations(data.registrations || []);
      setPagination(data.pagination);

      // Load selected event info if needed
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
  }, [apiParams, selectedEvent]);

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ✅ OPTIMIZATION 9: Memoize export function
  const handleExport = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/registrations/export?eventId=${selectedEvent}`,
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
  }, [selectedEvent]);

  // ✅ OPTIMIZATION 10: Memoize confirm payment handler
  const handleConfirmPayment = useCallback(
    async (registrationId: string) => {
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
          },
        );

        const result = await res.json();
        if (result.success) {
          toast.success(`Đã xác nhận! BIB: ${result.bibNumber}`);
          // Reload current page
          loadRegistrations();
        } else {
          toast.error(result.error || "Có lỗi xảy ra");
        }
      } catch {
        toast.error("Không thể xác nhận thanh toán");
      } finally {
        setConfirming(null);
      }
    },
    [loadRegistrations],
  );

  // ✅ OPTIMIZATION 11: Memoize reject payment handler
  const handleRejectPayment = useCallback(
    async (registrationId: string) => {
      if (!confirm("Hủy đăng ký này?")) return;

      try {
        const res = await fetch(
          `/api/admin/registrations/${registrationId}/confirm-payment`,
          { method: "DELETE" },
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
    },
    [loadRegistrations],
  );

  // ✅ OPTIMIZATION 12: Memoize status badge component
  const getStatusBadge = useCallback((status: string) => {
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
  }, []);

  // ✅ OPTIMIZATION 13: Memoize unique distances
  const uniqueDistances = useMemo(
    () => [...new Set(registrations.map((r) => r.distance.name))],
    [registrations],
  );

  // ✅ OPTIMIZATION 14: Memoize stats
  const stats = useMemo(() => {
    const paidCount = registrations.filter(
      (r) => r.paymentStatus === "PAID",
    ).length;
    const pendingCount = registrations.filter(
      (r) => r.paymentStatus === "PENDING",
    ).length;
    return { paidCount, pendingCount };
  }, [registrations]);

  const paidCount = filteredRegistrations.filter(
    (r) => r.paymentStatus === "PAID",
  ).length;
  const pendingCount = filteredRegistrations.filter(
    (r) => r.paymentStatus === "PENDING",
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
            {/* ✅ OPTIMIZATION 15: Controlled input with visual feedback */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder={
                  quickConfirmMode
                    ? "🔍 Tìm SĐT hoặc tên..."
                    : "Tìm tên, email, SĐT, BIB..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`pl-10 ${
                  quickConfirmMode ? "border-blue-500 ring-2 ring-blue-100" : ""
                }`}
              />
              {/* Show loading indicator while debouncing */}
              {searchInput !== debouncedSearch && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>
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
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs">STT</th>
                      <th className="px-6 py-3 text-left text-xs">BIB</th>
                      <th className="px-6 py-3 text-left text-xs">Họ tên</th>
                      <th className="px-6 py-3 text-left text-xs">
                        Tên trên bib
                      </th>
                      <th className="px-6 py-3 text-left text-xs">Liên hệ</th>
                      <th className="px-6 py-3 text-left text-xs">Cự ly</th>
                      <th className="px-6 py-3 text-left text-xs">Số tiền</th>
                      <th className="px-6 py-3 text-left text-xs">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs">Ngày ĐK</th>
                      <th className="px-6 py-3 text-left text-xs">Nguồn</th>
                      <th className="px-6 py-3 text-left text-xs">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {registrations.map((r, idx) => {
                      const globalIndex =
                        (pagination.currentPage - 1) * pagination.itemsPerPage +
                        idx +
                        1;

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-gray-50 ${
                            quickConfirmMode && r.paymentStatus === "PENDING"
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <td className="px-6 py-4">{globalIndex}</td>

                          <td className="px-6 py-4 font-mono">
                            {r.bibNumber || (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-6 py-4">{r.fullName}</td>
                          <td className="px-6 py-4">
                            {r.bibName}
                            <br />
                          </td>
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
                                    "_blank",
                                  )
                                }
                                placeholder="Xem chi tiết."
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
                                      <Loader2 className="w-4 h-4 animate-spin" />
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
                      );
                    })}
                  </tbody>
                </table>

                {registrations.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    Không có kết quả phù hợp
                  </div>
                )}
              </div>

              {/* ✅ Pagination Component */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
