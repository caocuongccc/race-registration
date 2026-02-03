// app/mobile/scan/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner>();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      },
      false,
    );

    scanner.render(onScanSuccess, onScanError);
    scannerRef.current = scanner;
    setIsScanning(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  function onScanSuccess(decodedText: string) {
    console.log("✅ QR scanned:", decodedText);

    // Stop scanner
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }

    // Extract registration ID
    let registrationId = decodedText;

    // If QR contains URL, extract ID
    try {
      // Format 1: https://domain.com/checkin?id=xxx
      if (decodedText.includes("?id=")) {
        const url = new URL(decodedText);
        registrationId = url.searchParams.get("id") || "";
      }
      // Format 2: https://domain.com/checkin/xxx
      else if (decodedText.includes("/checkin/")) {
        const parts = decodedText.split("/checkin/");
        registrationId = parts[1] || "";
      }
      // Format 3: Just ID
      else if (!decodedText.includes("http")) {
        registrationId = decodedText;
      }
    } catch (error) {
      console.error("Parse QR error:", error);
    }

    if (!registrationId) {
      alert("QR code không hợp lệ");
      // Restart scanner
      window.location.reload();
      return;
    }

    // Navigate to confirm page
    router.push(`/mobile/confirm/${registrationId}`);
  }

  function onScanError(error: string) {
    // Ignore frequent scan errors (too noisy)
    // console.log(error);
  }

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
