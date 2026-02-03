// lib/imgbb-upload.ts
/**
 * Upload image to ImgBB
 * Returns URL of uploaded image
 */
export async function uploadToImgBB(
  base64Image: string,
): Promise<string | null> {
  try {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      console.error("IMGBB_API_KEY not configured");
      return null;
    }

    // Remove data:image/jpeg;base64, prefix if exists
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Create form data
    const formData = new FormData();
    formData.append("image", base64Data);

    // Upload to ImgBB
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`ImgBB API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Upload failed");
    }

    // Return the URL
    return data.data.url;
  } catch (error) {
    console.error("ImgBB upload error:", error);
    return null;
  }
}

/**
 * Compress image before upload
 * Reduces size while maintaining quality
 */
export async function compressImage(
  dataUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {},
): Promise<string> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to data URL
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
