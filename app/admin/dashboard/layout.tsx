// app/admin/dashboard/layout.tsx - RESPONSIVE VERSION
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Mail,
  BarChart3,
  LogOut,
  Menu,
  X,
  Award,
  Upload,
  ShoppingBag, // NEW: For BIB icon
} from "lucide-react";
import { useEffect, useState } from "react";

const navigationConfig = {
  ADMIN: [
    { name: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Sự kiện", href: "/admin/dashboard/events", icon: Calendar },
    { name: "Đăng ký", href: "/admin/dashboard/registrations", icon: Users },
    { name: "Số BIB", href: "/admin/dashboard/bibs", icon: Award }, // NEW
    {
      name: "Đơn hàng áo",
      href: "/admin/dashboard/shirt-orders",
      icon: ShoppingBag,
    },

    { name: "Thống kê", href: "/admin/dashboard/statistics", icon: BarChart3 },
    { name: "Email", href: "/admin/dashboard/emails", icon: Mail },
    { name: "Email Logs", href: "/admin/dashboard/email-logs", icon: Mail },
    { name: "Upload Excel", href: "/admin/dashboard/import", icon: Upload },
  ],
  ORGANIZER: [
    { name: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
    // { name: "Sự kiện của tôi", href: "/admin/dashboard/events", icon: Calendar, },
    { name: "Đăng ký", href: "/admin/dashboard/registrations", icon: Users },
    {
      name: "Đơn hàng áo",
      href: "/admin/dashboard/shirt-orders",
      icon: ShoppingBag,
    },
    // { name: "Số BIB", href: "/admin/dashboard/bibs", icon: Award }, // NEW
    // { name: "Thống kê", href: "/admin/dashboard/statistics", icon: BarChart3 },
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

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false); // Auto close on mobile
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-50 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0 lg:w-16"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Toggle */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {isSidebarOpen && (
              <div>
                <h1 className="text-2xl font-bold text-blue-600">🏃 Admin</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {session?.user?.role === "ADMIN"
                    ? "Quản lý hệ thống"
                    : "Quản lý giải chạy"}
                </p>
              </div>
            )}

            {/* Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  title={item.name}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            {isSidebarOpen ? (
              <>
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {session?.user?.email}
                  </p>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </Button>
              </>
            ) : (
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors w-full"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5 text-gray-600 mx-auto" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        {/* Mobile Header with Menu Button */}
        {isMobile && (
          <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-blue-600">🏃 Admin</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        )}

        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
