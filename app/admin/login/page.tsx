// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      } else {
        toast.success("Đăng nhập thành công!");
        const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error("Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-600">
            🏃 Admin Dashboard
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Đăng nhập để quản lý hệ thống đăng ký giải chạy
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              autoComplete="email"
            />

            <Input
              label="Mật khẩu"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Demo credentials:
              <br />
              Email: <strong>admin@giaichay.com</strong>
              <br />
              Password: <strong>admin123</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}