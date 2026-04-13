// app/admin/dashboard/events/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageGallery } from "@/components/ImageGallery";
import DistanceShirtManager from "@/components/DistanceShirtManager";
import EventUserManager from "@/components/EventUserManager";
import { toast } from "sonner";
import {
  Save,
  ArrowLeft,
  Image as ImageIcon,
  Info,
  Settings,
  Contact,
  Settings2,
  User,
  FormInputIcon,
} from "lucide-react";
import { FormFieldConfigManager } from "@/components/FormFieldConfigManager";

export default function EditEventPage() {
  const params = useParams();
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "basic"
    | "media"
    | "payment"
    | "contact"
    | "config"
    | "users"
    | "form-config"
  >("basic");
  const [eventImages, setEventImages] = useState<any[]>([]);

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
    requireOnlinePayment: true,
    sendBibImmediately: true, // NEW
    allowRegistration: false, // NEW
    // Images
    logoUrl: "",
    bannerUrl: "",
    coverImageUrl: "",

    // Bank info
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
      loadImages();
    }
  }, [id]);
  // Thêm useEffect để handle URL hash
  useEffect(() => {
    // Check URL hash to open specific tab
    const hash = window.location.hash.replace("#", "");
    if (hash === "media") {
      setActiveTab("media");
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);
  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}`);
      const data = await res.json();

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

  const loadImages = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}/images`);
      const data = await res.json();
      setEventImages(data.images || []);
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
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

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex gap-1 p-1">
          {[
            { id: "basic", label: "Thông tin cơ bản", icon: Info },
            { id: "media", label: "Hình ảnh", icon: ImageIcon },
            { id: "payment", label: "Thanh toán", icon: Settings2 },
            { id: "contact", label: "Liên hệ", icon: Contact },
            { id: "config", label: "Cự ly & Áo", icon: Settings },
            { id: "users", label: "Quản lý người dùng", icon: User },
            { id: "form-config", label: "Cấu hình Form", icon: FormInputIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Tab */}
        {activeTab === "basic" && (
          <>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mô tả chi tiết về sự kiện..."
                  />
                </div>

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
                        setFormData({
                          ...formData,
                          isPublished: e.target.checked,
                        })
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
                    setFormData({
                      ...formData,
                      racePackLocation: e.target.value,
                    })
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
          </>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          <>
            {/* Primary Images */}
            <Card>
              <CardHeader>
                <CardTitle>🖼️ Hình ảnh chính</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageUploader
                  folder={`events/${id}/cover`}
                  currentImage={formData.coverImageUrl}
                  onUploadComplete={(url, publicId) => {
                    setFormData({ ...formData, coverImageUrl: url });
                  }}
                  onRemove={() => {
                    setFormData({ ...formData, coverImageUrl: "" });
                  }}
                  label="📸 Ảnh bìa (Cover Image) - Hiển thị trên trang chủ và trang chi tiết"
                  aspectRatio="21/9"
                />

                <div className="border-t pt-6">
                  <ImageUploader
                    folder={`events/${id}/banner`}
                    currentImage={formData.bannerUrl}
                    onUploadComplete={(url, publicId) => {
                      setFormData({ ...formData, bannerUrl: url });
                    }}
                    onRemove={() => {
                      setFormData({ ...formData, bannerUrl: "" });
                    }}
                    label="🎨 Banner (Hero Image) - Ảnh phụ nếu không có cover"
                    aspectRatio="16/9"
                  />
                </div>

                <div className="border-t pt-6">
                  <ImageUploader
                    folder={`events/${id}/logo`}
                    currentImage={formData.logoUrl}
                    onUploadComplete={(url, publicId) => {
                      setFormData({ ...formData, logoUrl: url });
                    }}
                    onRemove={() => {
                      setFormData({ ...formData, logoUrl: "" });
                    }}
                    label="🏷️ Logo - Hiển thị overlay trên ảnh bìa"
                    aspectRatio="1/1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Event Gallery */}
            <Card>
              <CardHeader>
                <CardTitle>📷 Thư viện ảnh sự kiện</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <ImageGallery
                  eventId={id!}
                  images={eventImages}
                  onImagesChange={loadImages}
                  imageType="GALLERY"
                  title="🎉 Ảnh sự kiện (các khoảnh khắc trong giải)"
                />

                <div className="border-t pt-8">
                  <ImageGallery
                    eventId={id!}
                    images={eventImages}
                    onImagesChange={loadImages}
                    imageType="VENUE"
                    title="📍 Ảnh địa điểm tổ chức"
                  />
                </div>

                <div className="border-t pt-8">
                  <ImageGallery
                    eventId={id!}
                    images={eventImages}
                    onImagesChange={loadImages}
                    imageType="COURSE_MAP"
                    title="🗺️ Bản đồ đường chạy"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shirt Preview Images */}
            <Card>
              <CardHeader>
                <CardTitle>👕 Ảnh mẫu áo kỷ niệm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Lưu ý:</strong> Upload ảnh mẫu áo để VĐV có thể
                    xem trước khi chọn. Nên upload nhiều góc độ: mặt trước, mặt
                    sau, chi tiết in.
                  </p>
                </div>

                <ImageGallery
                  eventId={id!}
                  images={eventImages}
                  onImagesChange={loadImages}
                  imageType="SHIRT_MALE"
                  title="👔 Áo Nam"
                />

                <div className="border-t pt-8">
                  <ImageGallery
                    eventId={id!}
                    images={eventImages}
                    onImagesChange={loadImages}
                    imageType="SHIRT_FEMALE"
                    title="👗 Áo Nữ"
                  />
                </div>

                <div className="border-t pt-8">
                  <ImageGallery
                    eventId={id!}
                    images={eventImages}
                    onImagesChange={loadImages}
                    imageType="SHIRT_KID"
                    title="👶 Áo Trẻ Em"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "payment" && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-900">
                ⚙️ Cấu hình thanh toán & Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* PAYMENT MODE */}
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
                          ✅ <strong>BẬT:</strong> Webhook tự động đánh dấu
                          thanh toán
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

              {/* NEW: EMAIL BIB CONFIGURATION */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.sendBibImmediately}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sendBibImmediately: e.target.checked,
                      })
                    }
                    className="mt-1 h-5 w-5 text-purple-600 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block mb-1">
                      Gửi số BIB ngay khi thanh toán thành công
                    </span>
                    <span className="text-sm text-gray-600">
                      {formData.sendBibImmediately ? (
                        <>
                          ✅ <strong>BẬT:</strong> Email có số BIB ngay khi
                          thanh toán
                          <br />→ VĐV nhận số BIB và mã QR check-in ngay lập tức
                        </>
                      ) : (
                        <>
                          📋 <strong>TẮT:</strong> Email xác nhận thanh toán
                          (không có BIB)
                          <br />
                          → Admin phải vào trang "Gửi số BIB" để công bố sau
                          <br />→ Thích hợp khi cần xếp BIB theo đội, theo tuổi,
                          v.v.
                        </>
                      )}
                    </span>
                  </div>
                </label>
              </div>

              {/* REGISTRATION STATUS */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allowRegistration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowRegistration: e.target.checked,
                      })
                    }
                    className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block mb-1">
                      Cho phép đăng ký online
                    </span>
                    <span className="text-sm text-gray-600">
                      {formData.allowRegistration ? (
                        <>
                          ✅ <strong>BẬT:</strong> Hiển thị nút "Đăng ký ngay"
                          trên trang sự kiện
                        </>
                      ) : (
                        <>
                          🚫 <strong>TẮT:</strong> Chỉ hiển thị thông tin, không
                          cho đăng ký
                          <br />
                          (Thích hợp khi: hết chỗ, chưa mở đăng ký, hoặc chỉ
                          muốn công bố thông tin)
                        </>
                      )}
                    </span>
                  </div>
                </label>
              </div>

              {/* <br /> */}

              {/* BANK INFO */}
              <div className="space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
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
        )}
        {activeTab === "config" && <DistanceShirtManager eventId={id} />}
        {activeTab === "users" && <EventUserManager eventId={id} />}
        {activeTab === "form-config" && <FormFieldConfigManager eventId={id} />}
        {/* Save Button - Always visible */}
        <div className="flex justify-end gap-3 sticky bottom-6 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
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
