"use client";

import { Pause, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo } from "react";

import type { CampaignFiles, CampaignForm, CampaignRow } from "./domain";

export function CampaignPreview({ form, files, existing, removedImageIds = [] }: { form: CampaignForm; files: CampaignFiles; existing?: CampaignRow; removedImageIds?: number[] }) {
  const mediaFile = form.media_type === "video" ? files.video_poster : files.sheet_image ?? files.images?.[0];
  const source = useMemo(
    () => mediaFile ? URL.createObjectURL(mediaFile) : form.media_type === "video" ? existing?.video_poster || "" : existing?.sheet_image || existing?.additional_images.find((image) => !removedImageIds.includes(image.id))?.url || "",
    [existing?.sheet_image, existing?.additional_images, existing?.video_poster, form.media_type, mediaFile, removedImageIds],
  );
  useEffect(() => {
    if (!mediaFile || !source) return;
    return () => URL.revokeObjectURL(source);
  }, [mediaFile, source]);
  const hasButton = form.action_type !== "none";
  const mediaPreview = form.media_type === "none" ? null : source ? (
    <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black/5">
      <Image unoptimized fill sizes="300px" src={source} alt="معاينة ميديا الحملة" className={form.media_type === "video" ? "object-contain" : "object-cover"} />
      {form.media_type === "video" ? <span className="absolute bottom-2 start-2 rounded-full bg-black/60 p-2 text-white"><Pause className="size-4" /></span> : null}
    </div>
  ) : (
    <div className="flex aspect-video items-center justify-center rounded-[20px] border border-dashed text-center text-xs text-muted-foreground">مكان الصورة أو الفيديو</div>
  );
  const copyPreview = (
    <div className="text-center">
      <h3 className="break-words text-[18px] leading-[1.3] font-extrabold">{form.title || "عنوان الحملة"}</h3>
      {form.description.trim() ? <p className="mt-1.5 break-words text-[14px] leading-[1.5] font-semibold opacity-75">{form.description}</p> : null}
    </div>
  );
  return (
    <div className="sticky top-6 rounded-2xl border bg-muted/40 p-4">
      <div className="mb-3 text-sm font-bold">معاينة الإعلان في منتصف الشاشة</div>
      <div role="region" aria-label="معاينة الحملة الإعلانية" className="mx-auto flex h-[620px] max-w-[330px] overflow-hidden rounded-[32px] border-8 border-slate-900 bg-[#3F3F3F] shadow-xl">
          <div className="flex min-w-0 flex-1 items-center justify-center px-5 py-6">
            <div className={`relative flex max-h-[350px] w-full flex-col overflow-hidden rounded-3xl shadow-xl ${form.use_theme_colors ? "bg-background text-foreground" : ""}`} style={form.use_theme_colors ? undefined : { backgroundColor: form.sheet_background_color, color: form.sheet_text_color }}>
              <span aria-label="إغلاق" className={`absolute z-10 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground ${mediaPreview ? "top-[22px] end-[26px]" : "top-2.5 end-3"}`}><X className="size-5" /></span>
              <div className="min-h-0 overflow-y-auto"><div className={`grid gap-3 px-[18px] pb-3 ${mediaPreview ? "pt-3.5" : "pt-16"}`}>{mediaPreview}{copyPreview}</div></div>
              {hasButton ? <div className="shrink-0 px-[18px] pt-1 pb-3.5"><button type="button" className="min-h-[48px] w-full rounded-[14px] px-4 py-2.5 text-center text-base font-black" style={{ backgroundColor: form.button_background_color, color: form.button_text_color }}>{form.cta_label || "نص الزر"}</button></div> : null}
            </div>
          </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">المعاينة تقريبية؛ المقاسات النهائية تتبع شاشة العميل.</p>
    </div>
  );
}
