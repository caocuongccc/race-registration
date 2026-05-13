"use client";
// app/admin/dashboard/fix-shirt-data/page.tsx
// List VĐV bị mất thông tin áo → chọn → xử lý (update DB + gửi email mới)

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shirt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wrench,
  Check,
} from "lucide-react";

interface BrokenReg {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  bibNumber: string | null;
  paymentDate: string | null;
  shirtFee: number;
  shirt: {
    category: string;
    type: string;
    size: string;
  } | null;
  distance: { name: string };
  event: { id: string; name: string };
  // after fix:
  _status?: "fixed" | "failed";
  _error?: string;
}

const SHIRT_CATEGORY: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  KID: "Trẻ em",
};
const SHIRT_TYPE: Record<string, string> = {
  SHORT_SLEEVE: "Có tay",
  SLEEVELESS: "3 lỗ",
};

export default function FixShirtDataPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [registrations, setRegistrations] = useState<BrokenReg[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadBroken();
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      toast.error("Không thể tải sự kiện");
    }
  };

  const loadBroken = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      if (selectedEvent !== "all") params.set("eventId", selectedEvent);
      const res = await fetch(`/api/admin/registrations/fix-shirt-data?${params}`);
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    const eligible = registrations.filter((r) => !r._status);
    if (selectedIds.size === eligible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligible.map((r) => r.id)));
    }
  };

  const handleProcess = async () => {
    if (selectedIds.size === 0) {
      toast.error("Vui lòng chọn ít nhất 1 VĐV");
      return;
    }
    if (
      !confirm(
        `Cập nhật thông tin áo và gửi lại email cho ${selectedIds.size} VĐV?`,
      )
    )
      return;

    setProcessing(true);
    try {
      const res = await fetch("/api/admin/registrations/fix-shirt-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: Array.from(selectedIds) }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `✅ Xử lý xong: ${data.fixed} thành công, ${data.failed} thất bại`,
        );

        // Mark statuses inline
        const statusMap = new Map(
          data.results.map((r: any) => [r.id, { status: r.status, error: r.error }]),
        );
        setRegistrations((prev) =>
          prev.map((reg) => {
            const s = statusMap.get(reg.id) as any;
            return s ? { ...reg, _status: s.status, _error: s.error } : reg;
          }),
        );
        setSelectedIds(new Set());
      } else {
        toast.error(data.error || "Lỗi xử lý");
      }
    } catch {
      toast.error("Lỗi kết nối server");
    } finally {
      setProcessing(false);
    }
  };

  const eligible = registrations.filter((r) => !r._status);
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
            <Wrench className="w-8 h-8 text-orange-500" />
            Sửa thông tin áo bị thiếu
          </h1>
          <p className="text-gray-600 mt-1">
            VĐV đã trả tiền áo nhưng DB chưa lưu kích thước — cập nhật và gửi email lại
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleProcess}
            disabled={processing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Wrench className="w-4 h-4 mr-2" />
            {processing ? "Đang xử lý..." : `Xử lý ${selectedIds.size} VĐV`}
          </Button>
        )}
      </div>

      {/* Warning banner */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-orange-900">
          <strong>Dữ liệu bị thiếu:</strong> Các VĐV này đã chọn và trả tiền áo nhưng do bug cũ,{" "}
          <code className="bg-orange-100 px-1 rounded">shirtCategory / shirtType / shirtSize</code>{" "}
          chưa được lưu vào DB. Bấm <strong>Xử lý</strong> để cập nhật từ{" "}
          <code className="bg-orange-100 px-1 rounded">shirtId</code> và gửi email xác nhận mới kèm QR.
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Select
                label="Sự kiện"
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
            </div>
            <Button variant="outline" onClick={loadBroken} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && registrations.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Không có VĐV nào bị thiếu thông tin áo 🎉</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && registrations.length > 0 && (
        <Card>
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Shirt className="w-5 h-5" />
                {registrations.length} VĐV bị thiếu thông tin áo
                {eligible.length < registrations.length && (
                  <span className="text-sm text-green-600 ml-2">
                    ({registrations.length - eligible.length} đã xử lý)
                  </span>
                )}
              </CardTitle>
              {eligible.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedIds.size === eligible.length ? (
                    <><XCircle className="w-4 h-4 mr-1" />Bỏ chọn tất cả</>
                  ) : (
                    <><Check className="w-4 h-4 mr-1" />Chọn tất cả ({eligible.length})</>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === eligible.length && eligible.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 text-orange-500 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BIB</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cự ly</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thông tin áo (từ shirtId)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tiền áo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày TT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map((reg) => {
                    const isSelected = selectedIds.has(reg.id);
                    const isFixed = reg._status === "fixed";
                    const isFailed = reg._status === "failed";

                    return (
                      <tr
                        key={reg.id}
                        onClick={() => !reg._status && toggle(reg.id)}
                        className={`transition-colors ${
                          isFixed
                            ? "bg-green-50"
                            : isFailed
                              ? "bg-red-50"
                              : isSelected
                                ? "bg-orange-50 cursor-pointer"
                                : "hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          {!reg._status && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(reg.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 text-orange-500 rounded"
                            />
                          )}
                          {isFixed && <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />}
                          {isFailed && <XCircle className="w-5 h-5 text-red-500 mx-auto" />}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {reg.bibNumber || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{reg.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{reg.email}</td>
                        <td className="px-4 py-3 text-sm">{reg.distance.name}</td>
                        <td className="px-4 py-3">
                          {reg.shirt ? (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="text-sm font-medium text-purple-700">
                                {SHIRT_CATEGORY[reg.shirt.category] || reg.shirt.category}
                                {" "}({SHIRT_TYPE[reg.shirt.type] || reg.shirt.type})
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full w-fit">
                                Size {reg.shirt.size}
                              </span>
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs font-medium">
                              ⚠️ shirtId không hợp lệ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {reg.shirtFee.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDate(reg.paymentDate)}
                        </td>
                        <td className="px-4 py-3">
                          {!reg._status && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                              ⚠️ Thiếu size
                            </span>
                          )}
                          {isFixed && (
                            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                              ✅ Đã sửa + email
                            </span>
                          )}
                          {isFailed && (
                            <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full" title={reg._error}>
                              ❌ Lỗi
                            </span>
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

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-orange-600 text-white px-6 py-4 rounded-xl shadow-xl z-50 flex items-center gap-4">
          <div>
            <div className="font-bold text-lg">
              Đã chọn: {selectedIds.size} VĐV
            </div>
            <div className="text-sm opacity-80">Update DB + Gửi email mới kèm QR</div>
          </div>
          <Button
            onClick={handleProcess}
            disabled={processing}
            className="bg-white text-orange-600 hover:bg-orange-50 font-bold"
          >
            <Wrench className="w-4 h-4 mr-2" />
            {processing ? "Đang xử lý..." : "Xử lý ngay"}
          </Button>
        </div>
      )}
    </div>
  );
}
