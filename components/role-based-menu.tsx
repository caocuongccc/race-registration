"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function RoleBasedMenu() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Menu items với điều kiện hiển thị
  const menuItems = [
    {
      name: "Trang chủ",
      href: "/dashboard",
      roles: ["ADMIN", "ORGANIZER", "MEMBER"], // Tất cả
    },
    {
      name: "Sự kiện",
      href: "/events",
      roles: ["ADMIN", "ORGANIZER"], // Chỉ ADMIN và ORGANIZER
    },
    {
      name: "Đăng ký",
      href: "/registrations",
      roles: ["ADMIN", "ORGANIZER", "MEMBER"], // Tất cả
    },
    {
      name: "Upload",
      href: "/upload",
      roles: ["ADMIN", "ORGANIZER"], // Chỉ ADMIN và ORGANIZER
    },
    {
      name: "Người dùng",
      href: "/users",
      roles: ["ADMIN"], // Chỉ ADMIN
    },
  ];

  // Lọc menu theo role
  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole || ""),
  );

  return (
    <nav className="flex gap-4">
      {visibleMenuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-4 py-2 rounded hover:bg-gray-100"
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
