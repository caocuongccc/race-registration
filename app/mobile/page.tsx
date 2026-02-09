// app/mobile/page.tsx - FIXED VERSION
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Search,
  History,
  BarChart3,
  ArrowRight,
  Users,
} from "lucide-react";

export default function MobilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📱 Race Pack Check-in
          </h1>
          <p className="text-gray-600">
            Công cụ quản lý nhận race pack cho BTC
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 gap-4">
          {/* Scan QR */}
          <Link href="/mobile/scan">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white rounded-full p-4">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Quét QR Code
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Quét mã QR từ email runner
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Manual Search */}
          <Link href="/mobile/search">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-gradient-to-r from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-600 text-white rounded-full p-4">
                      <Search className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Tìm kiếm thủ công
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Tìm theo BIB hoặc tên runner
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* History */}
          <Link href="/mobile/history">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 text-white rounded-full p-4">
                      <History className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Lịch sử check-in
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Xem danh sách đã nhận race pack
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Stats */}
          <Link href="/mobile/stats">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-600 text-white rounded-full p-4">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Thống kê
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Xem số liệu check-in
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  💡 Hướng dẫn sử dụng
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>
                    • <strong>Quét QR:</strong> Nhanh nhất cho check-in
                  </li>
                  <li>
                    • <strong>Tìm kiếm:</strong> Khi runner không có QR
                  </li>
                  <li>
                    • <strong>Lịch sử:</strong> Xem lại danh sách đã check
                  </li>
                  <li>
                    • <strong>Thống kê:</strong> Theo dõi tiến độ
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
