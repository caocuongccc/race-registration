// app/events/[slug]/lookup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface LookupResult {
  id: string;
  fullName: string;
  emailMasked: string;
  emailFull: string;
  phoneMasked: string;
  phoneFull: string;
  bibNumber: string | null;
  distance: string;
  paymentStatus: string;
  registrationDate: Date;
  event: string;
  eventId: string;
}

export default function EventLookupPage() {
  const params = useParams();
  const router = useRouter();
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    if (params?.slug) {
      setEventSlug(params.slug as string);
    }
  }, [params]);

  useEffect(() => {
    if (eventSlug) {
      loadEvent();
    }
  }, [eventSlug]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventSlug}/details`);
      const data = await res.json();

      if (!res.ok || !data.event) {
        throw new Error("Sự kiện không tồn tại");
      }

      setEvent(data.event);
    } catch (error) {
      toast.error("Không thể tải thông tin sự kiện");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      toast.error("Vui lòng nhập ít nhất 3 ký tự để tìm kiếm");
      return;
    }

    if (!event?.id) {
      toast.error("Không tìm thấy thông tin sự kiện");
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        eventId: event.id,
      });

      const res = await fetch(`/api/public/lookup?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không thể tìm kiếm");
      }

      setResults(data.results || []);

      if (data.results.length === 0) {
        toast.info("Không tìm thấy kết quả phù hợp");
      }
    } catch (error: any) {
      toast.error(error.message || "Đã có lỗi xảy ra");
    } finally {
      setSearching(false);
    }
  };

  const toggleSensitive = (id: string) => {
    setShowSensitive((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Đã thanh toán
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Chờ thanh toán
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Thất bại
          </span>
        );
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/events/${eventSlug}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại sự kiện
        </Button>

        {/* Header with Event Info */}
        <Card className="mb-8 border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              {event.logoUrl && (
                <img
                  src={event.logoUrl}
                  alt={event.name}
                  className="w-24 h-24 mx-auto mb-4 object-contain"
                />
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🔍 Tra Cứu Đăng Ký
              </h1>
              <h2 className="text-2xl text-blue-600 mb-2">{event.name}</h2>
              <p className="text-gray-600">
                Kiểm tra trạng thái đăng ký và thanh toán của bạn
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search Box */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm theo tên, số điện thoại hoặc email
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Nhập tên, SĐT hoặc email (tối thiểu 3 ký tự)..."
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 3}
                className="w-full h-12 text-lg"
                isLoading={searching}
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang tìm kiếm...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Tìm kiếm
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Bảo mật:</strong> Một số thông tin cá nhân được ẩn để
                bảo mật. Click vào biểu tượng con mắt để hiển thị đầy đủ.
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <span>Kết quả tìm kiếm ({results.length})</span>
                <span className="text-sm font-normal text-gray-600">
                  Sự kiện: {event.name}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {result.fullName}
                          </h3>
                          {result.bibNumber && (
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-mono font-bold">
                              BIB: {result.bibNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Cự ly: {result.distance}
                        </p>
                      </div>
                      {getStatusBadge(result.paymentStatus)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Email:</span>
                          <button
                            onClick={() => toggleSensitive(result.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title={
                              showSensitive[result.id]
                                ? "Ẩn thông tin"
                                : "Hiển thị đầy đủ"
                            }
                          >
                            {showSensitive[result.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <span className="font-medium text-gray-900 break-all">
                          {showSensitive[result.id]
                            ? result.emailFull
                            : result.emailMasked}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-600">Số điện thoại:</span>
                          <button
                            onClick={() => toggleSensitive(result.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title={
                              showSensitive[result.id]
                                ? "Ẩn thông tin"
                                : "Hiển thị đầy đủ"
                            }
                          >
                            {showSensitive[result.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <span className="font-medium text-gray-900">
                          {showSensitive[result.id]
                            ? result.phoneFull
                            : result.phoneMasked}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Đăng ký:{" "}
                        {new Date(result.registrationDate).toLocaleDateString(
                          "vi-VN",
                        )}
                      </span>

                      {result.paymentStatus === "PENDING" && (
                        <a
                          href={`/registrations/${result.id}/payment`}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          Thanh toán ngay →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {results.length === 0 && searchQuery && !searching && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Không tìm thấy kết quả
              </h3>
              <p className="text-gray-600 mb-4">
                Không tìm thấy đăng ký nào cho sự kiện{" "}
                <strong>{event.name}</strong>
                với từ khóa "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-sm text-gray-500">
                Vui lòng kiểm tra lại thông tin hoặc thử với từ khóa khác
              </p>
            </CardContent>
          </Card>
        )}

        {/* Initial State */}
        {results.length === 0 && !searchQuery && (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Tra cứu đăng ký của bạn cho {event.name}
              </h3>
              <p className="text-gray-600 mb-6">
                Nhập tên, số điện thoại hoặc email để kiểm tra trạng thái đăng
                ký
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-medium">Kiểm tra thanh toán</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">🏃</div>
                  <div className="font-medium">Xem số BIB</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl mb-2">📧</div>
                  <div className="font-medium">Thông tin chi tiết</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
