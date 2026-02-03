// app/mobile/confirm/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Check,
  X,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shirt,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { uploadToImgBB, compressImage } from "@/lib/imgbb-upload";

export default function ConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [cameraActive, setCameraActive] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRegistration();
  }, [params.id]);

  async function fetchRegistration() {
    try {
      setLoading(true);
      const res = await fetch(`/api/mobile/registrations/${params.id}`);

      if (!res.ok) {
        throw new Error("Not found");
      }

      const data = await res.json();
      setRegistration(data.registration);
    } catch (error) {
      toast.error("Không tìm thấy thông tin đăng ký");
      setTimeout(() => router.push("/mobile/scan"), 2000);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Không thể mở camera. Vui lòng cho phép truy cập camera.");
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const compressed = await compressImage(dataUrl, {
      maxWidth: 1200,
      quality: 0.7,
    });

    setPhotoDataUrl(compressed);
    stopCamera();
    toast.success("Đã chụp ảnh");
  }

  function removePhoto() {
    setPhotoDataUrl("");
    toast.info("Đã xóa ảnh");
  }

  async function handleConfirm() {
    if (!registration) return;

    if (registration.paymentStatus !== "PAID") {
      toast.error("Runner chưa thanh toán. Không thể xác nhận nhận race pack.");
      return;
    }

    if (
      !confirm(
        `Xác nhận ${registration.fullName} (BIB: ${registration.bibNumber}) đã nhận race pack?`,
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      let photoUrl = null;

      if (photoDataUrl) {
        setUploading(true);
        toast.loading("Đang upload ảnh...");

        photoUrl = await uploadToImgBB(photoDataUrl);

        if (!photoUrl) {
          toast.error("Không thể upload ảnh. Vui lòng thử lại.");
          return;
        }

        toast.dismiss();
        toast.success("Upload ảnh thành công");
      }

      const res = await fetch(
        `/api/mobile/registrations/${params.id}/collect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoUrl,
            notes: notes.trim() || null,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to collect");
      }

      toast.success("✅ Đã xác nhận nhận race pack!");

      setTimeout(() => {
        router.push("/mobile/scan");
      }, 1500);
    } catch (error: any) {
      console.error("Confirm error:", error);
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  const isPaid = registration.paymentStatus === "PAID";
  const isCollected = registration.racePackCollected;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/mobile/scan">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">BIB:</span>
            <span className="text-3xl font-bold text-blue-600">
              {registration.bibNumber || "---"}
            </span>
          </div>
        </div>

        {/* Already Collected Warning */}
        {isCollected && (
          <Card className="mb-4 border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    Race pack đã được nhận
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    Thời gian:{" "}
                    {new Date(registration.racePackCollectedAt).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                  {registration.collectedBy && (
                    <p className="text-sm text-yellow-800">
                      Người xác nhận: {registration.collectedBy.name}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status Warning */}
        {!isPaid && (
          <Card className="mb-4 border-red-300 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    Chưa thanh toán
                  </h3>
                  <p className="text-sm text-red-800 mt-1">
                    Không thể xác nhận nhận race pack cho runner chưa thanh
                    toán.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Section */}
        <Card className="mb-4 shadow-md">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Chụp ảnh runner (Optional)
            </h3>

            {cameraActive ? (
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <Button
                    onClick={capturePhoto}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Chụp
                  </Button>
                  <Button
                    onClick={stopCamera}
                    size="lg"
                    variant="outline"
                    className="bg-white/90"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : photoDataUrl ? (
              <div className="relative">
                <img
                  src={photoDataUrl}
                  alt="Runner photo"
                  className="w-full rounded-lg border-2 border-gray-200"
                />
                <Button
                  onClick={removePhoto}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Xóa
                </Button>
              </div>
            ) : (
              <Button
                onClick={startCamera}
                variant="outline"
                className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-gray-600">Tap để chụp ảnh</span>
                </div>
              </Button>
            )}

            <p className="text-xs text-gray-500 mt-2 text-center">
              Ảnh này chỉ được sử dụng khi có khiếu nại
            </p>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mb-4 shadow-md">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              Thông tin runner
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Họ tên</p>
                  <p className="font-semibold text-lg">
                    {registration.fullName}
                  </p>
                  {registration.bibName &&
                    registration.bibName !== registration.fullName && (
                      <p className="text-sm text-gray-500">
                        Tên trên BIB: {registration.bibName}
                      </p>
                    )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{registration.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Số điện thoại</p>
                  <p className="font-medium">{registration.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Cự ly</p>
                  <p className="font-semibold text-blue-600">
                    {registration.distance.name}
                  </p>
                </div>
              </div>

              {registration.shirtSize && (
                <div className="flex items-start gap-3">
                  <Shirt className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Áo</p>
                    <p className="font-medium">
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
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Trạng thái thanh toán
                  </span>
                  <Badge
                    variant={isPaid ? "default" : "destructive"}
                    className={isPaid ? "bg-green-600" : ""}
                  >
                    {isPaid ? "✅ Đã thanh toán" : "❌ Chưa thanh toán"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card className="mb-4 shadow-md">
          <CardContent className="p-6">
            <label className="block mb-2 font-semibold">
              Ghi chú (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Thiếu áo size XL, đã hẹn lấy sau..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Ghi chú sẽ được lưu cùng với thông tin check-in
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons - Fixed Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={submitting || !isPaid || isCollected || uploading}
              size="lg"
              className="flex-1 h-14 text-base bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {submitting || uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploading ? "Đang upload..." : "Đang xử lý..."}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Xác nhận nhận race pack
                </>
              )}
            </Button>

            <Link href="/mobile/scan">
              <Button
                size="lg"
                variant="outline"
                className="h-14"
                disabled={submitting || uploading}
              >
                Hủy
              </Button>
            </Link>
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
