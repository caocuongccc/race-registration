// ============================================
// app/registrations/[id]/payment-cancel/page.tsx
// ============================================
"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  const params = useParams();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="border-2 border-yellow-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-20 h-20 text-yellow-500 mx-auto mb-4" />

              <h1 className="text-3xl font-bold text-yellow-600 mb-2">
                Thanh toán bị hủy
              </h1>

              <p className="text-gray-600 mb-6">
                Bạn đã hủy quá trình thanh toán. Đơn đăng ký của bạn vẫn được
                lưu và chờ thanh toán.
              </p>

              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-yellow-800">
                  💡 Bạn có thể quay lại trang thanh toán bất kỳ lúc nào để hoàn
                  tất đăng ký.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() =>
                    router.push(`/registrations/${params.id}/payment`)
                  }
                  className="w-full"
                >
                  Quay lại trang thanh toán
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full"
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
