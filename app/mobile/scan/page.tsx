// app/mobile/scan/page.tsx - FIXED VERSION
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

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (hasNavigatedRef.current) return;

      try {
        setIsScanning(true);
        html5QrCode = new Html5Qrcode("qr-reader");
        qrCodeRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error("Không tìm thấy camera");
          setIsScanning(false);
          return;
        }

        // Prefer back camera
        const backCamera =
          cameras.find((c) => c.label.toLowerCase().includes("back")) ||
          cameras[cameras.length - 1];

        if (!isMounted || hasNavigatedRef.current) return;

        await html5QrCode.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (hasNavigatedRef.current || isProcessing) return;
            onScanSuccess(decodedText);
          },
          () => {
            // Error callback - do nothing
          },
        );
      } catch (err: any) {
        console.error("QR start error:", err);
        if (isMounted && !hasNavigatedRef.current) {
          toast.error("Không thể mở camera. Vui lòng dùng Chrome/Safari.");
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;

      // Cleanup camera
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => {
            html5QrCode?.clear();
          })
          .catch((err) => {
            console.warn("Cleanup error:", err);
          });
      }
    };
  }, []);

  const onScanSuccess = (decodedText: string) => {
    if (hasNavigatedRef.current || isProcessing) return;

    // Extract registration ID from QR
    const match = decodedText.match(/RID:\s*([^\r\n]+)\s*$/);
    if (!match) {
      toast.error("QR không hợp lệ");
      return;
    }

    const registrationId = match[1].trim();

    // Mark as navigating to prevent duplicate scans
    hasNavigatedRef.current = true;
    setIsProcessing(true);

    // Stop camera immediately
    if (qrCodeRef.current) {
      qrCodeRef.current
        .stop()
        .catch((err) => console.warn("Stop camera error:", err))
        .finally(() => {
          qrCodeRef.current?.clear().catch(() => {});
        });
    }

    // Show loading toast
    toast.loading("Đang tải thông tin...");

    // Navigate after a short delay to ensure camera is released
    setTimeout(() => {
      toast.dismiss();
      router.push(`/mobile/confirm/${registrationId}`);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/mobile">
            <Button variant="outline" size="sm" disabled={isProcessing}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Quét QR Code</h1>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {isProcessing ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Đang xử lý...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>

                <div
                  id="qr-reader"
                  className="w-full"
                  style={{
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />

                <div className="mt-6 space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 text-sm">
                      💡 Hướng dẫn:
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
              <Button variant="ghost" className="text-blue-600">
                Hoặc tìm kiếm thủ công
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
