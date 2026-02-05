// app/mobile/scan/page.tsx
"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode>();
  const [isScanning, setIsScanning] = useState(false);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        qrCodeRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error("Không tìm thấy camera");
          return;
        }

        // Ưu tiên camera sau
        const backCamera =
          cameras.find((c) => c.label.toLowerCase().includes("back")) ||
          cameras[cameras.length - 1];

        if (!isMounted) return;

        await html5QrCode.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          () => {},
        );
      } catch (err) {
        console.error("QR start error:", err);
        toast.error("Không thể mở camera. Vui lòng dùng Chrome/Safari." + err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (qrCodeRef.current) {
        qrCodeRef.current.stop().catch(() => {});
        qrCodeRef.current.clear();
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
    }

    const match = decodedText.match(/RID:\s*([^\r\n]+)\s*$/);
    if (!match) {
      alert("QR không hợp lệ");
      return;
    }

    const registrationId = match[1];

    // ⛔ QUAN TRỌNG: đợi browser settle
    setTimeout(() => {
      startTransition(() => {
        router.push(`/mobile/confirm/${registrationId}`);
      });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/mobile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Quét QR Code</h1>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Manual Entry Link */}
        <div className="mt-4 text-center">
          <Link href="/mobile/search">
            <Button variant="ghost" className="text-blue-600">
              Hoặc tìm kiếm thủ công
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
