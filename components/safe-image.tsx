import Image, { type ImageProps } from "next/image";

import {
  defaultImageFallback,
  normalizeImageSrc,
  shouldUnoptimizeImageSrc,
} from "@/lib/media-url";

export type SafeImageProps = Omit<ImageProps, "src" | "unoptimized"> & {
  fallbackSrc?: string;
  src?: string | null;
  unoptimized?: boolean;
};

export function SafeImage({
  alt,
  fallbackSrc = defaultImageFallback,
  src,
  unoptimized,
  ...props
}: SafeImageProps) {
  const normalizedSrc = normalizeImageSrc(src, fallbackSrc);

  return (
    <Image
      {...props}
      alt={alt}
      src={normalizedSrc}
      unoptimized={Boolean(unoptimized || shouldUnoptimizeImageSrc(normalizedSrc))}
    />
  );
}
