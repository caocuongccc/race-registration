// app/mobile/error.tsx - UPDATED ERROR BOUNDARY
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function MobileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("❌ Mobile Error:", error);
  }, [error]);

  const handleFullReload = () => {
    // Force full page reload
    window.location.href = "/mobile";
  };

  const handleReset = () => {
    // Try reset first
    reset();

    // If still error after 1s, force reload
    setTimeout(() => {
      window.location.href = "/mobile";
    }, 1000);
  };

  return (
    <html lang="vi">
      <body>
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

                  {/* Error Details */}
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
                      onClick={handleFullReload}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Tải lại trang
                    </Button>

                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="w-full"
                    >
                      Thử lại
                    </Button>
                  </div>

                  {/* Help Text */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-3">
                      Nếu lỗi vẫn tiếp tục:
                    </p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          // Clear cache and reload
                          if ("caches" in window) {
                            caches.keys().then((names) => {
                              names.forEach((name) => {
                                caches.delete(name);
                              });
                            });
                          }
                          window.location.reload();
                        }}
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        🧹 Xóa cache và tải lại
                      </Button>

                      <p className="text-xs text-gray-400">
                        Hoặc đóng và mở lại trình duyệt
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </body>
    </html>
  );
}
