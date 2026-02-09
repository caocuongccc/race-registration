// app/mobile/stats/mobile-stats-wrapper.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RadixSelect,
  RadixSelectContent,
  RadixSelectItem,
  RadixSelectTrigger,
  RadixSelectValue,
} from "@/components/ui/radix-select";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  total: number;
  paid: number;
  collected: number;
  pending: number;
  collectionRate: number;
}

interface RecentCollection {
  id: string;
  bibNumber: string | null;
  fullName: string;
  racePackCollectedAt: Date;
  collectedBy: {
    name: string;
  } | null;
}

export default function MobileStatsClient() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentCollections, setRecentCollections] = useState<
    RecentCollection[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Get eventId from URL params
  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [searchParams]);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch stats when event selected
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
      setRecentCollections(data.recentCollections || []);
    } catch (error) {
      console.error("Fetch stats error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/mobile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Thống kê Check-in</h1>
        </div>

        {/* Event Selector */}
        <Card className="mb-4 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Chọn sự kiện</CardTitle>
          </CardHeader>
          <CardContent>
            <RadixSelect
              value={selectedEventId}
              onValueChange={(value) => setSelectedEventId(value)}
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
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Stats Cards */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Total */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Tổng ĐK</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {stats.total}
                      </p>
                    </div>
                    <Users className="w-10 h-10 text-blue-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Paid */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 mb-1">Đã TT</p>
                      <p className="text-3xl font-bold text-green-900">
                        {stats.paid}
                      </p>
                    </div>
                    <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Collected */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 mb-1">Đã nhận</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {stats.collected}
                      </p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-purple-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Pending */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700 mb-1">Chờ nhận</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {stats.pending}
                      </p>
                    </div>
                    <Clock className="w-10 h-10 text-orange-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Collection Rate */}
            <Card className="mb-4 border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-700 mb-2">
                    Tỷ lệ nhận race pack
                  </p>
                  <p className="text-5xl font-bold text-blue-900 mb-1">
                    {stats.collectionRate}%
                  </p>
                  <p className="text-xs text-blue-600">
                    {stats.collected} / {stats.paid} VĐV đã thanh toán
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mt-4 bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.collectionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Collections */}
            {recentCollections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    📋 Check-in gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCollections.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white font-bold rounded px-2 py-1 text-sm">
                            {item.bibNumber || "---"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {item.fullName}
                            </p>
                            {item.collectedBy && (
                              <p className="text-xs text-gray-500">
                                BTC: {item.collectedBy.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(
                            item.racePackCollectedAt,
                          ).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !stats && selectedEventId && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="pt-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">Chưa có dữ liệu</p>
              <p className="text-sm text-gray-500">
                Chưa có thống kê cho sự kiện này
              </p>
            </CardContent>
          </Card>
        )}

        {/* Refresh Button */}
        {selectedEventId && !loading && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={fetchStats}>
              Làm mới
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
