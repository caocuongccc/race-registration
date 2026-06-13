// components/EventDetailModal.tsx - WITH BANK INFO
"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Award,
  Phone,
  Mail,
  Facebook,
  ArrowRight,
  CreditCard,
  ShoppingBag,
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
    "info",
  );
  const [selectedImageType, setSelectedImageType] = useState("GALLERY");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const galleryImages = images.filter(
    (img) => img.imageType === selectedImageType,
  );

  const allShirtImages = images.filter(
    (img) =>
      img.imageType === "SHIRT_MALE" ||
      img.imageType === "SHIRT_FEMALE" ||
      img.imageType === "SHIRT_KID",
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="absolute inset-0 p-3 sm:p-4 flex items-center justify-center overflow-hidden">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER (Cover Image) */}
          <div className="relative h-48 sm:h-64 overflow-hidden flex-shrink-0 bg-black">
            {event.coverImageUrl || event.bannerUrl ? (
              <img
                src={event.coverImageUrl || event.bannerUrl}
                alt={event.name}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {event.logoUrl && (
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                <img
                  src={event.logoUrl}
                  alt={event.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain bg-white/90 p-1.5 sm:p-2 rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="absolute bottom-0 left-16 sm:left-0 p-3 sm:p-6 text-white">
              <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 opacity-90 text-sm mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {event.location}
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="border-b bg-gray-50">
            <div className="flex">
              {[
                { id: "info", label: "Thông tin", icon: "📋" },
                { id: "gallery", label: "Hình ảnh", icon: "🖼️" },
                { id: "shirts", label: "Áo đấu", icon: "👕" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-1 px-2 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium ${
                    selectedTab === tab.id
                      ? "text-blue-600 bg-white"
                      : "text-gray-600 hover:bg-white"
                  }`}
                  onClick={() => setSelectedTab(tab.id as any)}
                >
                  <span className="mr-1 sm:mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* INFO */}
            {selectedTab === "info" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="lg:col-span-2 space-y-6">
                  {event.description && (
                    <div>
                      <h3 className="font-bold text-lg mb-2">Giới thiệu</h3>
                      <p className="text-sm sm:text-base leading-relaxed text-gray-700 whitespace-pre-line">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Distances */}
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-600" />
                      Các cự ly
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {distances.map((d) => (
                        <div
                          key={d.id}
                          className="border p-3 rounded-lg hover:border-blue-600"
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-bold">{d.name}</span>
                            <span className="font-bold text-blue-600">
                              {formatCurrency(d.price)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ NEW: Bank Info Display */}
                  {event.bankAccount && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                      <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-yellow-700" />
                        Thông tin chuyển khoản
                      </h3>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">Ngân hàng:</div>
                          <div className="font-bold text-gray-900">
                            {event.bankName || "MB Bank"}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-600">Số tài khoản:</div>
                          <div className="font-bold text-blue-600 font-mono text-base">
                            {event.bankAccount}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="text-gray-600">Chủ tài khoản:</div>
                          <div className="font-bold text-gray-900">
                            {event.bankHolder || "NGUYEN VAN A"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <p className="text-xs text-yellow-900">
                          💡 <strong>Lưu ý:</strong> Vui lòng ghi đúng nội dung
                          chuyển khoản theo hướng dẫn trong email xác nhận để hệ
                          thống tự động xác nhận thanh toán.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white rounded-xl">
                    <div className="text-center">
                      <div className="text-sm opacity-90">Giá từ</div>
                      <div className="text-3xl font-bold my-2">
                        {formatCurrency(
                          distances.length
                            ? Math.min(...distances.map((d) => d.price))
                            : 0,
                        )}
                      </div>
                      {event.allowRegistration ? (
                        <Link
                          href={`/events/${event.slug}/register`}
                          onClick={onClose}
                        >
                          <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                            Đăng ký ngay
                          </Button>
                        </Link>
                      ) : (
                        <div>
                          <Button
                            className="w-full bg-white/20 cursor-not-allowed"
                            disabled
                          >
                            Chưa mở đăng ký
                          </Button>
                          <p className="text-xs opacity-75 mt-2">
                            Vui lòng quay lại sau
                          </p>
                        </div>
                      )}
                      {/* ✅ NEW: Shirt Purchase Button */}
                      {event.hasShirt && event.allowStandaloneShirtSale && (
                        <div>
                          <Link href={`/events/${event.slug}/order-shirt`}>
                            <Button
                              variant="outline"
                              className="w-full bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 mt-2"
                              size="lg"
                            >
                              <ShoppingBag className="w-5 h-5 mr-2" />
                              Mua áo kỷ niệm riêng (không kèm BIB)
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GALLERY */}
            {selectedTab === "gallery" && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {["GALLERY", "VENUE", "COURSE_MAP"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedImageType(type)}
                      className={`px-4 py-2 rounded-lg text-sm ${
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
                    {galleryImages.map((img, i) => (
                      <div
                        key={i}
                        className="rounded-lg border overflow-hidden cursor-pointer bg-gray-100 aspect-square"
                        onClick={() => setLightboxImage(img.imageUrl)}
                      >
                        <img
                          src={img.imageUrl}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    Không có ảnh
                  </div>
                )}
              </div>
            )}

            {/* SHIRTS */}
            {selectedTab === "shirts" && (
              <div className="space-y-4">
                {allShirtImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allShirtImages.map((img, i) => (
                      <div
                        key={i}
                        className="rounded-lg border overflow-hidden bg-black cursor-pointer h-60 flex items-center justify-center"
                        onClick={() => setLightboxImage(img.imageUrl)}
                      >
                        <img
                          src={img.imageUrl}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Không có áo đấu
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t p-4 flex justify-between items-center">
            {/* <span className="text-sm text-gray-600">
              {distances.reduce((s, d) => s + d.currentParticipants, 0)} người
              đã đăng ký
            </span> */}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm">
                Đóng
              </Button>
              {event.allowRegistration && (
                <Link href={`/events/${event.slug}/register`} onClick={onClose}>
                  <Button size="sm">
                    Đăng ký ngay <ArrowRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-md rounded-full"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <img
            src={lightboxImage}
            className="max-w-full max-height-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
