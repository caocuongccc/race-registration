// components/EventDetailModal.tsx
"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Award,
  Shirt,
  Phone,
  Mail,
  Facebook,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface EventDetailModalProps {
  event: any;
  distances: any[];
  images: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({
  event,
  distances,
  images,
  isOpen,
  onClose,
}: EventDetailModalProps) {
  const [selectedTab, setSelectedTab] = useState<"info" | "gallery" | "shirts">(
    "info"
  );
  const [selectedImageType, setSelectedImageType] = useState("GALLERY");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const galleryImages = images.filter(
    (img) => img.imageType === selectedImageType
  );

  // Gom tất cả ảnh áo lại
  const allShirtImages = images.filter(
    (img) =>
      img.imageType === "SHIRT_MALE" ||
      img.imageType === "SHIRT_FEMALE" ||
      img.imageType === "SHIRT_KID"
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header với Cover Image - GIỐNG CARD */}
          <div className="relative h-64 flex-shrink-0 overflow-hidden">
            {event.coverImageUrl || event.bannerUrl ? (
              <img
                src={event.coverImageUrl || event.bannerUrl}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600" />
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors border border-white/20 z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Logo overlay - Bottom Left */}
            {event.logoUrl && (
              <div className="absolute bottom-4 left-4">
                <img
                  src={event.logoUrl}
                  alt={event.name}
                  className="w-16 h-16 object-contain bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg"
                />
              </div>
            )}

            {/* Event Info Overlay - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-3xl font-bold mb-2">{event.name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm opacity-90">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b bg-gray-50 flex-shrink-0">
            <div className="flex">
              {[
                { id: "info", label: "Thông tin", icon: "📋" },
                { id: "gallery", label: "Hình ảnh", icon: "🖼️" },
                { id: "shirts", label: "Áo đấu", icon: "👕" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex-1 px-4 py-3 font-medium text-sm transition-colors relative ${
                    selectedTab === tab.id
                      ? "text-blue-600 bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {selectedTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Info Tab */}
              {selectedTab === "info" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Description */}
                    {event.description && (
                      <div>
                        <h3 className="text-lg font-bold mb-2">Giới thiệu</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {event.description}
                        </p>
                      </div>
                    )}

                    {/* Distances */}
                    <div>
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        Các cự ly
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {distances.map((distance) => (
                          <div
                            key={distance.id}
                            className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-600 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold">{distance.name}</h4>
                              <span className="text-lg font-bold text-blue-600">
                                {formatCurrency(distance.price)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Đã ĐK: {distance.currentParticipants}</span>
                              {distance.maxParticipants && (
                                <span>
                                  Còn:{" "}
                                  {distance.maxParticipants -
                                    distance.currentParticipants}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Race Pack Info */}
                    {event.racePackLocation && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-bold mb-3">📦 Nhận Race Pack</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium">Địa điểm</div>
                              <div className="text-gray-700">
                                {event.racePackLocation}
                              </div>
                            </div>
                          </div>
                          {event.racePackTime && (
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium">Thời gian</div>
                                <div className="text-gray-700">
                                  {event.racePackTime}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    {/* Price Box */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-xl shadow-lg">
                      <div className="text-center">
                        <div className="text-sm opacity-90 mb-1">Giá từ</div>
                        <div className="text-3xl font-bold mb-3">
                          {formatCurrency(
                            Math.min(...distances.map((d) => d.price))
                          )}
                        </div>
                        <Link
                          href={`/events/${event.slug}/register`}
                          onClick={onClose}
                        >
                          <Button
                            size="lg"
                            className="w-full bg-white text-blue-600 hover:bg-gray-100"
                          >
                            Đăng ký ngay
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <h4 className="font-bold text-sm mb-3">Liên hệ</h4>
                      {event.hotline && (
                        <a
                          href={`tel:${event.hotline}`}
                          className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors p-2 hover:bg-white rounded"
                        >
                          <Phone className="w-4 h-4 text-blue-600" />
                          <span>{event.hotline}</span>
                        </a>
                      )}
                      {event.emailSupport && (
                        <a
                          href={`mailto:${event.emailSupport}`}
                          className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors p-2 hover:bg-white rounded"
                        >
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="truncate">{event.emailSupport}</span>
                        </a>
                      )}
                      {event.facebookUrl && (
                        <a
                          href={event.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors p-2 hover:bg-white rounded"
                        >
                          <Facebook className="w-4 h-4 text-blue-600" />
                          <span>Fanpage</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Gallery Tab */}
              {selectedTab === "gallery" && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
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
                          ? "🎉 Sự kiện"
                          : type === "VENUE"
                            ? "📍 Địa điểm"
                            : "🗺️ Bản đồ"}
                      </button>
                    ))}
                  </div>

                  {galleryImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((image, idx) => (
                        <div
                          key={idx}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all shadow-sm hover:shadow-md bg-white"
                          onClick={() => setLightboxImage(image.imageUrl)}
                        >
                          <div className="aspect-video">
                            <img
                              src={image.imageUrl}
                              alt={image.title || `Image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                                🔍 Xem lớn
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-3">📷</div>
                      <p>Chưa có hình ảnh</p>
                    </div>
                  )}
                </div>
              )}

              {/* Shirts Tab */}
              {selectedTab === "shirts" && (
                <div className="space-y-6">
                  {event.hasShirt ? (
                    <>
                      {allShirtImages.length > 0 ? (
                        <>
                          <div>
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                              <Shirt className="w-6 h-6 text-blue-600" />
                              Áo đấu kỷ niệm
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Xem các mẫu áo có sẵn. Bạn sẽ chọn loại và size
                              khi đăng ký.
                            </p>
                          </div>

                          {/* Grid ảnh áo */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {allShirtImages.map((image, idx) => (
                              <div
                                key={idx}
                                className="group cursor-pointer"
                                onClick={() => setLightboxImage(image.imageUrl)}
                              >
                                <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-blue-600 transition-colors shadow-sm hover:shadow-md bg-white">
                                  <div className="aspect-[3/4]">
                                    <img
                                      src={image.imageUrl}
                                      alt={image.title || "Áo đấu"}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                                      <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                                        🔍 Xem chi tiết
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {image.title && (
                                  <p className="mt-2 text-xs text-gray-600 text-center truncate">
                                    {image.title}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Thông tin áo */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                              <span>💡</span> Thông tin về áo
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>
                                  Giá áo đã bao gồm trong tổng chi phí đăng ký
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>
                                  Chọn loại (Nam/Nữ/Trẻ em) và size khi đăng ký
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>
                                  Chất liệu: 100% Polyester, thấm hút tốt, nhanh
                                  khô
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">✓</span>
                                <span>
                                  Nhận áo cùng race pack trước ngày thi đấu
                                </span>
                              </li>
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <Shirt className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-2">
                            Chưa có hình ảnh áo kỷ niệm
                          </p>
                          <p className="text-sm text-gray-500">
                            Thông tin chi tiết sẽ được cập nhật sau
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Sự kiện này không có áo kỷ niệm
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-white p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  {distances.reduce((sum, d) => sum + d.currentParticipants, 0)}
                </span>{" "}
                người đã đăng ký
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} size="sm">
                  Đóng
                </Button>
                <Link href={`/events/${event.slug}/register`} onClick={onClose}>
                  <Button size="sm">
                    Đăng ký ngay
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
