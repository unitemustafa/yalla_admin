"use client";

import { Pause, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo } from "react";

import type { CampaignFiles, CampaignForm, CampaignRow } from "./domain";

export function CampaignPreview({ form, files, existing, removedImageIds = [] }: { form: CampaignForm; files: CampaignFiles; existing?: CampaignRow; removedImageIds?: number[] }) {
  const mediaFile = files.sheet_image ?? files.images?.[0] ?? files.video_poster;
  const source = useMemo(
    () => mediaFile ? URL.createObjectURL(mediaFile) : existing?.sheet_image || existing?.additional_images.find((image) => !removedImageIds.includes(image.id))?.url || existing?.video_poster || "",
    [existing?.sheet_image, existing?.additional_images, existing?.video_poster, mediaFile, removedImageIds],
  );
  useEffect(() => {
    if (!mediaFile || !source) return;
    return () => URL.revokeObjectURL(source);
  }, [mediaFile, source]);
  const hasButton = form.action_type !== "none";
  const mediaPreview = source ? (
    <div className={`${form.template === "media_focus" ? "h-52" : form.template === "split" ? "h-40" : "h-36"} relative overflow-hidden rounded-2xl bg-black/5`}>
      <Image unoptimized fill sizes="300px" src={source} alt="معاينة ميديا الحملة" className="object-cover" />
      {form.media_type === "video" ? <span className="absolute bottom-2 start-2 rounded-full bg-black/60 p-2 text-white"><Pause className="size-4" /></span> : null}
    </div>
  ) : (
    <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed text-center text-xs text-muted-foreground">مكان الصورة أو الفيديو</div>
  );
  const copyPreview = (
    <div className={form.content_alignment === "center" ? "text-center" : "text-start"}>
      <h3 className="text-xl font-black">{form.title || "عنوان الحملة"}</h3>
      <p className="mt-2 min-h-10 text-sm opacity-75">{form.description || "وصف الحملة سيظهر هنا"}</p>
    </div>
  );
  const heightClass = form.sheet_size === "medium" ? "min-h-64" : form.sheet_size === "near_full" ? "min-h-[480px]" : "min-h-96";
  return (
    <div className="sticky top-6 rounded-2xl border bg-muted/40 p-4">
      <div className="mb-3 text-sm font-bold">معاينة الإعلان في منتصف الشاشة</div>
      <div className="mx-auto flex h-[620px] max-w-[330px] flex-col overflow-hidden rounded-[32px] border-8 border-slate-900 bg-slate-100 shadow-xl">
        <div className="h-7 bg-white text-center text-[10px]">9:41</div>
        <div className="relative flex-1 bg-gradient-to-b from-orange-50 to-white p-4">
          <div className="h-20 rounded-2xl bg-white shadow-sm" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-white" /><div className="h-24 rounded-2xl bg-white" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className={`${heightClass} relative w-full rounded-3xl p-4 shadow-xl ${form.use_theme_colors ? "bg-background text-foreground" : ""}`} style={form.use_theme_colors ? undefined : { backgroundColor: form.sheet_background_color, color: form.sheet_text_color }}>
              <span className="absolute end-3 top-3 rounded-full bg-black/10 p-1"><X className="size-4" /></span>
              {form.template === "split" ? <div className="grid grid-cols-2 items-start gap-3 pt-7">{mediaPreview}{copyPreview}</div> : <div className="grid gap-4 pt-6">{mediaPreview}{copyPreview}</div>}
              {hasButton ? <button type="button" className="mt-4 h-12 w-full rounded-xl font-bold" style={{ backgroundColor: form.button_background_color, color: form.button_text_color }}>{form.cta_label || "نص الزر"}</button> : null}
            </div>
          </div>
        </div>
        <div className="grid h-16 grid-cols-4 border-t bg-white text-center text-[10px]"><span className="pt-5 text-primary">الرئيسية</span><span className="pt-5">الأقسام</span><span className="pt-5">الطلبات</span><span className="pt-5">حسابي</span></div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">المعاينة تقريبية؛ المقاسات النهائية تتبع شاشة العميل.</p>
    </div>
  );
}
