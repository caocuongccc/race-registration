// lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param file - Base64 string or file path
 * @param folder - Folder path (e.g., "events/event-123")
 * @param publicId - Custom public ID
 */
export async function uploadToCloudinary(
  file: string,
  folder: string,
  publicId?: string
): Promise<{
  url: string;
  publicId: string;
  secureUrl: string;
}> {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      public_id: publicId,
      resource_type: "auto",
      transformation: [
        { width: 1200, height: 630, crop: "limit" }, // Optimize size
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    return {
      url: result.url,
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Deleted image: ${publicId}`);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
}

/**
 * Get all images in a folder
 */
export async function getImagesFromFolder(
  folderPath: string
): Promise<Array<{ url: string; publicId: string }>> {
  try {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folderPath,
      max_results: 100,
    });

    return result.resources.map((resource: any) => ({
      url: resource.secure_url,
      publicId: resource.public_id,
    }));
  } catch (error) {
    console.error("Cloudinary fetch error:", error);
    return [];
  }
}

export default cloudinary;
