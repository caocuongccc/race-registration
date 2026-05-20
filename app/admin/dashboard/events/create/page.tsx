// app/admin/dashboard/events/create/page.tsx - UPDATED WITH TABS
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DistanceShirtManager from "@/components/DistanceShirtManager";

import {
  Save,
  ArrowLeft,
  Info,
  Settings,
  CreditCard,
  ImageIcon,
  Settings2,
  Contact,
} from "lucide-react";

interface BankOption {
  name: string;
  shortName: string;
  code: string;
  bin: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "basic" | "payment" | "contact" | "config"
  >("basic");
  const [banks, setBanks] = useState<BankOption[]>([]);

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
    sendBibImmediately: true,
    allowRegistration: false,

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

  useEffect(() => {
    async function loadBanks() {
      try {
        const res = await fetch("/api/banks");
        const data = await res.json();
        setBanks(data.banks || []);
      } catch {
        setBanks([]);
      }
    }

    loadBanks();
  }, []);

  const handleBankChange = (code: string) => {
    const bank = banks.find((item) => item.code === code);
    setFormData({
      ...formData,
      bankCode: code,
      bankName: bank?.name || formData.bankName,
    });
  };

  // Auto generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
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
        toast.info("📸 Tiếp theo: Upload hình ảnh cho sự kiện", {
          duration: 3000,
        });
        router.push(`/admin/dashboard/events/${result.event.id}/edit#media`);
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

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Lưu ý:</strong> Sau khi tạo sự kiện, bạn sẽ được chuyển đến
          trang chỉnh sửa để upload hình ảnh và cấu hình cự ly/áo. Hãy chuẩn bị
          sẵn thông tin cơ bản trước.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex gap-1 p-1">
          {[
            { id: "basic", label: "Thông tin cơ bản", icon: Info },
            { id: "payment", label: "Thanh toán", icon: Settings2 },
            { id: "contact", label: "Liên hệ", icon: Contact },
            // { id: "config", label: "Cự ly & Áo", icon: Settings },
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
                    placeholder="Mô tả chi tiết về sự kiện, mục đích, đối tượng tham gia..."
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
                        setFormData({
                          ...formData,
                          isPublished: e.target.checked,
                        })
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
                    setFormData({
                      ...formData,
                      racePackLocation: e.target.value,
                    })
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
          </>
        )}

        {/* Payment Configuration */}
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

              {/* EMAIL BIB CONFIGURATION */}
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

              {/* BANK INFO */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Thông tin tài khoản ngân hàng
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Tên ngân hàng"
                    value={formData.bankCode}
                    onChange={(e) => handleBankChange(e.target.value)}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banks.map((bank) => (
                      <option key={`${bank.code}-${bank.bin}`} value={bank.code}>
                        {bank.shortName || bank.name} - {bank.name}
                      </option>
                    ))}
                  </Select>

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
        )}

        {/* Contact Info */}
        {activeTab === "contact" && (
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
        )}
        {/* {activeTab === "config" && <DistanceShirtManager eventId={id} />} */}

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
            Tạo sự kiện
          </Button>
        </div>
      </form>
    </div>
  );
}
