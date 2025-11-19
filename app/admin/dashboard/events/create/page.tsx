// app/admin/dashboard/events/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    date: "",
    location: "",
    address: "",
    city: "",
    status: "DRAFT",
    isPublished: false,
    hasShirt: true,
    requireOnlinePayment: true,

    // Bank info
    bankName: "MB Bank",
    bankAccount: "",
    bankHolder: "",
    bankCode: "MB",

    // Contact
    hotline: "",
    emailSupport: "",
    facebookUrl: "",

    // Race pack
    racePackLocation: "",
    racePackTime: "",
  });

  // Auto generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã tạo sự kiện thành công!");
        router.push(`/admin/dashboard/events/${result.event.id}/edit`);
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể tạo sự kiện");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/dashboard/events")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tạo sự kiện mới</h1>
          <p className="text-gray-600 mt-1">
            Điền thông tin cơ bản của giải chạy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Tên sự kiện"
              placeholder="Ví dụ: Giải Chạy Phường Hòa Khánh 2025"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />

            <Input
              label="Slug (URL)"
              placeholder="giai-chay-phuong-hoa-khanh-2025"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ngày diễn ra"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />

              <Select
                label="Trạng thái"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="DRAFT">Nháp</option>
                <option value="PUBLISHED">Đã công bố</option>
                <option value="REGISTRATION_OPEN">Mở đăng ký</option>
                <option value="REGISTRATION_CLOSED">Đóng đăng ký</option>
              </Select>
            </div>

            <Input
              label="Địa điểm"
              placeholder="Ví dụ: Công viên Biển Đông"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Địa chỉ chi tiết"
                placeholder="Đường Võ Nguyên Giáp"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <Input
                label="Tỉnh/Thành phố"
                placeholder="Đà Nẵng"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.hasShirt}
                  onChange={(e) =>
                    setFormData({ ...formData, hasShirt: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Có bán áo kỷ niệm
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Công khai sự kiện (hiển thị trên trang chủ)
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Payment Configuration */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900">
              ⚙️ Cấu hình thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.requireOnlinePayment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requireOnlinePayment: e.target.checked,
                    })
                  }
                  className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 block mb-1">
                    Bật webhook tự động xác nhận thanh toán
                  </span>
                  <span className="text-sm text-gray-600">
                    {formData.requireOnlinePayment ? (
                      <>
                        ✅ <strong>BẬT:</strong> Webhook tự động đánh dấu thanh
                        toán
                      </>
                    ) : (
                      <>
                        ⚠️ <strong>TẮT:</strong> Admin phải xác nhận thủ công
                      </>
                    )}
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-900">
                Thông tin tài khoản ngân hàng
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tên ngân hàng"
                  value={formData.bankName}
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                />

                <Input
                  label="Mã ngân hàng"
                  value={formData.bankCode}
                  onChange={(e) =>
                    setFormData({ ...formData, bankCode: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Số tài khoản"
                  value={formData.bankAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, bankAccount: e.target.value })
                  }
                />

                <Input
                  label="Chủ tài khoản"
                  placeholder="NGUYEN VAN A"
                  value={formData.bankHolder}
                  onChange={(e) =>
                    setFormData({ ...formData, bankHolder: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Hotline"
                placeholder="0912345678"
                value={formData.hotline}
                onChange={(e) =>
                  setFormData({ ...formData, hotline: e.target.value })
                }
              />

              <Input
                label="Email hỗ trợ"
                type="email"
                placeholder="support@giaichay.com"
                value={formData.emailSupport}
                onChange={(e) =>
                  setFormData({ ...formData, emailSupport: e.target.value })
                }
              />
            </div>

            <Input
              label="Facebook URL"
              placeholder="https://facebook.com/giaichay"
              value={formData.facebookUrl}
              onChange={(e) =>
                setFormData({ ...formData, facebookUrl: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Race Pack Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin nhận race pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Địa điểm nhận"
              placeholder="Nhà văn hóa Phường..."
              value={formData.racePackLocation}
              onChange={(e) =>
                setFormData({ ...formData, racePackLocation: e.target.value })
              }
            />

            <Input
              label="Thời gian nhận"
              placeholder="29-30/12/2025, 14:00 - 20:00"
              value={formData.racePackTime}
              onChange={(e) =>
                setFormData({ ...formData, racePackTime: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/dashboard/events")}
          >
            Hủy
          </Button>
          <Button type="submit" size="lg" isLoading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Tạo sự kiện
          </Button>
        </div>
      </form>
    </div>
  );
}
