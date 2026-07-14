const mediaPathPattern = /^\/?media\//i;
export const defaultImageFallback = "/default-user-avatar.svg";

function configuredBackendUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    ""
  );
}

export function getBackendOrigin() {
  const backendUrl = configuredBackendUrl();
  if (!backendUrl) return "";

  try {
    return new URL(backendUrl).origin;
  } catch {
    return "";
  }
}

export function isMediaPath(value: string) {
  return mediaPathPattern.test(value.trim());
}

function cleanImageSrc(src: unknown) {
  if (typeof src !== "string") return "";

  const value = src.trim();
  if (!value) return "";

  const normalized = value.toLowerCase();
  if (
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "[object object]"
  ) {
    return "";
  }

  return value;
}

export function resolveMediaUrl<T extends string | null | undefined>(src: T): T | string {
  if (typeof src !== "string") return src;

  const value = src.trim();
  if (!value || !isMediaPath(value)) return src;

  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) return src;

  return `${backendOrigin}${value.startsWith("/") ? value : `/${value}`}`;
}

export function normalizeImageSrc(
  src: unknown,
  fallbackSrc = defaultImageFallback,
) {
  const value = cleanImageSrc(src);
  const fallback = cleanImageSrc(fallbackSrc) || defaultImageFallback;

  if (!value) return resolveMediaUrl(fallback);

  return resolveMediaUrl(value);
}

export function isExternalUrl(src: unknown) {
  return typeof src === "string" && /^https?:\/\//i.test(src.trim());
}

export function isCloudinaryUrl(src: unknown) {
  return (
    typeof src === "string" &&
    src.toLowerCase().includes("res.cloudinary.com")
  );
}

export function cloudinaryImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (!isCloudinaryUrl(src)) return src;

  try {
    const url = new URL(src);
    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return src;

    const transformation = [
      "f_auto",
      `q_${quality ?? "auto"}`,
      "c_limit",
      `w_${Math.max(1, Math.round(width))}`,
    ].join(",");
    const insertionIndex = markerIndex + marker.length;
    url.pathname = `${url.pathname.slice(0, insertionIndex)}${transformation}/${url.pathname.slice(insertionIndex)}`;
    return url.toString();
  } catch {
    return src;
  }
}

export function shouldUnoptimizeImageSrc(src: unknown) {
  if (typeof src !== "string") return false;

  const value = normalizeImageSrc(src);

  return (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    isExternalUrl(value) ||
    shouldUnoptimizeMediaUrl(value)
  ) && !isCloudinaryUrl(value);
}

function isLocalBackendHostname(hostname: string) {
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  ) {
    return true;
  }

  if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,2})\./);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

export function shouldUnoptimizeMediaUrl(src: unknown) {
  if (process.env.NODE_ENV !== "development" || typeof src !== "string") {
    return false;
  }

  const value = resolveMediaUrl(src);
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.pathname.startsWith("/media/") && isLocalBackendHostname(url.hostname);
  } catch {
    return false;
  }
}
