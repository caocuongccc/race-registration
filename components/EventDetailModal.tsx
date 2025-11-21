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

  if (!isOpen) return null;

  const galleryImages = images.filter(
    (img) => img.imageType === selectedImageType
  );
  const shirtImages = {
    MALE: images.filter((img) => img.imageType === "SHIRT_MALE"),
    FEMALE: images.filter((img) => img.imageType === "SHIRT_FEMALE"),
    KID: images.filter((img) => img.imageType === "SHIRT_KID"),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="flex items-center justify-center min-h-full p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Cover Image */}
            <div className="relative h-64 flex-shrink-0">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>

              {/* Event Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-start gap-4">
                  {event.logoUrl && (
                    <img
                      src={event.logoUrl}
                      alt={event.name}
                      className="w-20 h-20 object-contain bg-white rounded-lg p-2"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">{event.name}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b bg-gray-50 flex-shrink-0">
              <div className="flex gap-1 px-6">
                {["info", "gallery", "shirts"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab as any)}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                      selectedTab === tab
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab === "info"
                      ? "📋 Thông tin"
                      : tab === "gallery"
                        ? "🖼️ Hình ảnh"
                        : "👕 Áo kỷ niệm"}
                    {selectedTab === tab && (
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
                      <div>
                        <h3 className="text-xl font-bold mb-3">Giới thiệu</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {event.description || "Chưa có mô tả"}
                        </p>
                      </div>

                      {/* Distances */}
                      <div>
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <Award className="w-6 h-6 text-blue-600" />
                          Các cự ly
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {distances.map((distance) => (
                            <div
                              key={distance.id}
                              className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-lg font-bold">
                                  {distance.name}
                                </h4>
                                <span className="text-xl font-bold text-blue-600">
                                  {formatCurrency(distance.price)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>
                                  Đã ĐK: {distance.currentParticipants}
                                </span>
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
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">
                            📦 Nhận Race Pack
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium">Địa điểm</div>
                                <div className="text-gray-700">
                                  {event.racePackLocation}
                                </div>
                              </div>
                            </div>
                            {event.racePackTime && (
                              <div className="flex items-start gap-2">
                                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
                        <div className="text-center">
                          <div className="text-sm opacity-90 mb-2">Giá từ</div>
                          <div className="text-4xl font-bold mb-4">
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
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h4 className="font-bold">Liên hệ</h4>
                        {event.hotline && (
                          <a
                            href={`tel:${event.hotline}`}
                            className="flex items-center gap-3 text-sm hover:text-blue-600 transition-colors"
                          >
                            <Phone className="w-5 h-5 text-blue-600" />
                            <span>{event.hotline}</span>
                          </a>
                        )}
                        {event.emailSupport && (
                          <a
                            href={`mailto:${event.emailSupport}`}
                            className="flex items-center gap-3 text-sm hover:text-blue-600 transition-colors"
                          >
                            <Mail className="w-5 h-5 text-blue-600" />
                            <span className="truncate">
                              {event.emailSupport}
                            </span>
                          </a>
                        )}
                        {event.facebookUrl && (
                          <a
                            href={event.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm hover:text-blue-600 transition-colors"
                          >
                            <Facebook className="w-5 h-5 text-blue-600" />
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
                    <div className="flex gap-2">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryImages.map((image, idx) => (
                          <div
                            key={idx}
                            className="relative group cursor-pointer"
                            onClick={() =>
                              window.open(image.imageUrl, "_blank")
                            }
                          >
                            <img
                              src={image.imageUrl}
                              alt={image.title || `Image ${idx + 1}`}
                              className="w-full h-48 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        Chưa có hình ảnh
                      </div>
                    )}
                  </div>
                )}

                {/* Shirts Tab */}
                {selectedTab === "shirts" && (
                  <div className="space-y-8">
                    {event.hasShirt ? (
                      <>
                        {/* Male Shirts */}
                        {shirtImages.MALE.length > 0 && (
                          <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                              <Shirt className="w-6 h-6 text-blue-600" />
                              👔 Áo Nam
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {shirtImages.MALE.map((image, idx) => (
                                <div
                                  key={idx}
                                  className="group cursor-pointer"
                                  onClick={() =>
                                    window.open(image.imageUrl, "_blank")
                                  }
                                >
                                  <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-blue-600 transition-colors">
                                    <img
                                      src={image.imageUrl}
                                      alt="Áo Nam"
                                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                  {image.title && (
                                    <p className="mt-2 text-sm text-gray-600 text-center">
                                      {image.title}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Female Shirts */}
                        {shirtImages.FEMALE.length > 0 && (
                          <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                              <Shirt className="w-6 h-6 text-pink-600" />
                              👗 Áo Nữ
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {shirtImages.FEMALE.map((image, idx) => (
                                <div
                                  key={idx}
                                  className="group cursor-pointer"
                                  onClick={() =>
                                    window.open(image.imageUrl, "_blank")
                                  }
                                >
                                  <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-pink-600 transition-colors">
                                    <img
                                      src={image.imageUrl}
                                      alt="Áo Nữ"
                                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                  {image.title && (
                                    <p className="mt-2 text-sm text-gray-600 text-center">
                                      {image.title}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Kid Shirts */}
                        {shirtImages.KID.length > 0 && (
                          <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                              <Shirt className="w-6 h-6 text-purple-600" />
                              👶 Áo Trẻ Em
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {shirtImages.KID.map((image, idx) => (
                                <div
                                  key={idx}
                                  className="group cursor-pointer"
                                  onClick={() =>
                                    window.open(image.imageUrl, "_blank")
                                  }
                                >
                                  <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-purple-600 transition-colors">
                                    <img
                                      src={image.imageUrl}
                                      alt="Áo Trẻ Em"
                                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                  {image.title && (
                                    <p className="mt-2 text-sm text-gray-600 text-center">
                                      {image.title}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No images */}
                        {shirtImages.MALE.length === 0 &&
                          shirtImages.FEMALE.length === 0 &&
                          shirtImages.KID.length === 0 && (
                            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                              Chưa có hình ảnh áo kỷ niệm
                            </div>
                          )}

                        {/* Shirt Info */}
                        <div className="bg-blue-50 p-6 rounded-lg">
                          <h4 className="font-bold text-lg mb-3">
                            💡 Thông tin về áo
                          </h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>
                                Giá áo đã bao gồm trong tổng chi phí đăng ký
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>
                                Bạn có thể chọn loại, size áo phù hợp khi đăng
                                ký
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>
                                Chất liệu: 100% Polyester, thấm hút tốt, nhanh
                                khô
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>
                                Nhận áo cùng race pack trước ngày thi đấu
                              </span>
                            </li>
                          </ul>
                        </div>
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
            <div className="border-t bg-gray-50 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {distances.reduce(
                      (sum, d) => sum + d.currentParticipants,
                      0
                    )}
                  </span>{" "}
                  người đã đăng ký
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Đóng
                  </Button>
                  <Link
                    href={`/events/${event.slug}/register`}
                    onClick={onClose}
                  >
                    <Button size="lg">
                      Đăng ký ngay
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
