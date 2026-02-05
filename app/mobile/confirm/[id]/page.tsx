"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadToImgBB, compressImage } from "@/lib/imgbb-upload";

type Registration = {
  id: string;
  fullName: string;
  bibName?: string;
  bibNumber?: string;
  email: string;
  phone: string;
  paymentStatus: "PAID" | "PENDING";
  racePackCollected: boolean;
  racePackCollectedAt?: string;
  collectedBy?: { name: string };
  shirtCategory?: string;
  shirtType?: string;
  shirtSize?: string;
  distance?: { name: string };
};

export default function ConfirmPage() {
  const params = useParams();
  const router = useRouter();

  const registrationId = typeof params?.id === "string" ? params.id : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH DATA ================= */

  const fetchRegistration = useCallback(async () => {
    if (!registrationId) {
      setError("Không tìm thấy ID đăng ký");
      toast.error("Không tìm thấy ID đăng ký");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/mobile/registrations/${registrationId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast;
        throw new Error(errorData.error || "Không tìm thấy thông tin đăng ký");
      }

      const data = await res.json();

      if (!data.registration) {
        toast.error("Không có thông tin đăng ký");
        throw new Error("Không có thông tin đăng ký");
      }

      setRegistration(data.registration);
    } catch (err: any) {
      console.error("Fetch registration error:", err);
      setError(err.message || "Có lỗi xảy ra khi tải thông tin");
      toast.error(err.message || "Không thể tải thông tin đăng ký");
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  useEffect(() => {
    fetchRegistration();
  }, [fetchRegistration]);

  /* ================= CAMERA ================= */

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Thiết bị không hỗ trợ camera");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Không thể mở camera");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const raw = canvas.toDataURL("image/jpeg", 0.8);
    const compressed = await compressImage(raw, {
      maxWidth: 1200,
      quality: 0.7,
    });

    setPhotoDataUrl(compressed);
    stopCamera();
    toast.success("Đã chụp ảnh");
  };

  /* ================= CONFIRM ================= */

  const handleConfirm = async () => {
    if (!registration) return;

    if (registration.paymentStatus !== "PAID") {
      toast.error("Runner chưa thanh toán");
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
      let photoUrl: string | null = null;

      if (photoDataUrl) {
        setUploading(true);
        toast.loading("Đang upload ảnh...");

        photoUrl = await uploadToImgBB(photoDataUrl);

        toast.dismiss();
        if (!photoUrl) throw new Error("Upload ảnh thất bại");
      }

      const res = await fetch(
        `/api/mobile/registrations/${registrationId}/collect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl, notes: notes || null }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Có lỗi xảy ra");
        throw new Error(errorData.error || "Có lỗi xảy ra");
      }

      toast.success("✅ Đã xác nhận nhận race pack");
      setTimeout(() => router.replace("/mobile/scan"), 1200);
    } catch (e: any) {
      console.error("Confirm error:", e);
      toast.error(e.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-xl mx-auto">
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 mb-2">
                  Có lỗi xảy ra
                </h2>
                <p className="text-red-600 mb-4">
                  {error || "Không tìm thấy thông tin đăng ký"}
                </p>
                <div className="space-y-2">
                  <Link href="/mobile/scan">
                    <Button className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Quét lại QR Code
                    </Button>
                  </Link>
                  <Link href="/mobile">
                    <Button variant="outline" className="w-full">
                      Về trang chủ
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPaid = registration.paymentStatus === "PAID";
  const isCollected = registration.racePackCollected;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28">
      <div className="max-w-xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <Link href="/mobile/scan">
            <Button size="sm" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
            </Button>
          </Link>
          <div className="text-xl font-bold text-blue-600">
            BIB {registration.bibNumber || "---"}
          </div>
        </div>

        {/* WARNINGS */}
        {isCollected && (
          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="pt-4">
              <AlertCircle className="inline w-4 h-4 text-yellow-600 mr-1" />
              Race pack đã được nhận
              {registration.racePackCollectedAt && (
                <span className="text-sm text-yellow-700 ml-2">
                  (lúc{" "}
                  {new Date(registration.racePackCollectedAt).toLocaleString(
                    "vi-VN",
                  )}
                  )
                </span>
              )}
            </CardContent>
          </Card>
        )}

        {!isPaid && (
          <Card className="bg-red-50 border-red-300">
            <CardContent className="pt-4 text-red-700">
              ⚠️ Chưa thanh toán - Không thể xác nhận nhận race pack
            </CardContent>
          </Card>
        )}

        {/* PHOTO */}
        <Card>
          <CardContent className="p-4">
            {cameraActive ? (
              <>
                <video ref={videoRef} playsInline className="w-full rounded" />
                <div className="flex gap-2 mt-3">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Chụp
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Hủy
                  </Button>
                </div>
              </>
            ) : photoDataUrl ? (
              <>
                <img
                  src={photoDataUrl}
                  alt="Runner photo"
                  className="rounded mb-3"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPhotoDataUrl(null)}
                  className="w-full"
                >
                  Chụp lại
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32"
                onClick={startCamera}
              >
                <Camera className="mr-2" /> Chụp ảnh runner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* INFO */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 mt-1 flex-shrink-0" />
              <span className="font-medium">{registration.fullName}</span>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-1 flex-shrink-0" />
              <span className="text-sm">{registration.email}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-1 flex-shrink-0" />
              <span className="text-sm">{registration.phone}</span>
            </div>
            {registration.distance && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span className="text-sm">{registration.distance.name}</span>
              </div>
            )}
            {registration.shirtSize && (
              <div className="flex items-start gap-2">
                <Shirt className="w-4 h-4 mt-1 flex-shrink-0" />
                <span className="text-sm">
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
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NOTES */}
        <Textarea
          placeholder="Ghi chú (tùy chọn)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* ACTION */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-lg">
        <Button
          onClick={handleConfirm}
          disabled={!isPaid || isCollected || submitting || uploading}
          className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
        >
          {submitting || uploading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              {uploading ? "Đang upload ảnh..." : "Đang xử lý..."}
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Xác nhận nhận race pack
            </>
          )}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
