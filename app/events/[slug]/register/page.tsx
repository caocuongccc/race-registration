// app/events/[slug]/register/page.tsx - WITH BANK INFO DISPLAY
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  sanitizeEmail,
  sanitizePhone,
  validateEmail,
  validatePhone,
  sanitizeName,
  sanitizeText,
  sanitizeIdCard,
} from "@/lib/validation";

import {
  Calendar,
  MapPin,
  Shirt,
  Award,
  CreditCard,
  AlertCircle,
} from "lucide-react";

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
  const [selectedShirtPrice, setSelectedShirtPrice] = useState(0);
  // Real-time validation states
  const [emailError, setEmailError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string>("");

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

    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${eventSlug}`);
        console.log("Fetching event data for slug:", eventSlug);
        console.log("Fetching event data for slug:", res);
        if (!res.ok) throw new Error("Không tìm thấy sự kiện");
        const data = await res.json();
        console.log("Event data:", data);
        // ✅ Check if registration is allowed
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
    }
    loadEvent();
  }, [eventSlug, router]);

  const watchShirtCategory = watch("shirtCategory");
  const watchShirtType = watch("shirtType");

  // Email validation with auto-fix
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeEmail(e.target.value);
    setValue("email", cleaned);

    // Validate
    if (cleaned) {
      const validation = validateEmail(cleaned);
      setEmailError(validation.valid ? "" : validation.error || "");
    } else {
      setEmailError("");
    }
  };

  // Phone validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizePhone(e.target.value);
    setValue("phone", cleaned);

    // Validate
    if (cleaned) {
      const validation = validatePhone(cleaned);
      setPhoneError(validation.valid ? "" : validation.error || "");
    } else {
      setPhoneError("");
    }
  };

  // Emergency phone validation
  const handleEmergencyPhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const cleaned = sanitizePhone(e.target.value);
    setValue("emergencyContactPhone", cleaned);

    // Validate
    if (cleaned) {
      const validation = validatePhone(cleaned);
      setEmergencyPhoneError(validation.valid ? "" : validation.error || "");
    } else {
      setEmergencyPhoneError("");
    }
  };

  // Name sanitization
  const handleNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "fullName" | "emergencyContactName"
  ) => {
    const cleaned = e.target.value;
    setValue(field, cleaned);
  };

  // Text sanitization
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "address" | "city"
  ) => {
    const cleaned = e.target.value;
    setValue(field, cleaned);
  };

  // ID card sanitization
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeIdCard(e.target.value);
    setValue("idCard", cleaned);
  };
  useEffect(() => {
    if (!eventData?.shirts || !watchShirtCategory || !watchShirtType) {
      setAvailableSizes([]);
      return;
    }

    const shirtGroup = eventData.shirts.find(
      (s) => s.category === watchShirtCategory && s.type === watchShirtType
    );

    setAvailableSizes(shirtGroup?.sizes || []);
    setValue("shirtId", "");
    setSelectedShirt(null);
  }, [watchShirtCategory, watchShirtType, eventData, setValue]);

  useEffect(() => {
    if (watchShirtCategory && watchShirtType && eventData?.shirts) {
      const shirtGroup = eventData.shirts.find(
        (s) => s.category === watchShirtCategory && s.type === watchShirtType
      );
      setSelectedShirtPrice(shirtGroup?.price || 0);
    } else {
      setSelectedShirtPrice(0);
    }
  }, [watchShirtCategory, watchShirtType, eventData]);

  const calculateTotal = () => {
    let total = selectedDistance?.price || 0;
    if (selectedShirtPrice) {
      total += selectedShirtPrice;
    }
    return total;
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedDistance) {
      toast.error("Vui lòng chọn cự ly");
      return;
    }
    // Final validation
    if (emailError || phoneError || emergencyPhoneError) {
      toast.error("Vui lòng kiểm tra lại thông tin đã nhập");
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
        "Đăng ký thành công! Vui lòng kiểm tra email để thanh toán."
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
          {/* Step 1: Chọn cự ly */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6" />
                Bước 1: Chọn Cự Ly
              </CardTitle>
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
                    {distance.maxParticipants && (
                      <div className="text-xs text-gray-500 mt-2">
                        Còn{" "}
                        {distance.maxParticipants -
                          distance.currentParticipants}{" "}
                        chỗ
                      </div>
                    )}
                    {!distance.isAvailable && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Hết chỗ
                      </div>
                    )}
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

          {/* Step 2: Thông tin cá nhân */}
          <Card>
            <CardHeader>
              <CardTitle>Bước 2: Thông Tin Cá Nhân</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Họ và tên"
                    {...register("fullName", {
                      required: "Vui lòng nhập họ tên",
                    })}
                    onChange={(e) => handleNameChange(e, "fullName")}
                    error={errors.fullName?.message}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Tự động viết hoa chữ cái đầu
                  </p>
                </div>
                <div>
                  <Input
                    label="Email"
                    type="email"
                    {...register("email", {
                      required: "Vui lòng nhập email",
                    })}
                    onChange={handleEmailChange}
                    error={emailError || errors.email?.message}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Tự động sửa .con → .com
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Số điện thoại"
                    type="tel"
                    {...register("phone", {
                      required: "Vui lòng nhập số điện thoại",
                    })}
                    onChange={handlePhoneChange}
                    error={phoneError || errors.phone?.message}
                    placeholder="0912345678"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Tự động format số VN (10 số)
                  </p>
                </div>

                <Input
                  label="Ngày sinh"
                  type="date"
                  {...register("dob", { required: "Vui lòng chọn ngày sinh" })}
                  error={errors.dob?.message}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Giới tính"
                  {...register("gender", {
                    required: "Vui lòng chọn giới tính",
                  })}
                  error={errors.gender?.message}
                  required
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </Select>

                <div>
                  <Input
                    label="CCCD/CMND"
                    {...register("idCard")}
                    onChange={handleIdCardChange}
                    placeholder="001234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Tự động xóa ký tự đặc biệt
                  </p>
                </div>
              </div>

              <Input
                label="Địa chỉ"
                {...register("address")}
                onChange={(e) => handleTextChange(e, "address")}
              />
              <Input
                label="Tỉnh/Thành phố"
                {...register("city")}
                onChange={(e) => handleTextChange(e, "city")}
              />

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Liên hệ khẩn cấp
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Tên người liên hệ"
                    {...register("emergencyContactName")}
                    onChange={(e) =>
                      handleNameChange(e, "emergencyContactName")
                    }
                  />
                  <div>
                    <Input
                      label="Số điện thoại"
                      type="tel"
                      {...register("emergencyContactPhone")}
                      onChange={handleEmergencyPhoneChange}
                      error={emergencyPhoneError}
                      placeholder="0912345678"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    {...register("healthDeclaration", {
                      required: "Vui lòng xác nhận tình trạng sức khỏe",
                    })}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Tôi cam đoan sức khỏe tốt, không có bệnh lý tim mạch, huyết
                    áp hoặc bất kỳ vấn đề sức khỏe nào có thể ảnh hưởng đến việc
                    tham gia giải chạy. <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.healthDeclaration && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.healthDeclaration.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Chọn áo */}
          {eventData.event.hasShirt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="w-6 h-6" />
                  Bước 3: Chọn Áo Kỷ Niệm (Tùy chọn)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        onChange={(e) => {
                          setValue("shirtCategory", e.target.value);
                          setValue("shirtType", "");
                          setValue("shirtId", "");
                        }}
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
                        onChange={(e) => {
                          setValue("shirtCategory", e.target.value);
                          setValue("shirtType", "");
                          setValue("shirtId", "");
                        }}
                        className="sr-only peer"
                      />
                      <div className="p-3 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                        <div className="text-sm font-medium">Áo Nữ</div>
                      </div>
                    </label>
                  </div>
                </div>

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
                          onChange={(e) => {
                            setValue("shirtType", e.target.value);
                            setValue("shirtId", "");
                          }}
                          className="sr-only peer"
                        />
                        <div className="p-4 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                          <div className="text-base font-medium">Áo có tay</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {watchShirtType && availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size áo - Giá: {formatCurrency(selectedShirtPrice)}
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {availableSizes.map((sizeOption) => (
                        <label key={sizeOption.id} className="relative">
                          <input
                            type="radio"
                            value={sizeOption.id}
                            disabled={!sizeOption.isAvailable}
                            {...register("shirtId")}
                            onChange={() => {
                              setValue("shirtId", sizeOption.id);
                              setSelectedShirt(sizeOption);
                            }}
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
                            {!sizeOption.isAvailable && (
                              <div className="text-xs text-red-500 mt-1 font-medium">
                                Hết hàng
                              </div>
                            )}
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

                {selectedShirtPrice > 0 && (
                  <div className="flex justify-between items-center text-gray-700 p-3 bg-purple-50 rounded-lg animate-fadeIn">
                    <div>
                      <div className="font-medium">
                        Áo{" "}
                        {watchShirtCategory === "MALE"
                          ? "Nam"
                          : watchShirtCategory === "FEMALE"
                            ? "Nữ"
                            : "Trẻ Em"}
                        {" - "}
                        {watchShirtType === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"}
                        {selectedShirt?.size && ` - Size ${selectedShirt.size}`}
                      </div>
                      <div className="text-xs text-gray-500">Áo kỷ niệm</div>
                    </div>
                    <span className="text-lg font-semibold text-purple-600">
                      {formatCurrency(selectedShirtPrice)}
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
                        {selectedShirtPrice > 0
                          ? "Phí đăng ký + Áo"
                          : "Phí đăng ký"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatCurrency(calculateTotal())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                isLoading={submitting}
                // disabled={submitting || !selectedDistance}
                disabled={
                  submitting ||
                  !selectedDistance ||
                  !!emailError ||
                  !!phoneError ||
                  !!emergencyPhoneError
                }
              >
                {submitting
                  ? "Đang xử lý..."
                  : `Đăng ký - ${formatCurrency(calculateTotal())}`}
              </Button>
              {(emailError || phoneError || emergencyPhoneError) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    ⚠️ Vui lòng sửa lỗi trước khi đăng ký
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center mt-3">
                💳 Sau khi đăng ký, bạn sẽ nhận email với QR Code thanh toán
              </p>
            </CardContent>
          </Card>
          {/* ✅ NEW: Bank Info Card */}
          {eventData.event.bankAccount && (
            <Card className="mb-6 border-2 border-yellow-300 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-900">
                  <CreditCard className="w-5 h-5" />
                  Thông tin chuyển khoản
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 text-xs mb-1">Ngân hàng</div>
                    <div className="font-bold text-gray-900">
                      {eventData.event.bankName || "MB Bank"}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-600 text-xs mb-1">
                      Số tài khoản
                    </div>
                    <div className="font-bold text-blue-600 font-mono">
                      {eventData.event.bankAccount}
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <div className="text-gray-600 text-xs mb-1">
                      Chủ tài khoản
                    </div>
                    <div className="font-bold text-gray-900">
                      {eventData.event.bankHolder}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-yellow-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-900">
                    Sau khi đăng ký, bạn sẽ nhận email với QR code thanh toán.
                    Vui lòng chuyển khoản đúng nội dung để hệ thống tự động xác
                    nhận.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
