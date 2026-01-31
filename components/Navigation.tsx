// components/Navigation.tsx - Updated with Lookup
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Home, Calendar } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              R
            </div>
            <span className="font-bold text-xl text-gray-900">
              Race Registration
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive("/")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Trang chủ</span>
            </Link>

            <Link
              href="/lookup"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive("/lookup")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline">Tra cứu</span>
            </Link>

            {/* Add more links as needed */}
          </div>
        </div>
      </div>
    </nav>
  );
}
