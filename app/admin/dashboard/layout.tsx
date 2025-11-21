// app/admin/dashboard/layout.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ShoppingBag,
  Mail,
  BarChart3,
  LogOut,
  Settings,
  Image as ImageIcon, // ← NEW
} from "lucide-react";
import { useEffect } from "react";

const navigationConfig = {
  ADMIN: [
    {
      name: "Tổng quan",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Sự kiện",
      href: "/admin/dashboard/events",
      icon: Calendar,
    },
    {
      name: "Đăng ký",
      href: "/admin/dashboard/registrations",
      icon: Users,
    },
    {
      name: "Thống kê",
      href: "/admin/dashboard/statistics",
      icon: BarChart3,
    },
    {
      name: "Email",
      href: "/admin/dashboard/emails",
      icon: Mail,
    },
  ],
  ORGANIZER: [
    {
      name: "Tổng quan",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Sự kiện của tôi",
      href: "/admin/dashboard/events",
      icon: Calendar,
    },
    {
      name: "Đăng ký",
      href: "/admin/dashboard/registrations",
      icon: Users,
    },
    {
      name: "Thống kê",
      href: "/admin/dashboard/statistics",
      icon: BarChart3,
    },
  ],
  MEMBER: [],
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "MEMBER") {
      router.push("/member");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navigation = session?.user?.role
    ? navigationConfig[session.user.role as keyof typeof navigationConfig] || []
    : [];

  if (session?.user?.role === "MEMBER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">🏃 Admin</h1>
            <p className="text-sm text-gray-500 mt-1">
              {session?.user?.role === "ADMIN"
                ? "Quản lý hệ thống"
                : "Quản lý giải chạy"}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                    session?.user?.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {session?.user?.role === "ADMIN"
                    ? "Quản trị viên"
                    : "Người tổ chức"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
