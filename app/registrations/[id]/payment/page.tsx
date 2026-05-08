// app/registrations/[id]/payment/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Download,
} from "lucide-react";

interface RegistrationData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  totalAmount: number;
  paymentStatus: string;
  bibNumber?: string;
  shortCode?: string;
  qrPaymentUrl?: string;
  qrCheckinUrl?: string;
  distance: {
    name: string;
  };
  event: {
    name: string;
    bankName: string;
    bankAccount: string;
    bankHolder: string;
  };
  shirtCategory?: string;
  shirtType?: string;
  shirtSize?: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [registration, setRegistration] = useState<RegistrationData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadRegistration = async () => {
    try {
      const res = await fetch(`/api/registrations/${params.id}`);
      if (!res.ok) throw new Error("Không tìm thấy đăng ký");
      const data = await res.json();
      setRegistration(data.registration);
      return data.registration as RegistrationData;
    } catch (error) {
      console.error(error);
      router.push("/");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistration();
  }, [params.id]);

  useEffect(() => {
    if (registration?.paymentStatus !== "PENDING") return;

    const interval = window.setInterval(async () => {
      const latestRegistration = await loadRegistration();
      if (latestRegistration?.paymentStatus === "PAID") {
        router.replace(`/registrations/${params.id}/payment-success`);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [registration?.paymentStatus, params.id, router]);

  const checkPaymentStatus = async () => {
    setChecking(true);
    const latestRegistration = await loadRegistration();
    if (latestRegistration?.paymentStatus === "PAID") {
      router.replace(`/registrations/${params.id}/payment-success`);
    }
    setChecking(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!registration) return null;

  const isPaid = registration.paymentStatus === "PAID";
  const isPending = registration.paymentStatus === "PENDING";
  const isFailed = registration.paymentStatus === "FAILED";
  const transferContent = registration.shortCode || `DH${registration.id}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Status Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              {isPaid && (
                <>
                  <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-green-600 mb-2">
                    Thanh toán thành công!
                  </h1>
                  <p className="text-gray-600">
                    Cảm ơn bạn đã đăng ký tham gia {registration.event.name}
                  </p>
                </>
              )}

              {isPending && (
                <>
                  <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-yellow-600 mb-2">
                    Chờ thanh toán
                  </h1>
                  <p className="text-gray-600">
                    Vui lòng hoàn tất thanh toán để xác nhận đăng ký
                  </p>
                </>
              )}

              {isFailed && (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                  <h1 className="text-3xl font-bold text-red-600 mb-2">
                    Thanh toán thất bại
                  </h1>
                  <p className="text-gray-600">
                    Vui lòng liên hệ ban tổ chức để được hỗ trợ
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BIB Number (if paid) */}
        {isPaid && registration.bibNumber && (
          <Card className="mb-6 border-2 border-blue-500">
            <CardHeader className="text-center bg-blue-50">
              <CardTitle className="text-2xl">🏃 Số BIB của bạn</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {registration.bibNumber}
              </div>
              <p className="text-gray-600">
                Vui lòng ghi nhớ số BIB này khi nhận race pack
              </p>
            </CardContent>
          </Card>
        )}

        {/* Registration Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Họ tên:</span>
                <span className="font-medium">{registration.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{registration.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số điện thoại:</span>
                <span className="font-medium">{registration.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cự ly:</span>
                <span className="font-medium">
                  {registration.distance.name}
                </span>
              </div>
              {registration.shirtSize && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Áo:</span>
                  <span className="font-medium">
                    {registration.shirtCategory === "MALE"
                      ? "Nam"
                      : registration.shirtCategory === "FEMALE"
                        ? "Nữ"
                        : "Trẻ em"}{" "}
                    -{" "}
                    {registration.shirtType === "SHORT_SLEEVE"
                      ? "Có tay"
                      : "3 lỗ"}{" "}
                    - Size {registration.shirtSize}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-lg font-medium">Tổng cộng:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(registration.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Trạng thái:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isPaid
                      ? "bg-green-100 text-green-700"
                      : isPending
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {isPaid
                    ? "Đã thanh toán"
                    : isPending
                      ? "Chờ thanh toán"
                      : "Thất bại"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions (if pending) */}
        {isPending && registration.qrPaymentUrl && (
          <Card className="mb-6 border-2 border-yellow-500">
            <CardHeader className="bg-yellow-50">
              <CardTitle>💳 Thông tin thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Quét mã QR bằng app ngân hàng để thanh toán:
                </p>
                <img
                  src={registration.qrPaymentUrl}
                  alt="QR thanh toán"
                  className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = registration.qrPaymentUrl!;
                    link.download = `payment-qr-${registration.id}.png`;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải QR Code
                </Button>
              </div>

              {/* Manual Transfer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900 mb-3">
                  Hoặc chuyển khoản thủ công:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="text-gray-600">Ngân hàng:</span>
                    <span className="font-medium text-right break-words">
                      {registration.event.bankName}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="text-gray-600">Số tài khoản:</span>
                    <span className="font-medium font-mono text-right break-all">
                      {registration.event.bankAccount}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="text-gray-600">Chủ tài khoản:</span>
                    <span className="font-medium text-right break-words">
                      {registration.event.bankHolder}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(registration.totalAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="text-gray-600">Nội dung CK:</span>
                    <span className="justify-self-end font-mono font-bold bg-yellow-100 px-2 py-1 rounded break-all text-right">
                      {transferContent}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ <strong>Lưu ý:</strong> Vui lòng ghi CHÍNH XÁC nội dung
                  chuyển khoản{" "}
                  <strong>{transferContent}</strong>{" "}
                  để hệ thống tự động xác nhận thanh toán.
                </p>
              </div>

              {/* Check Status Button */}
              <Button
                onClick={checkPaymentStatus}
                variant="outline"
                className="w-full"
                isLoading={checking}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Kiểm tra trạng thái thanh toán
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong vòng
                5-10 phút. Bạn sẽ nhận email xác nhận kèm số BIB.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Check-in QR Code (if paid) */}
        {isPaid && registration.qrCheckinUrl && (
          <Card className="mb-6">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-center">📱 Mã QR Check-in</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-6">
              <p className="text-sm text-gray-600 mb-4">
                Xuất trình mã này khi nhận race pack và check-in ngày thi đấu:
              </p>
              <img
                src={registration.qrCheckinUrl}
                alt="QR Check-in"
                className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = registration.qrCheckinUrl!;
                  link.download = `checkin-qr-${registration.bibNumber}.png`;
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải mã QR
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                💡 Lưu lại ảnh này hoặc mang theo email khi đến nhận race pack
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {isPaid && (
                <p className="text-sm text-gray-600 text-center mb-4">
                  Email xác nhận kèm thông tin chi tiết đã được gửi đến{" "}
                  <strong>{registration.email}</strong>
                </p>
              )}

              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                Về trang chủ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
