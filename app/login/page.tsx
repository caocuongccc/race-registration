// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
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
        toast.error(
          "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu."
        );
      } else {
        toast.success("Đăng nhập thành công!");

        // Fetch user session to get role
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        // Redirect based on role
        if (
          session?.user?.role === "ADMIN" ||
          session?.user?.role === "ORGANIZER" ||
          session?.user?.role === "MEMBER"
        ) {
          router.push("/admin/dashboard");
        } else {
          router.push("/member");
        }

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
            🏃 Đăng Nhập
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Đăng nhập để xem thông tin đăng ký của bạn
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
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
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loading}
            >
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <Link href="/" className="text-blue-600 hover:underline">
                Đăng ký tham gia giải chạy
              </Link>
            </p>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-500">
                Bạn là quản trị viên?{" "}
                <Link
                  href="/admin/login"
                  className="text-blue-600 hover:underline"
                >
                  Đăng nhập Admin
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
