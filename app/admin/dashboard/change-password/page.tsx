"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordField, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [formData, setFormData] = useState<Record<PasswordField, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const toggleFieldVisibility = (field: PasswordField) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("Mật khẩu mới cần tối thiểu 8 ký tự");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Không thể đổi mật khẩu");
        return;
      }

      toast.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      await signOut({ callbackUrl: "/admin/login" });
    } catch (error) {
      toast.error("Đã có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (
    field: PasswordField,
    label: string,
    autoComplete: string,
  ) => (
    <div className="relative">
      <Input
        label={label}
        type={visibleFields[field] ? "text" : "password"}
        value={formData[field]}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, [field]: e.target.value }))
        }
        required
        autoComplete={autoComplete}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => toggleFieldVisibility(field)}
        className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
        aria-label={visibleFields[field] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {visibleFields[field] ? (
          <EyeOff className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Đổi mật khẩu</h1>
        <p className="mt-1 text-gray-600">
          Cập nhật mật khẩu đăng nhập admin để bảo vệ tài khoản.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Thông tin mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {renderPasswordField(
              "currentPassword",
              "Mật khẩu hiện tại",
              "current-password",
            )}
            {renderPasswordField(
              "newPassword",
              "Mật khẩu mới",
              "new-password",
            )}
            {renderPasswordField(
              "confirmPassword",
              "Nhập lại mật khẩu mới",
              "new-password",
            )}

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Lưu ý bảo mật</p>
                  <p className="mt-1 text-blue-800">
                    Sau khi đổi mật khẩu thành công, hệ thống sẽ đăng xuất để
                    anh đăng nhập lại bằng mật khẩu mới.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" isLoading={loading} disabled={loading}>
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
