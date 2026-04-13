// app/events/[slug]/register/page.tsx - WITH BANK INFO DISPLAY
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
  Info,
  Link,
  Search,
  SearchIcon,
} from "lucide-react";
import { ShirtSize } from "@prisma/client";

interface EventData {
  event: {
    id: string;
    name: string;
    slug: string;
    allowRegistration: boolean;
    bankName?: string;
    bankAccount?: string;
    bankHolder?: string;
    bankCode?: string;

    // ✅ NEW: Form field visibility config
    showIdCard: boolean;
    showAddress: boolean;
    showCity: boolean;
    showBloodType: boolean;
    showEmergencyContact: boolean;
    showHealthDeclaration: boolean;
    showBibName: boolean;
    _privateAccess?: boolean; // NEW: Flag for private access
  };
  distances: any[];
  shirts: any[];
  shirtImages?: any;
}

interface FormData {
  distanceId: string;
  fullName: string;
  bibName: string; // NEW: Name to show on BIB

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
  shirtSize: string; // NEW: Store selected size
}

export default function RegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shirtImages, setShirtImages] = useState<any>({});

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
        if (!res.ok) throw new Error("Không tìm thấy sự kiện");
        const data = await res.json();
        // ✅ Check if registration is allowed
        if (!data.event.allowRegistration) {
          toast.error("Sự kiện này chưa mở đăng ký");
          router.push("/");
          return;
        }

        setEventData(data);
        setShirtImages(data.shirtImages || {});
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
  const watchShirtSize = watch("shirtSize"); // NEW: Watch size selection

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
    e: React.ChangeEvent<HTMLInputElement>,
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
    field: "fullName" | "emergencyContactName",
  ) => {
    const cleaned = e.target.value;
    setValue(field, cleaned);
  };

  // Text sanitization
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "address" | "city",
  ) => {
    const cleaned = e.target.value;
    setValue(field, cleaned);
  };

  // ID card sanitization
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeIdCard(e.target.value);
    setValue("idCard", cleaned);
  };
  // Update available sizes when category/type changes
  useEffect(() => {
    if (!eventData?.shirts || !watchShirtCategory || !watchShirtType) {
      setAvailableSizes([]);
      setValue("shirtId", "");
      setValue("shirtSize", ""); // NEW: Reset size
      setSelectedShirt(null);
      return;
    }

    const shirtGroup = eventData.shirts.find(
      (s) => s.category === watchShirtCategory && s.type === watchShirtType,
    );

    setAvailableSizes(shirtGroup?.sizes || []);
    setSelectedShirtPrice(shirtGroup?.price || 0);
    setValue("shirtId", "");
    setValue("shirtSize", ""); // NEW: Reset size
    setSelectedShirt(null);
  }, [watchShirtCategory, watchShirtType, eventData, setValue]);

  // NEW: Update shirtId when size is selected
  useEffect(() => {
    if (watchShirtSize) {
      const selectedSizeObj = availableSizes.find(
        (s) => s.size === watchShirtSize,
      );
      if (selectedSizeObj) {
        setValue("shirtId", selectedSizeObj.id);
        setSelectedShirt(selectedSizeObj);
      }
    }
  }, [watchShirtSize, availableSizes, setValue]);

  const calculateTotal = () => {
    let total = selectedDistance?.price || 0;
    // ❌ CODE CŨ - SAI:
    // if (selectedShirtPrice) {
    //   total += selectedShirtPrice;
    // }

    // ✅ CODE MỚI - ĐÚNG:
    // CHỈ cộng tiền áo khi đã chọn SIZE
    if (watchShirtSize && selectedShirtPrice) {
      total += selectedShirtPrice;
    }

    return total;
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedDistance) {
      toast.error("Vui lòng chọn cự ly");
      return;
    }
    // // Final validation
    // if (emailError || phoneError || emergencyPhoneError) {
    //   toast.error("Vui lòng kiểm tra lại thông tin đã nhập");
    //   return;
    // }
    // ✅ Conditional validation
    if (eventData?.event.showIdCard && !data.idCard) {
      toast.error("Vui lòng nhập số CCCD/CMND");
      return;
    }

    if (eventData?.event.showHealthDeclaration && !data.healthDeclaration) {
      toast.error("Vui lòng xác nhận cam kết sức khỏe");
      return;
    }

    if (emailError || phoneError || emergencyPhoneError) {
      toast.error("Vui lòng sửa các lỗi trong form");
      return;
    }
    setSubmitting(true);

    try {
      // ✅ Build submission data - only include enabled fields
      const submissionData: any = {
        // Always included
        distanceId: data.distanceId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        gender: data.gender,
      };

      // Add conditional fields only if enabled
      if (eventData?.event.showIdCard) {
        submissionData.idCard = data.idCard;
      }

      if (eventData?.event.showAddress) {
        submissionData.address = data.address;
      }

      if (eventData?.event.showCity) {
        submissionData.city = data.city;
      }

      if (eventData?.event.showBloodType) {
        submissionData.bloodType = data.bloodType;
      }

      if (eventData?.event.showBibName) {
        submissionData.bibName = data.bibName;
      }

      if (eventData?.event.showEmergencyContact) {
        submissionData.emergencyContactName = data.emergencyContactName;
        submissionData.emergencyContactPhone = data.emergencyContactPhone;
      }

      if (eventData?.event.showHealthDeclaration) {
        submissionData.healthDeclaration = data.healthDeclaration;
      }

      // Shirt data (if selected)
      if (data.shirtId) {
        submissionData.shirtId = data.shirtId;
      }

      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Đăng ký thất bại");
      }

      // ============================================
      // NEW: REDIRECT TO SEPAY PAYMENT PAGE
      // ============================================
      if (result.paymentUrl) {
        toast.success("Đang chuyển đến trang thanh toán...");

        // Show loading message
        toast.loading("Vui lòng đợi...", { duration: 2000 });

        // Redirect to SePay
        setTimeout(() => {
          window.location.href = result.paymentUrl;
        }, 1500);
      } else {
        // Fallback: redirect to payment page if no SePay URL
        toast.success("Đăng ký thành công!");
        router.push(`/registrations/${result.registration.id}/payment`);
      }
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
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{formatDate(eventData.event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{eventData.event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <SearchIcon className="w-5 h-5" />
                <span>
                  <a
                    href={`/events/${eventData.event.slug}/lookup`}
                    target="_blank"
                  >
                    Tra cứu đăng ký →
                  </a>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* ✅ THÊM: Private Access Notice */}
        {eventData.event._privateAccess && (
          <section className="bg-yellow-50 border-b border-yellow-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900">
                    🔒 Đăng ký riêng tư
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Sự kiện này không công khai trên danh sách. Bạn đang truy
                    cập qua link trực tiếp.
                    {event.allowRegistration ? (
                      <span className="font-medium">
                        {" "}
                        Vẫn có thể đăng ký bình thường.
                      </span>
                    ) : (
                      <span className="font-medium text-red-700">
                        {" "}
                        Hiện chưa mở đăng ký.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
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
              {/* ⚠️ CẢNH BÁO MỚI - Hiện khi chưa chọn cự ly */}
              {/* {!selectedDistance && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-800 font-semibold mb-1">
                        Lưu ý quan trọng
                      </p>
                      <p className="text-sm text-yellow-800">
                        Vui lòng chọn cự ly bạn muốn tham gia. Đây là thông tin
                        bắt buộc để hoàn tất đăng ký.
                      </p>
                    </div>
                  </div>
                </div>
              )} */}

              <div className="grid md:grid-cols-3 gap-4">
                {eventData.distances.map((distance) => (
                  <label
                    key={distance.id}
                    className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDistance?.id === distance.id
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
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

                    {/* Checkmark khi được chọn */}
                    {selectedDistance?.id === distance.id && (
                      <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="text-lg font-bold text-gray-900">
                      {distance.name}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mt-2">
                      {formatCurrency(distance.price)}
                    </div>
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
              {/* Row 1: Full Name & BIB Name */}
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên đầy đủ "
                  {...register("fullName", {
                    required: "Vui lòng nhập họ tên",
                  })}
                  error={errors.fullName?.message}
                  required
                />

                <div>
                  {/* <Input
                    label="Tên hiển thị trên BIB"
                    {...register("bibName")}
                    placeholder="💡 Để trống sẽ dùng họ tên đầy đủ"
                  />
                  <p className="text-xs text-gray-500 mt-1"></p> */}
                  {eventData?.event.showBibName && (
                    <div>
                      <label>Tên hiển thị trên BIB</label>
                      <Input
                        {...register("bibName")}
                        placeholder="Nickname hoặc để trống sử dụng tên đầy đủ"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Để trống nếu muốn sử dụng họ tên đầy đủ
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Email "
                  type="email"
                  {...register("email", {
                    required: "Vui lòng nhập email",
                  })}
                  onChange={handleEmailChange}
                  error={emailError || errors.email?.message}
                  required
                />

                <Input
                  label="Số điện thoại "
                  type="tel"
                  {...register("phone", {
                    required: "Vui lòng nhập số điện thoại",
                  })}
                  onChange={handlePhoneChange}
                  error={phoneError || errors.phone?.message}
                  placeholder="0912345678"
                  required
                />
              </div>

              {/* Row 3: DOB, Gender, Blood Type */}
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="Ngày sinh "
                  type="date"
                  {...register("dob", { required: "Vui lòng chọn ngày sinh" })}
                  error={errors.dob?.message}
                  required
                />

                <Select
                  label="Giới tính "
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

                {/* <Select label="Nhóm máu" {...register("bloodType")}>
                  <option value="">-- Chọn nhóm máu --</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="O">O</option>
                  <option value="AB">AB</option>
                </Select> */}
                {eventData?.event.showBloodType && (
                  <div>
                    <label>Nhóm máu</label>
                    <Select {...register("bloodType")}>
                      <option value="">-- Chọn nhóm máu --</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </Select>
                  </div>
                )}
              </div>

              {/* Row 4: ID Card & Address */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* <Input
                  label="CCCD/CMND"
                  {...register("idCard")}
                  placeholder="001234567890"
                  error={errors.idCard?.message}
                  required
                /> */}
                {eventData?.event.showIdCard && (
                  <div>
                    <label>
                      Số CCCD/CMND <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register("idCard", {
                        required: eventData.event.showIdCard,
                      })}
                      onChange={handleIdCardChange}
                    />
                  </div>
                )}
                {/* <Input label="Tỉnh/Thành phố" {...register("city")} /> */}
              </div>

              {/* Row 5: Full Address */}
              {/* <Input
                label="Địa chỉ chi tiết"
                {...register("address")}
                placeholder="Số nhà, đường, phường/xã"
              /> */}
              {(eventData?.event.showAddress || eventData?.event.showCity) && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Địa chỉ</h3>

                  {eventData?.event.showAddress && (
                    <div>
                      <label>Địa chỉ</label>
                      <Input
                        {...register("address")}
                        onChange={(e) => handleTextChange(e, "address")}
                      />
                    </div>
                  )}

                  {eventData?.event.showCity && (
                    <div>
                      <label>Tỉnh/Thành phố</label>
                      <Input
                        {...register("city")}
                        onChange={(e) => handleTextChange(e, "city")}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Emergency Contact */}
              {/* <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Liên hệ khẩn cấp
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Tên người liên hệ"
                    {...register("emergencyContactName")}
                    error={errors.emergencyContactName?.message}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                  <Input
                    label="Số điện thoại"
                    type="tel"
                    {...register("emergencyContactPhone")}
                    onChange={handleEmergencyPhoneChange}
                    error={
                      emergencyPhoneError ||
                      errors.emergencyContactPhone?.message
                    }
                    placeholder="0912345678"
                    required
                  />
                </div>
              </div> */}
              {eventData?.event.showEmergencyContact && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Liên hệ khẩn cấp</h3>

                  <div>
                    <label>Tên người liên hệ</label>
                    <Input
                      {...register("emergencyContactName")}
                      onChange={(e) =>
                        handleNameChange(e, "emergencyContactName")
                      }
                    />
                  </div>

                  <div>
                    <label>Số điện thoại</label>
                    <Input
                      {...register("emergencyContactPhone")}
                      onChange={handleEmergencyPhoneChange}
                    />
                    {emergencyPhoneError && (
                      <p className="text-xs text-red-600 mt-1">
                        {emergencyPhoneError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Health Declaration */}
              <div className="border-t pt-4 mt-4">
                {/* <label className="flex items-start gap-3">
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
                )} */}
                {eventData?.event.showHealthDeclaration && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cam kết sức khỏe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register("healthDeclaration", {
                              required: eventData.event.showHealthDeclaration,
                            })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Tôi cam kết rằng{" "}
                              <span className="text-red-500">*</span>
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              • Tôi đủ sức khỏe để tham gia sự kiện chạy bộ này
                              <br />
                              • Tôi không mắc các bệnh lý tim mạch, hô hấp
                              <br />• Tôi tự chịu trách nhiệm về sức khỏe của
                              bản thân
                            </p>
                          </div>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Shirt Selection - WITH SIZE DROPDOWN */}
          {eventData.event.hasShirt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="w-6 h-6" />
                  Bước 3: Chọn Áo Kỷ Niệm (Tùy chọn)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shirt Gallery */}
                {shirtImages && Object.keys(shirtImages).length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                    <h3 className="text-lg font-bold text-center text-purple-900 mb-6">
                      👕 Xem trước các mẫu áo kỷ niệm
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {shirtImages.MALE?.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <ShirtImageCarousel
                            images={shirtImages.MALE}
                            category="MALE"
                          />
                        </div>
                      )}
                      {shirtImages.FEMALE?.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <ShirtImageCarousel
                            images={shirtImages.FEMALE}
                            category="FEMALE"
                          />
                        </div>
                      )}
                      {shirtImages.KID?.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <ShirtImageCarousel
                            images={shirtImages.KID}
                            category="KID"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại áo
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {["", "MALE", "FEMALE", "KID"].map((cat) => (
                      <label key={cat} className="relative">
                        <input
                          type="radio"
                          value={cat}
                          {...register("shirtCategory")}
                          onChange={(e) => {
                            setValue("shirtCategory", e.target.value);
                            setValue("shirtType", "");
                            setValue("shirtSize", ""); // Reset size
                          }}
                          className="sr-only peer"
                        />
                        <div className="p-3 border-2 rounded-lg text-center cursor-pointer transition-all peer-checked:border-blue-600 peer-checked:bg-blue-50 hover:border-blue-300">
                          <div className="text-sm font-medium">
                            {cat === ""
                              ? "Không mua"
                              : cat === "MALE"
                                ? "Áo Nam"
                                : cat === "FEMALE"
                                  ? "Áo Nữ"
                                  : "Áo Trẻ Em"}
                          </div>
                        </div>
                      </label>
                    ))}
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
                          onChange={(e) => {
                            setValue("shirtType", e.target.value);
                            setValue("shirtSize", ""); // Reset size
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
                  <div className="space-y-3">
                    {/* Header với tổng số size available */}
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Chọn size áo
                      </label>
                      <span className="text-sm text-gray-500">
                        {availableSizes.filter((s) => s.isAvailable).length}/
                        {availableSizes.length} size còn hàng
                      </span>
                    </div>

                    {/* Price info */}
                    {selectedShirtPrice > 0 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Giá áo: {formatCurrency(selectedShirtPrice)}
                      </div>
                    )}

                    {/* Grid buttons - Responsive: 4 cols mobile, 6 cols tablet, 8 cols desktop */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {availableSizes.map((sizeOption) => {
                        const isSelected = watchShirtSize === sizeOption.size;
                        const isAvailable = sizeOption.isAvailable;
                        const stockLeft =
                          sizeOption.stockQuantity - sizeOption.soldQuantity;
                        const isLowStock = stockLeft > 0 && stockLeft <= 5;

                        return (
                          <button
                            key={sizeOption.id}
                            type="button"
                            onClick={() => {
                              if (isAvailable) {
                                setValue("shirtSize", sizeOption.size);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`
              group relative p-4 rounded-xl border-2 transition-all duration-200 transform
              ${
                isSelected
                  ? "border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 ring-4 ring-purple-200 shadow-lg scale-105"
                  : isAvailable
                    ? "border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50 hover:shadow-md hover:scale-102"
                    : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
              }
            `}
                          >
                            {/* Checkmark badge khi selected */}
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-1 shadow-md">
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}

                            {/* Low stock warning badge */}
                            {isLowStock && !isSelected && (
                              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                !
                              </div>
                            )}

                            {/* Size label */}
                            <div
                              className={`text-xl font-bold mb-2 ${
                                isSelected
                                  ? "text-purple-700"
                                  : isAvailable
                                    ? "text-gray-900"
                                    : "text-gray-400"
                              }`}
                            >
                              {sizeOption.size}
                            </div>

                            {/* Stock info với color coding */}
                            <div
                              className={`text-xs font-medium ${
                                isSelected
                                  ? "text-purple-600"
                                  : !isAvailable
                                    ? "text-red-500 font-semibold"
                                    : isLowStock
                                      ? "text-orange-600 font-semibold"
                                      : "text-green-600"
                              }`}
                            >
                              {!isAvailable ? (
                                <>
                                  <div className="flex items-center justify-center gap-1">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Hết
                                  </div>
                                </>
                              ) : isLowStock ? (
                                <>
                                  <div className="flex items-center justify-center gap-1">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {stockLeft}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-center gap-1">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {stockLeft}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Hover tooltip cho available sizes */}
                            {isAvailable && !isSelected && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                Click để chọn
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Empty state nếu không có size nào */}
                    {availableSizes.length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <svg
                          className="w-12 h-12 text-gray-400 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Không có size nào cho lựa chọn này
                        </p>
                      </div>
                    )}

                    {/* Thông báo đã chọn - Enhanced với animation */}
                    {watchShirtSize && (
                      <div className="animate-fadeIn p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              Đã chọn size áo
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center px-3 py-1 bg-white border border-green-300 rounded-full text-sm font-bold text-green-700">
                                Size {watchShirtSize}
                              </span>
                              <span className="text-sm text-green-700">
                                • {formatCurrency(selectedShirtPrice)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue("shirtSize", "")}
                            className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                            title="Bỏ chọn"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Legend / Chú thích */}
                    <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Còn hàng</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>Sắp hết</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <span>Hết hàng</span>
                      </div>
                    </div>

                    {/* ⚠️ THÊM CẢNH BÁO MỚI - Hiện khi chọn loại/kiểu nhưng chưa chọn size */}
                    {watchShirtCategory &&
                      watchShirtCategory !== "" &&
                      watchShirtType &&
                      !watchShirtSize && (
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded animate-fadeIn">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm text-orange-800 font-semibold mb-1">
                                Chưa chọn size áo
                              </p>
                              <p className="text-xs text-orange-700">
                                Vui lòng chọn size để hoàn tất việc thêm áo vào
                                đơn hàng. Nếu không chọn size, bạn sẽ không nhận
                                được áo kỷ niệm.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
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

                {/* ✅ CODE MỚI - ĐÚNG: Check cả watchShirtSize */}
                {watchShirtSize && selectedShirtPrice > 0 && (
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
                        {/* ✅ THÊM hiển thị size */}
                        {watchShirtSize && ` - Size ${watchShirtSize}`}
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
                        {/* {selectedShirtPrice > 0
                          ? "Phí đăng ký + Áo"
                          : "Phí đăng ký"} */}
                        {watchShirtSize && selectedShirtPrice > 0
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

              {/* Summary Card - Phần Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full mt-6"
                isLoading={submitting}
                disabled={
                  submitting ||
                  !selectedDistance || // Disable khi chưa chọn cự ly
                  !!emailError ||
                  !!phoneError ||
                  !!emergencyPhoneError
                }
              >
                {submitting ? (
                  "Đang xử lý..."
                ) : !selectedDistance ? (
                  // ⚠️ TEXT MỚI khi chưa chọn cự ly
                  <>
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Vui lòng chọn cự ly để tiếp tục
                  </>
                ) : (
                  `Tiếp tục thanh toán - ${formatCurrency(calculateTotal())}`
                )}
              </Button>

              {/* Thông báo lỗi bên dưới button */}
              {!selectedDistance && (
                <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Bạn chưa chọn cự ly tham gia</span>
                  </p>
                </div>
              )}

              {(emailError || phoneError || emergencyPhoneError) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    ⚠️ Vui lòng sửa lỗi trước khi đăng ký
                  </p>
                </div>
              )}
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
