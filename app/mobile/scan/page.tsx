// app/mobile/scan/page.tsx - FINAL FIX
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ScanPage() {
  const router = useRouter();
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasNavigatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    hasNavigatedRef.current = false;

    const startScanner = async () => {
      // Don't start if already navigated
      if (hasNavigatedRef.current) return;

      try {
        setIsScanning(true);

        const html5QrCode = new Html5Qrcode("qr-reader");
        qrCodeRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          if (isMountedRef.current) {
            toast.error("Không tìm thấy camera");
            setIsScanning(false);
          }
          return;
        }

        // Prefer back camera
        const backCamera =
          cameras.find((c) => c.label.toLowerCase().includes("back")) ||
          cameras[cameras.length - 1];

        // Check again before starting
        if (!isMountedRef.current || hasNavigatedRef.current) {
          return;
        }

        await html5QrCode.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Only process if still mounted and not already processing
            if (
              !isMountedRef.current ||
              hasNavigatedRef.current ||
              isProcessing
            ) {
              return;
            }
            handleScanSuccess(decodedText);
          },
          () => {
            // Error callback - do nothing
          },
        );

        if (isMountedRef.current) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error("QR start error:", err);
        if (isMountedRef.current && !hasNavigatedRef.current) {
          toast.error("Không thể mở camera. Vui lòng thử lại.");
          setIsScanning(false);
        }
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      console.log("🧹 Cleanup started");
      isMountedRef.current = false;

      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Stop camera
      if (qrCodeRef.current) {
        qrCodeRef.current
          .stop()
          .then(() => {
            console.log("✅ Camera stopped");
            qrCodeRef.current?.clear();
          })
          .catch((err) => {
            console.warn("⚠️ Camera cleanup warning:", err);
          });
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    // Double check
    if (hasNavigatedRef.current || isProcessing || !isMountedRef.current) {
      return;
    }

    console.log("📱 QR Scanned:", decodedText);

    // Extract registration ID
    const match = decodedText.match(/RID:\s*([^\r\n]+)\s*$/);
    if (!match) {
      toast.error("QR không hợp lệ");
      return;
    }

    const registrationId = match[1].trim();

    // Lock immediately
    hasNavigatedRef.current = true;
    setIsProcessing(true);

    console.log("🔒 Navigation locked");

    // Stop camera IMMEDIATELY
    const stopCamera = async () => {
      if (qrCodeRef.current) {
        try {
          await qrCodeRef.current.stop();
          qrCodeRef.current.clear();
          console.log("✅ Camera stopped successfully");
        } catch (err) {
          console.warn("⚠️ Camera stop warning:", err);
        }
      }
    };

    stopCamera();

    // Show loading
    toast.loading("Đang tải thông tin...", { id: "scan-loading" });

    // Navigate after delay to ensure cleanup
    cleanupTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      console.log("🚀 Navigating to confirm page");
      toast.dismiss("scan-loading");

      // Use replace instead of push to prevent back button issues
      router.replace(`/mobile/confirm/${registrationId}`);
    }, 800); // Increased delay for better reliability
  };

  const handleBackButton = () => {
    hasNavigatedRef.current = true;
    setIsProcessing(true);

    // Stop camera before navigating back
    if (qrCodeRef.current) {
      qrCodeRef.current
        .stop()
        .then(() => {
          qrCodeRef.current?.clear();
          // Small delay before navigation
          setTimeout(() => {
            router.replace("/mobile");
          }, 300);
        })
        .catch(() => {
          // Navigate anyway even if stop fails
          router.replace("/mobile");
        });
    } else {
      router.replace("/mobile");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackButton}
            disabled={isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Quét QR Code</h1>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {isProcessing ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Đang xử lý...</p>
                <p className="text-sm text-gray-500 mt-2">Vui lòng đợi...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div
                  id="qr-reader"
                  className="w-full"
                  style={{
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    minHeight: "300px",
                  }}
                />

                <div className="mt-6 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-2">
                      <span className="text-lg">💡</span>
                      Hướng dẫn quét QR:
                    </h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>• Hướng QR code vào khung camera</li>
                      <li>• Giữ điện thoại thẳng và ổn định</li>
                      <li>• Đảm bảo đủ ánh sáng</li>
                      <li>• QR code nằm trong khung vuông</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ QR code nằm trong email xác nhận thanh toán của runner
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry Link */}
        {!isProcessing && (
          <div className="mt-4 text-center">
            <Link href="/mobile/search">
              <Button
                variant="ghost"
                className="text-blue-600"
                onClick={() => {
                  // Mark as navigated to prevent scan processing
                  hasNavigatedRef.current = true;
                  if (qrCodeRef.current) {
                    qrCodeRef.current.stop().catch(() => {});
                  }
                }}
              >
                Hoặc tìm kiếm thủ công →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
