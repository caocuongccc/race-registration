// app/registrations/[id]/payment-success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);

  useEffect(() => {
    // Poll for payment confirmation (since webhook might be delayed)
    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/registrations/${params.id}`);
        const data = await res.json();

        setRegistration(data.registration);

        // If payment is confirmed, stop polling
        if (data.registration.paymentStatus === "PAID") {
          setLoading(false);
        } else {
          // Keep polling every 2 seconds for up to 30 seconds
          setTimeout(checkPayment, 2000);
        }
      } catch (error) {
        console.error("Error checking payment:", error);
        setLoading(false);
      }
    };

    checkPayment();

    // Auto-redirect after 30 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">
              Đang xác nhận thanh toán...
            </h1>
            <p className="text-gray-600">
              Vui lòng đợi trong giây lát. Hệ thống đang xử lý giao dịch của
              bạn.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = registration?.paymentStatus === "PAID";

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="border-2 border-green-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />

              <h1 className="text-3xl font-bold text-green-600 mb-2">
                {isPaid
                  ? "Thanh toán thành công!"
                  : "Đã nhận yêu cầu thanh toán"}
              </h1>

              {isPaid ? (
                <>
                  <p className="text-gray-600 mb-6">
                    Cảm ơn bạn đã hoàn tất thanh toán. Email xác nhận đã được
                    gửi đến <strong>{registration.email}</strong>
                  </p>

                  {registration.bibNumber && (
                    <div className="bg-blue-50 p-6 rounded-lg mb-6">
                      <p className="text-sm text-gray-600 mb-2">
                        Số BIB của bạn
                      </p>
                      <p className="text-5xl font-bold text-blue-600">
                        {registration.bibNumber}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 mb-6">
                  Giao dịch đang được xử lý. Bạn sẽ nhận email xác nhận khi
                  thanh toán được duyệt.
                </p>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() =>
                    router.push(`/registrations/${params.id}/payment`)
                  }
                  className="w-full"
                >
                  Xem chi tiết đăng ký
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full"
                >
                  Về trang chủ
                </Button>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>
                  Nếu có bất kỳ vấn đề nào, vui lòng liên hệ:{" "}
                  <a
                    href={`mailto:${registration?.event?.emailSupport}`}
                    className="text-blue-600"
                  >
                    {registration?.event?.emailSupport}
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
