// app/page.tsx - WITH URL FOR POPUP
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Users,
  Award,
  Shirt,
  ArrowRight,
  Eye,
  Search,
} from "lucide-react";
import { EventDetailModal } from "@/components/EventDetailModal";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  date: Date;
  location: string;
  logoUrl?: string;
  bannerUrl?: string;
  coverImageUrl?: string;
  hasShirt: boolean;
  allowRegistration: boolean;
  status: string;
  distances: Array<{
    name: string;
    price: number;
    currentParticipants: number;
    maxParticipants: number | null;
  }>;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventImages, setEventImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  // ✅ NEW: Handle URL parameter for event detail
  useEffect(() => {
    const eventSlug = searchParams.get("event");
    if (eventSlug && events.length > 0) {
      const event = events.find((e) => e.slug === eventSlug);
      if (event) {
        handleViewDetail(event);
      }
    }
  }, [searchParams, events]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingImages(true);

    // ✅ NEW: Update URL without page reload
    router.push(`/?event=${event.slug}`, { scroll: false });

    try {
      const res = await fetch(`/api/events/${event.slug}/images`);
      const data = await res.json();
      setEventImages(data.images || []);
    } catch (error) {
      console.error("Failed to load images:", error);
      setEventImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  // ✅ NEW: Handle modal close - remove URL param
  const handleCloseModal = () => {
    setSelectedEvent(null);
    setEventImages([]);
    router.push("/", { scroll: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                🏃 Hệ Thống Đăng Ký Giải Chạy
              </h1>
              <p className="text-gray-600 mt-1">
                Đăng ký online nhanh chóng, tiện lợi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Tham Gia Giải Chạy
            <br />
            <span className="text-blue-600">Cùng Cộng Đồng Runners</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Đăng ký tham gia các giải chạy. Đơn giản, nhanh chóng, an toàn.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Đăng ký online
              </h3>
              <p className="text-sm text-gray-600">
                Đăng ký mọi lúc, mọi nơi chỉ với vài thao tác đơn giản
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Nhận BIB tự động
              </h3>
              <p className="text-sm text-gray-600">
                Số BIB được sinh tự động ngay sau khi thanh toán thành công
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shirt className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Mua áo kỷ niệm
              </h3>
              <p className="text-sm text-gray-600">
                Chọn áo và size phù hợp ngay khi đăng ký
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Các Giải Chạy Sắp Diễn Ra
          </h2>

          {events.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Hiện chưa có giải chạy nào được công bố.
                  <br />
                  Vui lòng quay lại sau!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full min-h-[520px]"
                >
                  {/* Cover Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                    {event.coverImageUrl || event.bannerUrl ? (
                      <>
                        <img
                          src={event.coverImageUrl || event.bannerUrl}
                          alt={event.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          style={{
                            imageRendering: "auto",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Award className="w-20 h-20 text-white opacity-50" />
                      </div>
                    )}

                    {event.logoUrl && (
                      <div className="absolute bottom-4 left-4 z-10">
                        <img
                          src={event.logoUrl}
                          alt={event.name}
                          className="w-16 h-16 object-contain bg-white/90 rounded-lg p-2 shadow-lg backdrop-blur-sm"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle
                      className="text-base leading-5 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(event)}
                    >
                      {event.name}
                    </CardTitle>
                  </CardHeader>

                  {/* ✅ FIXED CONTENT */}
                  <CardContent className="flex flex-col flex-1 pt-0">
                    {/* FLEX AREA */}
                    <div className="flex-1 space-y-3">
                      {/* Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span className="text-sm">
                            {formatDate(event.date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="text-sm line-clamp-1">
                            {event.location}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.7rem]">
                        {event.description || ""}
                      </p>

                      {/* Distances */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Award className="w-4 h-4 shrink-0" />
                          Cự ly:
                        </div>

                        <div className="flex flex-wrap gap-2 min-h-[3.5rem] content-start">
                          {event.distances.slice(0, 3).map((distance, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap"
                            >
                              {distance.name}
                            </span>
                          ))}

                          {event.distances.length > 3 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              +{event.distances.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PRICE */}
                    <div className="mt-auto pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Giá từ:</span>

                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(
                            Math.min(...event.distances.map((d) => d.price)),
                          )}
                        </span>
                      </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs whitespace-nowrap"
                        size="sm"
                        onClick={() => handleViewDetail(event)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Chi tiết
                      </Button>

                      {event.allowRegistration ? (
                        <Link href={`/events/${event.slug}/register`} className="min-w-0">
                          <Button className="w-full h-8 text-xs whitespace-nowrap" size="sm">
                            Đăng ký
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          className="w-full h-8 text-xs whitespace-nowrap opacity-50 cursor-not-allowed"
                          size="sm"
                          disabled
                        >
                          {event.status === "PUBLISHED"
                            ? "Chưa mở ĐK"
                            : "Đã đóng ĐK"}
                        </Button>
                      )}
                    </div>

                    {/* FIX HEIGHT STATUS */}
                    <p className="text-xs text-center text-orange-600 min-h-[16px] leading-4 mt-2">
                      {!event.allowRegistration
                        ? event.status === "PUBLISHED"
                          ? "🔔 Sắp mở đăng ký"
                          : "🚫 Đã đóng đăng ký"
                        : ""}
                    </p>

                    {/* FIX HEIGHT SHIRT */}
                    <p className="text-xs text-center text-gray-500 min-h-[16px] leading-4">
                      {event.hasShirt ? "🎽 Có bán kèm áo kỷ niệm" : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              © 2025 Hệ Thống Đăng Ký Giải Chạy. All rights reserved.
            </p>
            <p className="text-sm">
              Được phát triển với ❤️ cho cộng đồng runners
            </p>
          </div>
        </div>
      </footer>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          distances={selectedEvent.distances}
          images={eventImages}
          isOpen={!!selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export function LookupBanner() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Search className="w-16 h-16 text-white mx-auto mb-6" />

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Đã đăng ký? Tra cứu ngay!
          </h2>

          <p className="text-xl text-blue-100 mb-8">
            Kiểm tra trạng thái thanh toán và số BIB của bạn chỉ với vài thao
            tác đơn giản
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/lookup"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Search className="w-5 h-5" />
              Tra cứu đăng ký
            </Link>

            <div className="flex items-center gap-6 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  ✓
                </div>
                <span className="text-sm">Kiểm tra nhanh</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  🔒
                </div>
                <span className="text-sm">Bảo mật cao</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">🔍</div>
              <div className="font-medium mb-1">Tìm kiếm dễ dàng</div>
              <div className="text-sm text-blue-100">
                Chỉ cần tên, SĐT hoặc email
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">⚡</div>
              <div className="font-medium mb-1">Kết quả tức thì</div>
              <div className="text-sm text-blue-100">
                Xem trạng thái và số BIB ngay lập tức
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl mb-2">🔐</div>
              <div className="font-medium mb-1">Bảo mật thông tin</div>
              <div className="text-sm text-blue-100">
                Dữ liệu được mã hóa và bảo vệ
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
