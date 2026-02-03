// app/mobile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RadixSelect,
  RadixSelectContent,
  RadixSelectItem,
  RadixSelectTrigger,
  RadixSelectValue,
} from "@/components/ui/radix-select";
import { Camera, Search, BarChart3, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { SelectContent } from "@radix-ui/react-select";

export default function MobileHomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchStats();
    }
  }, [selectedEventId]);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events || []);

      if (data.events?.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (error) {
      console.error("Fetch events error:", error);
    }
  }

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetch(`/api/mobile/stats?eventId=${selectedEventId}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Fetch stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Package className="w-6 h-6" />
              Race Pack Check-in
            </CardTitle>
            <p className="text-blue-100 text-sm">
              Xin chào, {session.user?.name}
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Event Selector */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Chọn sự kiện
              </label>
              <RadixSelect
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <RadixSelectTrigger className="w-full">
                  <RadixSelectValue placeholder="Chọn sự kiện" />
                </RadixSelectTrigger>
                <RadixSelectContent>
                  {events.map((event) => (
                    <RadixSelectItem key={event.id} value={event.id}>
                      {event.name}
                    </RadixSelectItem>
                  ))}
                </RadixSelectContent>
              </RadixSelect>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Thống kê hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.total}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Tổng ĐK</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.collected}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Đã nhận</div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {stats.pending}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Chờ nhận</div>
                </div>
              </div>

              {stats.paid > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tỷ lệ đã nhận</span>
                    <span className="text-lg font-bold text-blue-600">
                      {stats.collectionRate}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${stats.collectionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href="/mobile/scan" className="block">
            <Button
              size="lg"
              className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
            >
              <Camera className="w-6 h-6 mr-3" />
              Quét QR Code
            </Button>
          </Link>

          <Link href="/mobile/search" className="block">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base border-2 border-blue-200 hover:bg-blue-50"
            >
              <Search className="w-5 h-5 mr-2" />
              Tìm theo BIB
            </Button>
          </Link>

          <Link
            href={`/mobile/history?eventId=${selectedEventId}`}
            className="block"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-base border-2 border-gray-200 hover:bg-gray-50"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Lịch sử check-in
            </Button>
          </Link>
        </div>

        {/* Quick Guide */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              📝 Hướng dẫn nhanh
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>1. Nhấn "Quét QR Code" để bắt đầu</li>
              <li>2. Hướng QR code từ email runner vào camera</li>
              <li>3. Kiểm tra thông tin và chụp ảnh (optional)</li>
              <li>4. Nhấn "Xác nhận nhận race pack"</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
