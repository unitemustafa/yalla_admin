"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImageIcon, Loader2 } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { DashboardImage } from "../../dashboard-image";

type AuthenticatedOrderImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function AuthenticatedOrderImage({ src, alt, className }: AuthenticatedOrderImageProps) {
  const { apiFetch } = useAuth();
  const [mediaState, setMediaState] = useState({
    source: "",
    objectUrl: "",
    failed: false,
  });
  const isCurrentSource = mediaState.source === src;
  const objectUrl = isCurrentSource ? mediaState.objectUrl : "";
  const failed = isCurrentSource && mediaState.failed;

  useEffect(() => {
    let active = true;
    let createdUrl = "";

    void apiFetch(src, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.type.toLowerCase().startsWith("image/")) {
          throw new Error("The protected response is not an image.");
        }
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setMediaState({ source: src, objectUrl: createdUrl, failed: false });
        }
        else URL.revokeObjectURL(createdUrl);
      })
      .catch(() => {
        if (active) setMediaState({ source: src, objectUrl: "", failed: true });
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [apiFetch, src]);

  if (failed) {
    return (
      <div className={cn("grid min-h-36 place-items-center gap-2 bg-muted/15 p-4 text-center text-muted-foreground", className)}>
        <ImageIcon className="size-7 opacity-60" />
        <p className="text-xs">تعذر تحميل الصورة. جرّب تحديث الصفحة.</p>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={cn("grid min-h-36 place-items-center bg-muted/15", className)}>
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <a
      href={objectUrl}
      target="_blank"
      rel="noreferrer"
      className={cn("group relative block overflow-hidden bg-muted/20 outline-none focus-visible:ring-2 focus-visible:ring-primary/30", className)}
      aria-label={`فتح ${alt} بالحجم الكامل`}
    >
      <DashboardImage
        src={objectUrl}
        fallbackSrc="/images/placeholders/default_offer.webp"
        alt={alt}
        width={720}
        height={960}
        sizes="(max-width: 1280px) 100vw, 360px"
        className="aspect-[4/3] w-full bg-background"
        imageClassName="object-contain"
        unoptimized
      />
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100">
        <ExternalLink className="size-3.5" />فتح بالحجم الكامل
      </span>
    </a>
  );
}
