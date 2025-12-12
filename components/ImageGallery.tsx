"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, X, Image as ImageIcon } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = images.filter((i) => i.imageType === imageType);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", `events/${eventId}/${imageType.toLowerCase()}`);

        const upload = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const result = await upload.json();
        if (!upload.ok) throw new Error(result.error);

        await fetch(`/api/admin/events/${eventId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: result.url,
            cloudinaryPublicId: result.publicId,
            imageType,
            title: file.name.replace(/\..+$/, ""),
          }),
        });
      } catch (err: any) {
        toast.error(err.message);
      }
    }

    setUploading(false);
    onImagesChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa ảnh này?")) return;

    await fetch(`/api/admin/events/${eventId}/images?imageId=${id}`, {
      method: "DELETE",
    });

    onImagesChange();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-gray-500">{filtered.length} ảnh</p>
        </div>

        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1" />
          )}
          Upload
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* No images */}
      {filtered.length === 0 ? (
        <div className="border border-dashed p-8 text-center rounded-lg bg-gray-50">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chưa có ảnh</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm"
            >
              {/* Aspect ratio 16/9 giống ảnh bìa */}
              <div className="aspect-video bg-gray-100">
                <img
                  src={img.imageUrl}
                  className="w-full h-full object-cover"
                  onError={(e) =>
                    ((e.target as HTMLImageElement).style.display = "none")
                  }
                />
              </div>

              {/* Delete button */}
              <button
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700"
                onClick={() => handleDelete(img.id)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
