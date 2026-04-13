// components/FormFieldConfigManager.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Eye, EyeOff } from "lucide-react";

interface FormFieldConfig {
  showIdCard: boolean;
  showAddress: boolean;
  showCity: boolean;
  showBloodType: boolean;
  showEmergencyContact: boolean;
  showHealthDeclaration: boolean;
  showBibName: boolean;
}

const DEFAULT_CONFIG: FormFieldConfig = {
  showIdCard: true,
  showAddress: true,
  showCity: true,
  showBloodType: false,
  showEmergencyContact: true,
  showHealthDeclaration: true,
  showBibName: true,
};

interface Props {
  eventId: string;
}

export function FormFieldConfigManager({ eventId }: Props) {
  const [config, setConfig] = useState<FormFieldConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, [eventId]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`);
      const data = await res.json();

      if (data.event) {
        setConfig({
          showIdCard: data.event.showIdCard ?? true,
          showAddress: data.event.showAddress ?? true,
          showCity: data.event.showCity ?? true,
          showBloodType: data.event.showBloodType ?? false,
          showEmergencyContact: data.event.showEmergencyContact ?? true,
          showHealthDeclaration: data.event.showHealthDeclaration ?? true,
          showBibName: data.event.showBibName ?? true,
        });
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/form-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast.success("✅ Đã lưu cấu hình form");
      } else {
        toast.error("❌ Không thể lưu cấu hình");
      }
    } catch (error) {
      toast.error("❌ Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (field: keyof FormFieldConfig) => {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return <div className="text-center py-4">Đang tải...</div>;
  }

  const fields = [
    {
      key: "showIdCard",
      label: "CCCD/CMND",
      description: "Số chứng minh nhân dân / căn cước công dân",
    },
    {
      key: "showAddress",
      label: "Địa chỉ chi tiết",
      description: "Địa chỉ cụ thể (số nhà, đường)",
    },
    {
      key: "showCity",
      label: "Tỉnh/Thành phố",
      description: "Tỉnh/Thành phố cư trú",
    },
    {
      key: "showBloodType",
      label: "Nhóm máu",
      description: "Nhóm máu của vận động viên",
    },
    {
      key: "showEmergencyContact",
      label: "Liên hệ khẩn cấp",
      description: "Thông tin người thân liên hệ khẩn cấp",
    },
    {
      key: "showHealthDeclaration",
      label: "Cam kết sức khỏe",
      description: "Cam kết về tình trạng sức khỏe",
    },
    {
      key: "showBibName",
      label: "Tên in BIB",
      description: "Tên muốn in trên BIB (số áo)",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📋 Cấu hình Form Đăng Ký</span>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            💡 <strong>Hướng dẫn:</strong> Tùy chỉnh các trường hiển thị trên
            form đăng ký cho sự kiện này. Bỏ tích để ẩn trường khỏi form.
          </p>
        </div>

        <div className="space-y-3">
          {fields.map(({ key, label, description }) => {
            const isShown = config[key as keyof FormFieldConfig];

            return (
              <div
                key={key}
                className={`p-4 border-2 rounded-lg transition-all ${
                  isShown
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{label}</h4>
                    <p className="text-xs text-gray-600 mt-1">{description}</p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={isShown}
                      onChange={() => toggleField(key as keyof FormFieldConfig)}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">
                      {isShown ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Eye className="w-4 h-4" />
                          Hiển thị
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500">
                          <EyeOff className="w-4 h-4" />
                          Ẩn
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900">
            ⚠️ <strong>Lưu ý:</strong> Sau khi thay đổi cấu hình, form đăng ký
            sẽ tự động cập nhật. Các đăng ký cũ vẫn giữ nguyên dữ liệu đã nhập
            trước đó.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
