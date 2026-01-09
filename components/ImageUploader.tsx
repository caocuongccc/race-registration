"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  folder: string;
  onUploadComplete: (url: string, publicId: string) => void;
  currentImage?: string;
  onRemove?: () => void;
  label?: string;
  aspectRatio?: "aspect-video" | "aspect-square";
}

export function ImageUploader({
  folder,
  onUploadComplete,
  currentImage,
  onRemove,
  label = "Upload Image",
  aspectRatio = "aspect-video",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      onUploadComplete(result.url, result.publicId);
      toast.success("Upload thành công!");
    } catch (err: any) {
      toast.error(err.message || "Upload lỗi");
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div
        className={`relative border-2 border-dashed rounded-lg overflow-hidden ${aspectRatio} bg-gray-100`}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            onError={() => {
              toast.error("Ảnh bị lỗi hoặc không load được");
              setPreview(null);
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">Click để upload ảnh</p>
          </div>
        )}

        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            e.stopPropagation(); // ✅ ADD THIS
            e.target.files?.[0] && handleFileSelect(e.target.files[0]);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-gray-700" />
          </div>
        )}
      </div>

      {preview && !uploading && (
        <button
          type="button"
          className="text-xs text-red-600 hover:underline"
          onClick={(e) => {
            e.preventDefault(); // ✅ ADD THIS
            setPreview(null);
            onRemove?.();
          }}
        >
          Xóa ảnh
        </button>
      )}
    </div>
  );
}
