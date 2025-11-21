// components/ImageGallery.tsx - Enhanced version
"use client";

import { useState } from "react";
import { X, Plus, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageGalleryProps {
  eventId: string;
  images: Array<{
    id: string;
    imageUrl: string;
    imageType: string;
    title?: string;
  }>;
  onImagesChange: () => void;
  imageType: string;
  title: string;
}

export function ImageGallery({
  eventId,
  images,
  onImagesChange,
  imageType,
  title,
}: ImageGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const filteredImages = images.filter((img) => img.imageType === imageType);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalFiles = files.length;
    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `events/${eventId}/${imageType}`);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadResult = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadResult.error);
        }

        // Save to database
        const saveRes = await fetch(`/api/admin/events/${eventId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadResult.url,
            cloudinaryPublicId: uploadResult.publicId,
            imageType,
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          }),
        });

        if (!saveRes.ok) {
          throw new Error("Failed to save image");
        }

        successCount++;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error);
        failCount++;
      }
    }

    setUploading(false);
    setUploadProgress(0);

    if (successCount > 0) {
      toast.success(`Upload thành công ${successCount}/${totalFiles} ảnh`);
      onImagesChange();
    }

    if (failCount > 0) {
      toast.error(`${failCount} ảnh upload thất bại`);
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    if (!confirm("Xóa ảnh này?")) return;

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/images?imageId=${imageId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to delete image");
      }

      toast.success("Đã xóa ảnh");
      onImagesChange();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {filteredImages.length} ảnh • Có thể upload nhiều ảnh cùng lúc
          </p>
        </div>
        <label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang upload {uploadProgress}%
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm ảnh
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Đang upload ảnh...
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-blue-500 transition-colors">
                <img
                  src={image.imageUrl}
                  alt={image.title || ""}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDelete(image.id, image.imageUrl)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {image.title && (
                <p
                  className="mt-1 text-xs text-gray-600 truncate"
                  title={image.title}
                >
                  {image.title}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">Chưa có ảnh nào</p>
          <p className="text-xs text-gray-500">
            Click nút "Thêm ảnh" để upload
          </p>
        </div>
      )}
    </div>
  );
}
