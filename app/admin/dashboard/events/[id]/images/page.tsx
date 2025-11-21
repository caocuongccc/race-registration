// app/admin/dashboard/events/[id]/images/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageGallery } from "@/components/ImageGallery";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function EventImagesPage() {
  const params = useParams();
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [eventImages, setEventImages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    logoUrl: "",
    bannerUrl: "",
    coverImageUrl: "",
  });

  useEffect(() => {
    if (params?.id) {
      setId(params.id as string);
    }
  }, [params]);

  useEffect(() => {
    if (id) {
      loadEvent();
      loadImages();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}`);
      const data = await res.json();
      setEvent(data.event);
      setFormData({
        logoUrl: data.event.logoUrl || "",
        bannerUrl: data.event.bannerUrl || "",
        coverImageUrl: data.event.coverImageUrl || "",
      });
    } catch (error) {
      toast.error("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}/images`);
      const data = await res.json();
      setEventImages(data.images || []);
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: formData.logoUrl,
          bannerUrl: formData.bannerUrl,
          coverImageUrl: formData.coverImageUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("✅ Đã lưu thay đổi");
    } catch (error: any) {
      toast.error(`❌ Không thể lưu: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/dashboard/events")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🖼️ Quản lý hình ảnh
            </h1>
            <p className="text-gray-600 mt-1">{event?.name}</p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Lưu thay đổi
        </Button>
      </div>

      {/* Primary Images - Compact Grid */}
      <Card>
        <CardHeader>
          <CardTitle>🖼️ Hình ảnh chính</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ImageUploader
              folder={`events/${id}/cover`}
              currentImage={formData.coverImageUrl}
              onUploadComplete={(url) => {
                setFormData({ ...formData, coverImageUrl: url });
              }}
              onRemove={() => {
                setFormData({ ...formData, coverImageUrl: "" });
              }}
              label="📸 Ảnh bìa"
              aspectRatio="16/9"
            />

            <ImageUploader
              folder={`events/${id}/banner`}
              currentImage={formData.bannerUrl}
              onUploadComplete={(url) => {
                setFormData({ ...formData, bannerUrl: url });
              }}
              onRemove={() => {
                setFormData({ ...formData, bannerUrl: "" });
              }}
              label="🎨 Banner"
              aspectRatio="16/9"
            />

            <ImageUploader
              folder={`events/${id}/logo`}
              currentImage={formData.logoUrl}
              onUploadComplete={(url) => {
                setFormData({ ...formData, logoUrl: url });
              }}
              onRemove={() => {
                setFormData({ ...formData, logoUrl: "" });
              }}
              label="🏷️ Logo"
              aspectRatio="1/1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>📷 Thư viện ảnh sự kiện</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <ImageGallery
            eventId={id!}
            images={eventImages}
            onImagesChange={loadImages}
            imageType="GALLERY"
            title="🎉 Ảnh sự kiện"
          />

          <div className="border-t pt-8">
            <ImageGallery
              eventId={id!}
              images={eventImages}
              onImagesChange={loadImages}
              imageType="VENUE"
              title="📍 Ảnh địa điểm"
            />
          </div>

          <div className="border-t pt-8">
            <ImageGallery
              eventId={id!}
              images={eventImages}
              onImagesChange={loadImages}
              imageType="COURSE_MAP"
              title="🗺️ Bản đồ đường chạy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shirt Images - GOM CHUNG */}
      <Card>
        <CardHeader>
          <CardTitle>👕 Hình ảnh áo đấu kỷ niệm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <p className="text-sm text-blue-900">
              💡 <strong>Lưu ý:</strong> Upload tất cả ảnh áo vào đây (Nam, Nữ,
              Trẻ em). Người xem sẽ thấy tất cả các mẫu trong một gallery chung.
            </p>
          </div>

          {/* Gom tất cả ảnh áo MALE + FEMALE + KID vào 1 gallery */}
          <ImageGallery
            eventId={id!}
            images={[
              ...eventImages.filter((img) => img.imageType === "SHIRT_MALE"),
              ...eventImages.filter((img) => img.imageType === "SHIRT_FEMALE"),
              ...eventImages.filter((img) => img.imageType === "SHIRT_KID"),
            ]}
            onImagesChange={loadImages}
            imageType="SHIRT_MALE" // Dùng 1 type làm chính
            title="👕 Tất cả mẫu áo đấu"
          />
        </CardContent>
      </Card>
    </div>
  );
}
