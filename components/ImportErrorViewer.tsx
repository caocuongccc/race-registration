import React, { useState } from "react";
import {
  AlertCircle,
  X,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ImportErrorViewer = () => {
  // Sample error data
  const [batches, setBatches] = useState([
    {
      id: "1",
      fileName: "dangky-5km-batch1.xlsx",
      createdAt: "2025-01-06T10:30:00",
      totalRows: 50,
      successCount: 42,
      failedCount: 8,
      status: "PARTIAL",
      errorLog: [
        {
          row: 5,
          data: {
            "Họ tên": "Nguyễn Văn A",
            Email: "nguyenvana@gmail.con",
            "Số điện thoại": "091234567",
            "Cự ly": "5km",
          },
          error: "Số điện thoại không hợp lệ (phải có 10 chữ số)",
        },
        {
          row: 12,
          data: {
            "Họ tên": "Trần Thị B",
            Email: "tranthib@gmail",
            "Số điện thoại": "0912345678",
            "Cự ly": "3km",
          },
          error: "Không tìm thấy cự ly: 3km",
        },
        {
          row: 18,
          data: {
            "Họ tên": "Lê Văn C",
            Email: "levanc@example.com",
            "Số điện thoại": "0987654321",
            "Ngày sinh (DD/MM/YYYY)": "32/13/1990",
          },
          error: "Ngày sinh không hợp lệ (phải là DD/MM/YYYY)",
        },
        {
          row: 23,
          data: {
            "Họ tên": "Phạm Thị D",
            Email: "",
            "Số điện thoại": "0901234567",
            "Cự ly": "5km",
          },
          error: "Thiếu thông tin bắt buộc: Email",
        },
        {
          row: 28,
          data: {
            "Họ tên": "Hoàng Văn E",
            Email: "hoangvane@yahoo.com",
            "Số điện thoại": "0912345678",
            "Loại áo (Nam/Nữ/Trẻ em)": "Nam",
            "Size áo": "XL",
          },
          error: "Không tìm thấy áo: Nam SHORT_SLEEVE XL",
        },
        {
          row: 35,
          data: {
            "Họ tên": "Vũ Thị F",
            Email: "vuthif@gmail.com",
            "Số điện thoại": "09123",
            "Cự ly": "5km",
          },
          error: "Số điện thoại không hợp lệ (phải có 10 chữ số)",
        },
        {
          row: 41,
          data: {
            "Họ tên": "Đỗ Văn G",
            Email: "dovang@hotmail.com",
            "Số điện thoại": "0987654321",
            "Giới tính (Nam/Nữ)": "Male",
          },
          error: "Giới tính không hợp lệ (phải là Nam hoặc Nữ)",
        },
        {
          row: 47,
          data: {
            "Họ tên": "Bùi Thị H",
            Email: "buithih@example.com.vn",
            "Số điện thoại": "0901234567",
            "Cự ly": "",
          },
          error: "Thiếu thông tin bắt buộc: Cự ly",
        },
      ],
    },
    {
      id: "2",
      fileName: "dangky-10km-batch2.xlsx",
      createdAt: "2025-01-05T15:20:00",
      totalRows: 30,
      successCount: 30,
      failedCount: 0,
      status: "COMPLETED",
      errorLog: null,
    },
  ]);

  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const handleDeleteBatch = (batchId: string) => {
    if (confirm("Xóa batch import này? Thao tác này không thể hoàn tác.")) {
      setBatches(batches.filter((b) => b.id !== batchId));
      alert("✅ Đã xóa batch");
    }
  };

  const handleClearErrors = (batchId: string) => {
    if (confirm("Xóa log lỗi cho batch này?")) {
      setBatches(
        batches.map((b) => (b.id === batchId ? { ...b, errorLog: null } : b))
      );
      alert("✅ Đã xóa log lỗi");
    }
  };

  const handleExportErrors = (batch: any) => {
    if (!batch.errorLog) return;

    // Convert to CSV
    const headers = ["Dòng", "Lỗi", ...Object.keys(batch.errorLog[0].data)];
    const rows = batch.errorLog.map((err: any) => [
      err.row,
      err.error,
      ...Object.values(err.data),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `errors-${batch.fileName}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    alert("✅ Đã xuất file lỗi");
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: "bg-green-100 text-green-700",
      PARTIAL: "bg-orange-100 text-orange-700",
      FAILED: "bg-red-100 text-red-700",
      PROCESSING: "bg-blue-100 text-blue-700",
    };

    const labels = {
      COMPLETED: "Hoàn thành",
      PARTIAL: "Một phần",
      FAILED: "Thất bại",
      PROCESSING: "Đang xử lý",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Lịch sử Import & Lỗi
          </h1>
          <p className="text-gray-600 mt-1">
            Xem chi tiết lỗi và quản lý batch import
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Tổng batch</div>
          <div className="text-3xl font-bold text-blue-600">
            {batches.length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Thành công</div>
          <div className="text-3xl font-bold text-green-600">
            {batches.reduce((sum, b) => sum + b.successCount, 0)}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Thất bại</div>
          <div className="text-3xl font-bold text-red-600">
            {batches.reduce((sum, b) => sum + b.failedCount, 0)}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Có lỗi</div>
          <div className="text-3xl font-bold text-orange-600">
            {batches.filter((b) => b.errorLog && b.errorLog.length > 0).length}
          </div>
        </div>
      </div>

      {/* Batch list */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="bg-white border rounded-lg overflow-hidden"
          >
            {/* Batch header */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900">
                      {batch.fileName}
                    </h3>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>📅 {formatDate(batch.createdAt)}</span>
                    <span>📊 {batch.totalRows} dòng</span>
                    <span className="text-green-600">
                      ✓ {batch.successCount} thành công
                    </span>
                    {batch.failedCount > 0 && (
                      <span className="text-red-600">
                        ✗ {batch.failedCount} thất bại
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {batch.errorLog && batch.errorLog.length > 0 && (
                    <>
                      <button
                        onClick={() => handleExportErrors(batch)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Xuất lỗi
                      </button>
                      <button
                        onClick={() => handleClearErrors(batch.id)}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Xóa log
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa batch
                  </button>
                  {batch.errorLog && batch.errorLog.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedBatch(
                          expandedBatch === batch.id ? null : batch.id
                        )
                      }
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      {expandedBatch === batch.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error details */}
            {expandedBatch === batch.id &&
              batch.errorLog &&
              batch.errorLog.length > 0 && (
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    Chi tiết {batch.errorLog.length} lỗi:
                  </div>

                  {batch.errorLog.map((error: any, index: number) => (
                    <div
                      key={index}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-red-600">
                            {error.row}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-medium text-red-700 mb-2">
                            ❌ {error.error}
                          </div>

                          <div className="bg-white rounded p-2 text-xs space-y-1">
                            {Object.entries(error.data).map(
                              ([key, value]: [string, any]) => (
                                <div key={key} className="flex">
                                  <span className="text-gray-600 w-40">
                                    {key}:
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {value || (
                                      <span className="text-gray-400 italic">
                                        trống
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}

        {batches.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Chưa có batch import nào</p>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          💡 <strong>Gợi ý xử lý lỗi:</strong>
        </p>
        <ul className="text-sm text-yellow-800 mt-2 space-y-1">
          <li>• Xuất file lỗi để xem chi tiết tất cả các dòng bị lỗi</li>
          <li>• Sửa lỗi trong file Excel gốc theo thông báo lỗi</li>
          <li>• Upload lại file đã sửa để import các dòng còn thiếu</li>
          <li>• Xóa log lỗi sau khi đã xử lý xong để giữ giao diện gọn gàng</li>
          <li>
            • Các lỗi phổ biến: Email sai format, SĐT không đủ 10 số, cự ly
            không tồn tại, ngày sinh sai format
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ImportErrorViewer;
