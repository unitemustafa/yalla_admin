"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { SafeImage, type SafeImageProps } from "@/components/safe-image";
import { defaultImageFallback, normalizeImageSrc } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type DashboardImageProps = Omit<SafeImageProps, "className" | "onError" | "onLoad"> & {
  className?: string;
  imageClassName?: string;
};

export function DashboardImage({
  alt,
  src,
  width,
  height,
  sizes,
  className,
  imageClassName,
  unoptimized,
  fallbackSrc,
  ...props
}: DashboardImageProps) {
  const resolvedSrc = normalizeImageSrc(src, fallbackSrc);
  const sourceKey = resolvedSrc;
  const isBlobSource = resolvedSrc.startsWith("blob:");
  const [imageState, setImageState] = useState({
    failed: false,
    loaded: false,
    sourceKey,
  });
  const loaded = imageState.sourceKey === sourceKey && imageState.loaded;
  const failed = imageState.sourceKey === sourceKey && imageState.failed;
  const canRender = !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {canRender && !loaded ? (
        <span className="absolute inset-0 animate-pulse bg-muted" />
      ) : null}
      {failed ? (
        <SafeImage
          alt={alt}
          fallbackSrc={defaultImageFallback}
          height={height}
          sizes={sizes}
          src={fallbackSrc ?? defaultImageFallback}
          unoptimized={unoptimized}
          width={width}
          className={cn(
            "relative z-10 size-full object-cover opacity-100",
            imageClassName,
          )}
        />
      ) : canRender && isBlobSource ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          onError={() =>
            setImageState({ failed: true, loaded: false, sourceKey })
          }
          onLoad={() =>
            setImageState({ failed: false, loaded: true, sourceKey })
          }
          src={resolvedSrc}
          className={cn(
            "relative z-10 size-full object-cover transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      ) : canRender ? (
        <SafeImage
          {...props}
          alt={alt}
          fallbackSrc={fallbackSrc}
          height={height}
          onError={() =>
            setImageState({ failed: true, loaded: false, sourceKey })
          }
          onLoad={() =>
            setImageState({ failed: false, loaded: true, sourceKey })
          }
          sizes={sizes}
          src={resolvedSrc}
          unoptimized={unoptimized}
          width={width}
          className={cn(
            "relative z-10 size-full object-cover transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      ) : (
        <ImageIcon aria-hidden="true" className="size-1/2 max-h-5 max-w-5 opacity-60" />
      )}
    </span>
  );
}
