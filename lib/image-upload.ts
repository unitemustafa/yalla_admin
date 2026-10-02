import type { MediaSpec } from "./media-specs";
import { validateImageDimensions } from "./media-specs";

type DrawableImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  dispose: () => void;
};

async function loadDrawable(file: File): Promise<DrawableImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
  return {
    height: image.naturalHeight,
    source: image,
    width: image.naturalWidth,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function validateImageUpload(file: File, spec: MediaSpec) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > (spec.maxBytes ?? 5 * 1024 * 1024)) return "اختر صورة JPG أو PNG أو WebP حتى 5MB.";
  let drawable: DrawableImage | null = null;
  try {
    drawable = await loadDrawable(file);
    if (Math.max(drawable.width, drawable.height) > 12000 || drawable.width * drawable.height > 25_000_000) return "أبعاد الصورة أكبر من حدود المعالجة الآمنة.";
    return validateImageDimensions(drawable.width, drawable.height, spec);
  } catch {
    return "تعذر قراءة أبعاد الصورة. استخدم ملف JPG أو PNG أو WebP صالحًا.";
  } finally {
    drawable?.dispose();
  }
}
