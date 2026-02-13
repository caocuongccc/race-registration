// app/mobile/scan/page.tsx - UPDATED WITH BATCH QR SUPPORT
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ScanPage() {
  const router = useRouter();
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isMountedRef = useRef(true);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    isCleaningUpRef.current = false;

    const startScanner = async () => {
      if (isCleaningUpRef.current) return;

      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        qrCodeRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          if (isMountedRef.current) {
            toast.error("Không tìm thấy camera");
          }
          return;
        }

        const backCamera =
          cameras.find((c) => c.label.toLowerCase().includes("back")) ||
          cameras[cameras.length - 1];

        if (!isMountedRef.current || isCleaningUpRef.current) return;

        await html5QrCode.start(
          backCamera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (
              isMountedRef.current &&
              !isCleaningUpRef.current &&
              !isNavigating
            ) {
              handleScanSuccess(decodedText);
            }
          },
          () => {},
        );

        if (isMountedRef.current) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.error("QR start error:", err);
        if (isMountedRef.current) {
          toast.error("Không thể mở camera");
        }
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      isCleaningUpRef.current = true;

      if (qrCodeRef.current) {
        qrCodeRef.current
          .stop()
          .then(() => {
            qrCodeRef.current?.clear();
          })
          .catch(() => {});
      }
    };
  }, []);

  const cleanupAndNavigate = async (path: string) => {
    if (isCleaningUpRef.current) return;

    isCleaningUpRef.current = true;
    setIsNavigating(true);

    // Stop camera
    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop();
        qrCodeRef.current.clear();
      } catch (err) {
        console.warn("Camera cleanup warning:", err);
      }
    }

    // Wait for cleanup then navigate
    setTimeout(() => {
      if (isMountedRef.current) {
        window.location.href = path; // Force full page reload
      }
    }, 300);
  };

  const handleScanSuccess = (decodedText: string) => {
    if (isNavigating || isCleaningUpRef.current) return;

    console.log("📱 QR Scanned:", decodedText);

    // ✅ CHECK 1: Is it a BATCH QR code?
    try {
      const parsed = JSON.parse(decodedText);

      if (parsed.type === "batch" && parsed.batchId) {
        console.log("📦 Batch QR detected:", parsed.batchId);
        toast.loading("Đang tải batch...", { id: "scan" });
        cleanupAndNavigate(`/mobile/batch/${parsed.batchId}`);
        return;
      }
    } catch (e) {
      // Not JSON, continue to check individual QR
    }

    // ✅ CHECK 2: Is it an INDIVIDUAL QR code?
    // Format 1: "RID: <registration-id>"
    const matchRID = decodedText.match(/RID:\s*([^\r\n]+)\s*$/);
    if (matchRID) {
      const registrationId = matchRID[1].trim();
      console.log("👤 Individual QR detected:", registrationId);
      toast.loading("Đang tải thông tin...", { id: "scan" });
      cleanupAndNavigate(`/mobile/confirm/${registrationId}`);
      return;
    }

    // ✅ CHECK 3: Is it a MULTI-LINE QR with registration ID?
    // Format 2: Multiple lines with "BIB: xxx" and somewhere has registration ID
    const lines = decodedText.split("\n");
    for (const line of lines) {
      if (line.includes("Registration ID:") || line.includes("ID:")) {
        const idMatch = line.match(/[a-zA-Z0-9-_]{20,}/); // UUID pattern
        if (idMatch) {
          const registrationId = idMatch[0];
          console.log("👤 Multi-line QR detected:", registrationId);
          toast.loading("Đang tải thông tin...", { id: "scan" });
          cleanupAndNavigate(`/mobile/confirm/${registrationId}`);
          return;
        }
      }
    }

    // ❌ Invalid QR
    toast.error("QR không hợp lệ");
    console.warn("Invalid QR format:", decodedText);
  };

  const handleBack = () => {
    if (isNavigating || isCleaningUpRef.current) return;

    cleanupAndNavigate("/mobile");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isNavigating}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại
          </Button>
          <h1 className="text-xl font-bold text-gray-800">Quét QR Code</h1>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            {isNavigating ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Đang xử lý...</p>
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
                    </ul>
                  </div>

                  {/* QR Type Info */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      ✅ Hỗ trợ 2 loại QR:
                    </p>
                    <ul className="space-y-1 text-xs text-green-700">
                      <li>
                        • <strong>QR cá nhân:</strong> Check-in 1 VĐV
                      </li>
                      <li>
                        • <strong>QR đăng ký theo nhóm:</strong> Xem danh sách
                        nhiều VĐV
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manual Entry Link */}
        {!isNavigating && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              className="text-blue-600"
              onClick={() => cleanupAndNavigate("/mobile/search")}
            >
              Hoặc tìm kiếm thủ công →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
