// app/admin/dashboard/import/page.tsx - IMPROVED VERSION
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
} from "lucide-react";
import { ImportErrorViewer } from "@/components/ImportErrorViewer";

interface ImportBatch {
  id: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  status: string;
  createdAt: Date;
  event: {
    id: string;
    name: string;
  };
  bibRangeStart: string | null;
  bibRangeEnd: string | null;
  totalShirts: number;
  // ✅ NEW: Payment stats
  paidCount?: number;
  pendingCount?: number;
  paymentProgress?: number;
}

export default function ImportExcelPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ✅ NEW: Event filter
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  const [selectedBatchForErrors, setSelectedBatchForErrors] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadBatches();
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEvent !== "all") {
        params.append("eventId", selectedEvent);
      }

      const res = await fetch(`/api/admin/import/batches?${params.toString()}`);
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (error) {
      toast.error("Không thể tải lịch sử import");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedEvent || selectedEvent === "all") {
      toast.error("Vui lòng chọn sự kiện trước khi upload");
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Chỉ chấp nhận file Excel (.xlsx, .xls)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn (tối đa 5MB)");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("eventId", selectedEvent);

      const res = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✅ Đã import ${result.batch.successCount}/${result.batch.totalRows} VĐV`,
        );

        if (result.batch.failedCount > 0) {
          toast.warning(
            `⚠️ ${result.batch.failedCount} dòng lỗi. Click để xem chi tiết.`,
          );
          setSelectedBatchForErrors(result.batch.id);
        }

        loadBatches();
      } else {
        toast.error(result.error || "Import thất bại");
        if (result.errors && result.errors.length > 0) {
          console.error("Import errors:", result.errors);
        }
      }
    } catch (error) {
      toast.error("Không thể upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/admin/import/template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mau-import-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("✅ Đã tải mẫu Excel");
    } catch (error) {
      toast.error("❌ Không thể tải mẫu");
    }
  };

  const handlePayBatch = async (batchId: string) => {
    if (!confirm("Xác nhận thanh toán hàng loạt cho batch này?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/import/${batchId}/pay-batch`, {
        method: "POST",
      });

      const result = await res.json();

      if (result.success) {
        toast.success(
          `✅ Đã xác nhận thanh toán cho ${result.summary.paidCount} VĐV`,
        );
        if (result.summary.emailsSent > 0) {
          toast.success(`📧 Đã gửi ${result.summary.emailsSent} email`);
        }
        if (result.summary.emailsFailed > 0) {
          toast.warning(`⚠️ ${result.summary.emailsFailed} email gửi thất bại`);
        }
        loadBatches();
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể xác nhận thanh toán");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" /> Hoàn thành
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            <Clock className="w-3 h-3" /> Đang xử lý
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            <XCircle className="w-3 h-3" /> Thất bại
          </span>
        );
      case "PARTIAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
            <XCircle className="w-3 h-3" /> Một phần
          </span>
        );
      default:
        return status;
    }
  };

  // ✅ NEW: Calculate if batch payment is complete
  const isBatchFullyPaid = (batch: ImportBatch) => {
    if (!batch.paidCount) return false;
    return batch.paidCount === batch.successCount;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import từ Excel</h1>
        <p className="text-gray-600 mt-1">
          Upload file Excel để đăng ký hàng loạt VĐV
        </p>
      </div>

      {/* ✅ NEW: Event Filter Row */}
      <Card className="border-2 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              label="📅 Chọn sự kiện để import"
              required
            >
              <option value="all">-- Chọn sự kiện --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Tải mẫu Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {selectedEvent && selectedEvent !== "all" ? (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle>
              📁 Upload File Excel cho:{" "}
              {events.find((e) => e.id === selectedEvent)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />

              <label
                htmlFor="file-upload"
                className={`cursor-pointer ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {uploading ? "Đang xử lý..." : "Click để chọn file Excel"}
                </p>
                <p className="text-sm text-gray-500">
                  Chỉ chấp nhận file .xlsx, .xls (tối đa 5MB)
                </p>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                💡 <strong>Lưu ý:</strong>
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                <li>• File phải có đúng format như mẫu</li>
                <li>• Ngày sinh định dạng: DD/MM/YYYY</li>
                <li>• Giới tính: "Nam" hoặc "Nữ"</li>
                <li>• Cự ly phải khớp với tên cự ly trong sự kiện</li>
                <li>• Số BIB có thể để trống (hệ thống sẽ tự sinh)</li>
                <li>• Sau khi import, cần vào xác nhận thanh toán hàng loạt</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-gray-200 bg-gray-50">
          <CardContent className="py-12 text-center">
            <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">
              Vui lòng chọn sự kiện để bắt đầu import
            </p>
            <p className="text-sm text-gray-500">
              Chọn sự kiện từ dropdown phía trên
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Viewer */}
      {selectedBatchForErrors && (
        <ImportErrorViewer
          batchId={selectedBatchForErrors}
          onClose={() => setSelectedBatchForErrors(null)}
        />
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              📜 Lịch sử import
              {selectedEvent !== "all" &&
                ` - ${events.find((e) => e.id === selectedEvent)?.name}`}
            </CardTitle>
            <div className="text-sm text-gray-600">{batches.length} batch</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {selectedEvent !== "all"
                ? "Chưa có lịch sử import cho sự kiện này"
                : "Chưa có lịch sử import"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs">File</th>
                    <th className="px-6 py-3 text-left text-xs">Sự kiện</th>
                    <th className="px-6 py-3 text-left text-xs">Tổng</th>
                    <th className="px-6 py-3 text-left text-xs">Thành công</th>
                    <th className="px-6 py-3 text-left text-xs">Thất bại</th>
                    <th className="px-6 py-3 text-left text-xs">Đã TT</th>
                    <th className="px-6 py-3 text-left text-xs">BIB Range</th>
                    <th className="px-6 py-3 text-left text-xs">Trạng thái</th>
                    <th className="px-6 py-3 text-left text-xs">Thời gian</th>
                    <th className="px-6 py-3 text-left text-xs">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y">
                  {batches.map((batch) => {
                    const isFullyPaid = isBatchFullyPaid(batch);
                    const paymentProgress = batch.paymentProgress || 0;

                    return (
                      <tr key={batch.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">
                          {batch.fileName}
                        </td>

                        {/* ✅ NEW: Event name column */}
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {batch.event.name}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm font-bold">
                          {batch.totalRows}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600 font-medium">
                          {batch.successCount}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 font-medium">
                          {batch.failedCount}
                        </td>

                        {/* ✅ NEW: Payment status column */}
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-bold text-blue-600">
                              {batch.paidCount || 0}/{batch.successCount}
                            </div>
                            {batch.successCount > 0 && (
                              <div className="text-xs text-gray-500">
                                {paymentProgress.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </td>

                        {/* BIB Range */}
                        <td className="px-6 py-4 text-sm">
                          {batch.bibRangeStart && batch.bibRangeEnd ? (
                            <div className="font-mono text-xs">
                              <div>{batch.bibRangeStart}</div>
                              <div className="text-gray-400">↓</div>
                              <div>{batch.bibRangeEnd}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {getStatusBadge(batch.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(batch.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                (window.location.href = `/admin/dashboard/registrations?eventId=${batch.event.id}&source=EXCEL`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {batch.failedCount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setSelectedBatchForErrors(batch.id)
                                }
                                className="text-red-600 hover:bg-red-50"
                              >
                                ⚠️ {batch.failedCount} lỗi
                              </Button>
                            )}

                            {/* ✅ IMPROVED: Show payment button based on status */}
                            {batch.status === "COMPLETED" && !isFullyPaid && (
                              <Button
                                size="sm"
                                onClick={() => handlePayBatch(batch.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                💰 Thanh toán (
                                {batch.pendingCount ||
                                  batch.successCount - (batch.paidCount || 0)}
                                )
                              </Button>
                            )}

                            {/* ✅ NEW: Show fully paid badge */}
                            {isFullyPaid && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                ✅ Đã TT đủ
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
