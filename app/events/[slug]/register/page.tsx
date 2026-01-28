// app/events/[slug]/register/page.tsx - FIXED PRICE CALCULATION
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShirtImageCarousel } from "@/components/ShirtImageCarousel";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, MapPin, Shirt } from "lucide-react";

interface EventData {
  event: any;
  distances: any[];
  shirts: any[];
}

interface FormData {
  distanceId: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: "MALE" | "FEMALE";
  idCard: string;
  address: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  healthDeclaration: boolean;
  bloodType: string;
  shirtId: string;
  shirtCategory: string;
  shirtType: string;
}

export default function RegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDistance, setSelectedDistance] = useState<any>(null);
  const [selectedShirt, setSelectedShirt] = useState<any>(null);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  useEffect(() => {
    if (params?.slug) {
      setEventSlug(params.slug as string);
    }
  }, [params]);

  useEffect(() => {
    if (!eventSlug) return;
    loadEvent();
  }, [eventSlug, router]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventSlug}`);
      if (!res.ok) throw new Error("Không tìm thấy sự kiện");
      const data = await res.json();

      if (!data.event.allowRegistration) {
        toast.error("Sự kiện này chưa mở đăng ký");
        router.push("/");
        return;
      }

      setEventData(data);
    } catch (error) {
      toast.error("Không thể tải thông tin sự kiện");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const watchShirtCategory = watch("shirtCategory");
  const watchShirtType = watch("shirtType");
  const watchShirtId = watch("shirtId");

  // ✅ FIX 1: Update available sizes when category/type changes
  useEffect(() => {
    if (!eventData?.shirts || !watchShirtCategory || !watchShirtType) {
      setAvailableSizes([]);
      setSelectedShirt(null);
      setValue("shirtId", "");
      return;
    }

    const shirtGroup = eventData.shirts.find(
      (s) => s.category === watchShirtCategory && s.type === watchShirtType,
    );

    setAvailableSizes(shirtGroup?.sizes || []);
    setValue("shirtId", "");
    setSelectedShirt(null);
  }, [watchShirtCategory, watchShirtType, eventData, setValue]);

  // ✅ FIX 2: Update selectedShirt when size is selected
  useEffect(() => {
    if (!watchShirtId || !availableSizes.length) {
      setSelectedShirt(null);
      return;
    }

    const selected = availableSizes.find((s) => s.id === watchShirtId);
    setSelectedShirt(selected || null);
  }, [watchShirtId, availableSizes]);

  // ✅ FIX 3: Calculate total with proper shirt price
  const calculateTotal = () => {
    let total = selectedDistance?.price || 0;

    // Add shirt price only if a shirt is actually selected
    if (selectedShirt?.price) {
      total += selectedShirt.price;
    }

    return total;
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedDistance) {
      toast.error("Vui lòng chọn cự ly");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventData?.event.id,
          distanceId: data.distanceId,
          shirtId: data.shirtId || null,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          dob: new Date(data.dob),
          gender: data.gender,
          idCard: data.idCard,
          address: data.address,
          city: data.city,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          healthDeclaration: data.healthDeclaration,
          bloodType: data.bloodType || null,
          shirtCategory: watchShirtCategory || null,
          shirtType: watchShirtType || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Đăng ký thất bại");
      }

      toast.success(
        "Đăng ký thành công! Vui lòng kiểm tra email để thanh toán.",
      );
      router.push(`/registrations/${result.registration.id}/payment`);
    } catch (error: any) {
      toast.error(error.message || "Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!eventData) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-blue-600">
              {eventData.event.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{formatDate(eventData.event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{eventData.event.location}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Distance Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Bước 1: Chọn Cự Ly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {eventData.distances.map((distance) => (
                  <label
                    key={distance.id}
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDistance?.id === distance.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    } ${!distance.isAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      value={distance.id}
                      disabled={!distance.isAvailable}
                      {...register("distanceId", {
                        required: "Vui lòng chọn cự ly",
                      })}
                      onChange={() => {
                        setSelectedDistance(distance);
                        setValue("distanceId", distance.id);
                      }}
                      className="sr-only"
                    />
                    <div className="text-lg font-bold text-gray-900">
                      {distance.name}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">
                      {formatCurrency(distance.price)}
                    </div>
                  </label>
                ))}
              </div>
              {errors.distanceId && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.distanceId.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Personal Info - Same as before */}
          <Card>
            <CardHeader>
              <CardTitle>Bước 2: Thông Tin Cá Nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên"
                  {...register("fullName", {
                    required: "Vui lòng nhập họ tên",
                  })}
                  error={errors.fullName?.message}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  {...register("email", { required: "Vui lòng nhập email" })}
                  error={errors.email?.message}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Số điện thoại"
                  {...register("phone", {
                    required: "Vui lòng nhập số điện thoại",
                  })}
                  error={errors.phone?.message}
                  required
                />
                <Input
                  label="Ngày sinh"
                  type="date"
                  {...register("dob", { required: "Vui lòng chọn ngày sinh" })}
                  error={errors.dob?.message}
                  required
                />
              </div>
              <Select
                label="Giới tính"
                {...register("gender", { required: "Vui lòng chọn giới tính" })}
                error={errors.gender?.message}
                required
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </Select>
            </CardContent>
          </Card>

          {/* Shirt Selection */}
          {eventData.event.hasShirt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="w-6 h-6" />
                  Bước 3: Chọn Áo Kỷ Niệm (Tùy chọn)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại áo
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    <label className="relative">
                      <input
                        type="radio"
                        value=""
                        {...register("shirtCategory")}
                        onChange={() => {
                          setValue("shirtCategory", "");
                          setValue("shirtType", "");
                          setValue("shirtId", "");
                        }}
                        className="sr-only peer"
                      />
                      <div className="p-3 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                        <div className="text-sm font-medium">Không mua</div>
                      </div>
                    </label>

                    <label className="relative">
                      <input
                        type="radio"
                        value="MALE"
                        {...register("shirtCategory")}
                        className="sr-only peer"
                      />
                      <div className="p-3 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                        <div className="text-sm font-medium">Áo Nam</div>
                      </div>
                    </label>

                    <label className="relative">
                      <input
                        type="radio"
                        value="FEMALE"
                        {...register("shirtCategory")}
                        className="sr-only peer"
                      />
                      <div className="p-3 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                        <div className="text-sm font-medium">Áo Nữ</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Type Selection */}
                {watchShirtCategory && watchShirtCategory !== "" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kiểu áo
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="relative">
                        <input
                          type="radio"
                          value="SHORT_SLEEVE"
                          {...register("shirtType")}
                          className="sr-only peer"
                        />
                        <div className="p-4 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                          <div className="text-base font-medium">Áo có tay</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {watchShirtType && availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size áo
                      {/* ✅ FIX: Show price from selectedShirt */}
                      {selectedShirt && (
                        <span className="ml-2 text-blue-600">
                          - {formatCurrency(selectedShirt.price)}
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {availableSizes.map((sizeOption) => (
                        <label key={sizeOption.id} className="relative">
                          <input
                            type="radio"
                            value={sizeOption.id}
                            disabled={!sizeOption.isAvailable}
                            {...register("shirtId")}
                            className="sr-only peer"
                          />
                          <div
                            className={`p-4 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300 ${
                              !sizeOption.isAvailable
                                ? "opacity-50 cursor-not-allowed bg-gray-50"
                                : ""
                            }`}
                          >
                            <div className="text-lg font-bold">
                              {sizeOption.size}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Còn{" "}
                              {sizeOption.stockQuantity -
                                sizeOption.soldQuantity}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng Kết Đơn Hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDistance && (
                  <div className="flex justify-between items-center text-gray-700 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{selectedDistance.name}</div>
                      <div className="text-xs text-gray-500">Phí đăng ký</div>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(selectedDistance.price)}
                    </span>
                  </div>
                )}

                {/* ✅ FIX: Only show shirt price if selectedShirt exists */}
                {selectedShirt && (
                  <div className="flex justify-between items-center text-gray-700 p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        Áo {watchShirtCategory === "MALE" ? "Nam" : "Nữ"} -{" "}
                        {watchShirtType === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"}{" "}
                        - Size {selectedShirt.size}
                      </div>
                      <div className="text-xs text-gray-500">Áo kỷ niệm</div>
                    </div>
                    <span className="text-lg font-semibold text-purple-600">
                      {formatCurrency(selectedShirt.price)}
                    </span>
                  </div>
                )}

                <div className="border-t-2 border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        TỔNG CỘNG
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedShirt ? "Phí đăng ký + Áo" : "Phí đăng ký"}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                isLoading={submitting}
                disabled={submitting || !selectedDistance}
              >
                {submitting
                  ? "Đang xử lý..."
                  : `Đăng ký - ${formatCurrency(calculateTotal())}`}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
