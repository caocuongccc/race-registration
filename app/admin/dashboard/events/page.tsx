// app/admin/dashboard/events/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Eye,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Image as ImageIcon, // ← NEW
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  slug: string;
  date: Date;
  location: string;
  status: string;
  isPublished: boolean;
  requireOnlinePayment: boolean;
  hasShirt: boolean;
  _count: {
    registrations: number;
    distances: number;
  };
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data.events);
    } catch (error) {
      toast.error("Không thể tải danh sách sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Nháp", className: "bg-gray-100 text-gray-700" },
      PUBLISHED: {
        label: "Đã công bố",
        className: "bg-blue-100 text-blue-700",
      },
      REGISTRATION_OPEN: {
        label: "Đang mở ĐK",
        className: "bg-green-100 text-green-700",
      },
      REGISTRATION_CLOSED: {
        label: "Đóng ĐK",
        className: "bg-orange-100 text-orange-700",
      },
      COMPLETED: {
        label: "Hoàn thành",
        className: "bg-purple-100 text-purple-700",
      },
      CANCELLED: { label: "Hủy", className: "bg-red-100 text-red-700" },
    };

    const badge = badges[status] || badges.DRAFT;

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý sự kiện</h1>
          <p className="text-gray-600 mt-1">Tổng: {events.length} sự kiện</p>
        </div>
        <Button onClick={() => router.push("/admin/dashboard/events/create")}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo sự kiện mới
        </Button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Chưa có sự kiện nào</p>
            <Button
              onClick={() => router.push("/admin/dashboard/events/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo sự kiện đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{event.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(event.status)}
                      {event.isPublished ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Công khai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Riêng tư
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Event Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{event._count.registrations} đăng ký</span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {event._count.distances} cự ly
                  </span>
                  {event.hasShirt && (
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                      Có áo
                    </span>
                  )}
                  {event.requireOnlinePayment ? (
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                      Webhook tự động
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">
                      Xác nhận thủ công
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/events/${event.slug}/register`, "_blank")
                    }
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Xem
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/dashboard/events/${event.id}/edit`)
                    }
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Sửa
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/admin/dashboard/registrations?eventId=${event.id}`
                      )
                    }
                  >
                    <Users className="w-4 h-4 mr-2" />
                    ĐK ({event._count.registrations})
                  </Button>

                  {/* NEW: Hình ảnh Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200"
                    onClick={() =>
                      router.push(`/admin/dashboard/events/${event.id}/images`)
                    }
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Hình ảnh
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
