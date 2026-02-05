// app/events/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  Phone,
  Mail,
  Facebook,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface EventDetail {
  event: any;
  distances: any[];
  shirts: any[];
  images: any[];
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageType, setSelectedImageType] = useState("GALLERY");

  useEffect(() => {
    if (params?.slug) {
      setEventSlug(params.slug as string);
    }
  }, [params]);

  useEffect(() => {
    if (!eventSlug) return;

    async function loadEventDetail() {
      try {
        const [eventRes, imagesRes] = await Promise.all([
          fetch(`/api/events/${eventSlug}`),
          fetch(`/api/events/${eventSlug}/images`),
        ]);

        if (!eventRes.ok) throw new Error("Event not found");

        const eventData = await eventRes.json();
        const imagesData = await imagesRes.json();

        setData({
          ...eventData,
          images: imagesData.images || [],
        });
      } catch (error) {
        console.error(error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    loadEventDetail();
  }, [eventSlug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const { event, distances, shirts, images } = data;

  const galleryImages = images.filter(
    (img) => img.imageType === selectedImageType,
  );
  const shirtImages = {
    MALE: images.filter((img) => img.imageType === "SHIRT_MALE"),
    FEMALE: images.filter((img) => img.imageType === "SHIRT_FEMALE"),
    KID: images.filter((img) => img.imageType === "SHIRT_KID"),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Cover Image */}
      <section
        className="relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: event.coverImageUrl
            ? `url(${event.coverImageUrl})`
            : "linear-gradient(to bottom right, #3b82f6, #6366f1)",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="absolute top-6 left-6 bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {event.logoUrl && (
            <img
              src={event.logoUrl}
              alt={event.name}
              className="w-32 h-32 object-contain mb-4"
            />
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {event.name}
          </h1>
          <p className="text-xl text-white opacity-90">{event.description}</p>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {/* <span>
                  {distances.reduce((sum, d) => sum + d.currentParticipants, 0)}{" "}
                  người đã đăng ký
                </span> */}
              </div>
            </div>

            {/* CẬP NHẬT: Conditional Register Button */}
            {event.allowRegistration ? (
              <Link href={`/events/${event.slug}/register`}>
                <Button size="lg">
                  Đăng ký ngay
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <div className="text-center">
                <Button
                  size="lg"
                  disabled
                  className="opacity-50 cursor-not-allowed"
                >
                  Chưa mở đăng ký
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Vui lòng quay lại sau
                </p>
              </div>
            )}

            {/* ✅ NEW: Shirt Purchase Button (if available) */}
            {event.hasShirt && (
              <Link href={`/events/${event.slug}/order-shirt`}>
                <Button
                  variant="outline"
                  className="w-full bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                  size="lg"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Mua áo riêng (không BIB)
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>Giới thiệu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Hình ảnh sự kiện</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    {["GALLERY", "VENUE", "COURSE_MAP"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedImageType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedImageType === type
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {type === "GALLERY"
                          ? "Sự kiện"
                          : type === "VENUE"
                            ? "Địa điểm"
                            : "Bản đồ"}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((image, idx) => (
                      <img
                        key={idx}
                        src={image.imageUrl}
                        alt={image.title || `Image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(image.imageUrl, "_blank")}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Distances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Các cự ly
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {distances.map((distance) => (
                    <div
                      key={distance.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold">{distance.name}</h3>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatCurrency(distance.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Đã đăng ký: {distance.currentParticipants}</span>
                        {distance.maxParticipants && (
                          <span>
                            Còn lại:{" "}
                            {distance.maxParticipants -
                              distance.currentParticipants}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shirt Previews */}
            {event.hasShirt &&
              Object.values(shirtImages).some((imgs) => imgs.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shirt className="w-6 h-6" />
                      Áo kỷ niệm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {shirtImages.MALE.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">
                          👔 Áo Nam
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {shirtImages.MALE.map((image, idx) => (
                            <img
                              key={idx}
                              src={image.imageUrl}
                              alt="Áo Nam"
                              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-600 transition-colors cursor-pointer"
                              onClick={() =>
                                window.open(image.imageUrl, "_blank")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {shirtImages.FEMALE.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">👗 Áo Nữ</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {shirtImages.FEMALE.map((image, idx) => (
                            <img
                              key={idx}
                              src={image.imageUrl}
                              alt="Áo Nữ"
                              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-pink-600 transition-colors cursor-pointer"
                              onClick={() =>
                                window.open(image.imageUrl, "_blank")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {shirtImages.KID.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-lg mb-3">
                          👶 Áo Trẻ Em
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {shirtImages.KID.map((image, idx) => (
                            <img
                              key={idx}
                              src={image.imageUrl}
                              alt="Áo Trẻ Em"
                              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-purple-600 transition-colors cursor-pointer"
                              onClick={() =>
                                window.open(image.imageUrl, "_blank")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-900">
                        💡 <strong>Lưu ý:</strong> Giá áo đã bao gồm trong tổng
                        chi phí khi đăng ký. Bạn có thể chọn loại và size áo phù
                        hợp trong form đăng ký.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Race Pack Info */}
            {event.racePackLocation && (
              <Card>
                <CardHeader>
                  <CardTitle>📦 Thông tin nhận Race Pack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <div className="font-medium">Địa điểm</div>
                      <div className="text-gray-600">
                        {event.racePackLocation}
                      </div>
                    </div>
                  </div>
                  {event.racePackTime && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <div className="font-medium">Thời gian</div>
                        <div className="text-gray-600">
                          {event.racePackTime}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration CTA */}
            <Card className="sticky top-24">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Giá từ</div>
                  <div className="text-4xl font-bold text-blue-600 mb-4">
                    {formatCurrency(Math.min(...distances.map((d) => d.price)))}
                  </div>
                  {/* CẬP NHẬT: Conditional Button */}
                  {event.allowRegistration ? (
                    <Link href={`/events/${event.slug}/register`}>
                      <Button size="lg" className="w-full">
                        Đăng ký ngay
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <div>
                      <Button
                        size="lg"
                        className="w-full opacity-50 cursor-not-allowed"
                        disabled
                      >
                        Chưa mở đăng ký
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {event.status === "PUBLISHED"
                          ? "Sự kiện sẽ mở đăng ký sớm"
                          : event.status === "REGISTRATION_CLOSED"
                            ? "Đã đóng đăng ký"
                            : "Vui lòng quay lại sau"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {/* <span>
                      {distances.reduce(
                        (sum, d) => sum + d.currentParticipants,
                        0,
                      )}{" "}
                      người đã đăng ký
                    </span> */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Liên hệ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.hotline && (
                  <a
                    href={`tel:${event.hotline}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-600">Hotline</div>
                      <div className="font-medium">{event.hotline}</div>
                    </div>
                  </a>
                )}

                {event.emailSupport && (
                  <a
                    href={`mailto:${event.emailSupport}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-600">Email</div>
                      <div className="font-medium">{event.emailSupport}</div>
                    </div>
                  </a>
                )}

                {event.facebookUrl && (
                  <a
                    href={event.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-600">Facebook</div>
                      <div className="font-medium">Fanpage</div>
                    </div>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Share */}
            <Card>
              <CardHeader>
                <CardTitle>Chia sẻ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const url = window.location.href;
                      const text = `Đăng ký ${event.name} ngay!`;
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                        "_blank",
                      );
                    }}
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Đã copy link!");
                    }}
                  >
                    📋 Copy link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
