import { mediaSpecs, videoSpec, type MediaSpec } from "@/lib/media-specs";

export type MediaKey = "market_login" | "delivery_login";

type MediaSlot = { key: MediaKey; label: string; accept: string; spec: MediaSpec };
const imageTypes = "image/jpeg,image/png,image/webp";

export const mediaSlots: MediaSlot[] = [
  { key: "market_login", label: "صورة أو فيديو لوجن المتجر", accept: `${imageTypes},video/mp4`, spec: mediaSpecs.marketLogin },
  { key: "delivery_login", label: "صورة لوجن الدليفيري", accept: imageTypes, spec: mediaSpecs.deliveryLogin },
];

export function validateLaunchMediaFile(key: MediaKey, file: Pick<File, "type" | "size">) {
  const slot = mediaSlots.find((item) => item.key === key)!;
  const maxBytes = key === "market_login" && file.type === "video/mp4" ? videoSpec.maxBytes : slot.spec.maxBytes ?? 5 * 1024 * 1024;
  const limit = maxBytes / (1024 * 1024);
  if (!slot.accept.split(",").includes(file.type)) {
    return "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP، أو MP4 للوجن المتجر فقط.";
  }
  if (file.size > maxBytes) {
    return `الحد الأقصى ${limit} ميجابايت لهذا النوع من الملفات.`;
  }
  return null;
}

export function launchMediaError(data: unknown, field: string) {
  if (!data || typeof data !== "object") return "تعذر حفظ الملف.";
  const errors = data as Record<string, unknown>;
  const error = errors[field] ?? errors.non_field_errors ?? errors.detail;
  if (typeof error === "string") return error;
  if (Array.isArray(error) && typeof error[0] === "string") return error.join(" ");
  return "تعذر حفظ الملف.";
}
