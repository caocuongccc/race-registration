import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";

interface ImportError {
  row: number;
  data: Record<string, any>;
  error: string;
}

interface ImportErrorViewerProps {
  batchId: string;
  onClose?: () => void;
}

export function ImportErrorViewer({
  batchId,
  onClose,
}: ImportErrorViewerProps) {
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadErrors();
  }, [batchId]);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/import/${batchId}/errors`);
      const data = await res.json();
      setErrors(data.errors || []);
    } catch (error) {
      console.error("Failed to load errors:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (row: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(row)) {
      newExpanded.delete(row);
    } else {
      newExpanded.add(row);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (errors.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-red-200 bg-red-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <CardTitle className="text-red-900">
              Chi tiết lỗi import ({errors.length} lỗi)
            </CardTitle>
            <p className="text-sm text-red-700 mt-1">
              Các dòng dưới đây không được import thành công
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {errors.map((error) => (
            <div
              key={error.row}
              className="border border-red-300 rounded-lg bg-white overflow-hidden"
            >
              {/* Error Header */}
              <div
                onClick={() => toggleRow(error.row)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-full font-bold text-sm">
                    {error.row}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Dòng {error.row} -{" "}
                      {error.data["Họ tên"] || "Không có tên"}
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      {error.error}
                    </div>
                  </div>
                </div>
                {expandedRows.has(error.row) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Error Details (Expandable) */}
              {expandedRows.has(error.row) && (
                <div className="border-t border-red-200 bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">
                    📋 Dữ liệu trong file Excel:
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {Object.entries(error.data).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-gray-600 w-32 flex-shrink-0">
                          {key}:
                        </span>
                        <span className="font-medium text-gray-900">
                          {value?.toString() || "(trống)"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-red-900">
                          Lý do lỗi:
                        </div>
                        <div className="text-sm text-red-800 mt-1">
                          {error.error}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs text-blue-900">
                      💡 <strong>Cách khắc phục:</strong>
                      <ul className="mt-2 space-y-1 ml-4">
                        {error.error.includes("Ngày sinh") && (
                          <li>• Kiểm tra định dạng ngày sinh: DD/MM/YYYY</li>
                        )}
                        {error.error.includes("Giới tính") && (
                          <li>• Giới tính phải là "Nam" hoặc "Nữ"</li>
                        )}
                        {error.error.includes("Cự ly") && (
                          <li>
                            • Tên cự ly phải khớp chính xác với tên trong sự
                            kiện
                          </li>
                        )}
                        {error.error.includes("Thiếu thông tin") && (
                          <li>
                            • Điền đầy đủ: Họ tên, Email, SĐT, Ngày sinh, Giới
                            tính, Cự ly
                          </li>
                        )}
                        {error.error.includes("Áo") && (
                          <li>
                            • Kiểm tra loại áo, kiểu áo và size có trong hệ
                            thống
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            💡 <strong>Hướng dẫn:</strong> Sửa các lỗi trong file Excel theo gợi
            ý trên, sau đó upload lại file. Các dòng đã import thành công sẽ
            không bị trùng lặp.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // Download error log as CSV for fixing
              const csv = [
                Object.keys(errors[0].data).concat(["Lỗi"]).join(","),
                ...errors.map((e) =>
                  Object.values(e.data)
                    .concat([e.error])
                    .map((v) => `"${v}"`)
                    .join(",")
                ),
              ].join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `import-errors-${batchId}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📥 Tải file lỗi (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
