// app/admin/dashboard/events/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";

export default function EditEventPage() {
  const params = useParams();
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
    hasShirt: false,
    requireOnlinePayment: true, // NEW FIELD

    // Bank info (only if requireOnlinePayment = true)
    bankName: "",
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
  useEffect(() => {
    if (params?.id) {
      setId(params.id as string);
    }
  }, [params]);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}`);
      const data = await res.json();

      // Convert date to input format
      const eventDate = new Date(data.event.date);
      const formattedDate = eventDate.toISOString().split("T")[0];

      setFormData({
        ...data.event,
        date: formattedDate,
      });
    } catch (error) {
      toast.error("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/events/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Đã lưu thay đổi");
        router.push("/admin/dashboard/events");
      } else {
        toast.error(result.error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/dashboard/events")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Chỉnh sửa sự kiện
            </h1>
            <p className="text-gray-600 mt-1">{formData.name}</p>
          </div>
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
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Input
              label="Slug (URL)"
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
                <option value="COMPLETED">Hoàn thành</option>
              </Select>
            </div>

            <Input
              label="Địa điểm"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Địa chỉ chi tiết"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />

              <Input
                label="Tỉnh/Thành phố"
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
                  Công khai sự kiện
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
                        ✅ <strong>BẬT:</strong> Khi VĐV chuyển khoản, webhook
                        sẽ tự động đánh dấu đã thanh toán và sinh số BIB ngay
                        lập tức.
                      </>
                    ) : (
                      <>
                        ⚠️ <strong>TẮT:</strong> VĐV vẫn nhận QR thanh toán qua
                        email, nhưng bạn phải vào trang Registrations và tìm
                        theo SĐT để bấm nút <strong>✓ Xác nhận</strong> thủ công
                        sau khi họ chuyển khoản.
                      </>
                    )}
                  </span>
                  <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded">
                    💡 <strong>Lưu ý:</strong> Cả 2 chế độ đều gửi QR Code thanh
                    toán. Chỉ khác nhau ở cách xác nhận: Tự động (webhook) vs
                    Thủ công (admin).
                  </div>
                </div>
              </label>
            </div>

            {formData.requireOnlinePayment && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-gray-900">
                  Thông tin tài khoản ngân hàng
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Tên ngân hàng"
                    placeholder="MB Bank"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                  />

                  <Input
                    label="Mã ngân hàng"
                    placeholder="MB"
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
                    value={formData.bankHolder}
                    onChange={(e) =>
                      setFormData({ ...formData, bankHolder: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
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
                value={formData.hotline}
                onChange={(e) =>
                  setFormData({ ...formData, hotline: e.target.value })
                }
              />

              <Input
                label="Email hỗ trợ"
                type="email"
                value={formData.emailSupport}
                onChange={(e) =>
                  setFormData({ ...formData, emailSupport: e.target.value })
                }
              />
            </div>

            <Input
              label="Facebook URL"
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
              value={formData.racePackLocation}
              onChange={(e) =>
                setFormData({ ...formData, racePackLocation: e.target.value })
              }
            />

            <Input
              label="Thời gian nhận"
              placeholder="Ví dụ: 29-30/12/2025, 14:00 - 20:00"
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
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
