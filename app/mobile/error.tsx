// app/mobile/error.tsx - Global Error Boundary for Mobile
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("❌ Mobile Error:", error);
  }, [error]);

  const handleReset = () => {
    // Clear any cached data
    if (typeof window !== "undefined") {
      // Force reload
      window.location.href = "/mobile";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 p-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="border-red-300 bg-white shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-center">
              {/* Error Icon */}
              <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>

              {/* Error Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Có lỗi xảy ra
              </h2>
              <p className="text-gray-600 mb-6">
                Ứng dụng gặp sự cố. Vui lòng thử lại.
              </p>

              {/* Error Details (Dev Mode) */}
              {process.env.NODE_ENV === "development" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-left">
                  <p className="text-xs font-mono text-red-800 break-all">
                    {error.message || "Unknown error"}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleReset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tải lại trang
                </Button>

                <Link href="/mobile">
                  <Button variant="outline" className="w-full border-gray-300">
                    <Home className="w-4 h-4 mr-2" />
                    Về trang chủ
                  </Button>
                </Link>
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Nếu lỗi vẫn tiếp tục, vui lòng:
                </p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• Xóa cache trình duyệt</li>
                  <li>• Đóng và mở lại ứng dụng</li>
                  <li>• Liên hệ BTC nếu cần hỗ trợ</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
