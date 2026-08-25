"use client";

import { Pause, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { CampaignFiles, CampaignForm, CampaignRow } from "./domain";

export function CampaignPreview({ form, files, existing }: { form: CampaignForm; files: CampaignFiles; existing?: CampaignRow }) {
  const [open, setOpen] = useState(true);
  const mediaFile = files.sheet_image ?? files.video_poster;
  const source = useMemo(
    () => mediaFile ? URL.createObjectURL(mediaFile) : existing?.sheet_image || existing?.video_poster || "",
    [existing?.sheet_image, existing?.video_poster, mediaFile],
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
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>معاينة حية</span>
        <button type="button" className="text-primary" onClick={() => setOpen((value) => !value)}>
          {open ? "اعرض الشريط" : "افتح النافذة"}
        </button>
      </div>
      <div className="mx-auto flex h-[620px] max-w-[330px] flex-col overflow-hidden rounded-[32px] border-8 border-slate-900 bg-slate-100 shadow-xl">
        <div className="h-7 bg-white text-center text-[10px]">9:41</div>
        <div className="flex-1 bg-gradient-to-b from-orange-50 to-white p-4">
          <div className="h-20 rounded-2xl bg-white shadow-sm" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-white" /><div className="h-24 rounded-2xl bg-white" />
          </div>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mx-2 mb-2 flex min-h-14 items-center gap-3 rounded-2xl px-4 text-start shadow-lg"
            style={{ backgroundColor: form.teaser_background_color, color: form.teaser_text_color }}
          >
            {files.teaser_image || existing?.teaser_image ? <span className="size-9 rounded-xl bg-white/25" /> : null}
            <span className="flex-1 text-sm font-bold">{form.teaser_text || "نص الشريط"}</span>
            <span className="text-xl">⌃</span>
          </button>
        ) : (
          <div className={`${heightClass} relative rounded-t-[28px] p-4 shadow-[0_-10px_40px_rgba(0,0,0,.2)]`} style={{ backgroundColor: form.sheet_background_color, color: form.sheet_text_color }}>
            <button type="button" aria-label="إغلاق المعاينة" onClick={() => setOpen(false)} className="absolute end-3 top-3 z-10 rounded-full bg-black/10 p-1"><X className="size-4" /></button>
            {form.template === "split" ? <div className="grid grid-cols-2 items-start gap-3 pt-7">{mediaPreview}{copyPreview}</div> : <div className="grid gap-4">{mediaPreview}{copyPreview}</div>}
            {hasButton ? <button type="button" className="mt-4 h-12 w-full rounded-xl font-bold" style={{ backgroundColor: form.button_background_color, color: form.button_text_color }}>{form.cta_label || "نص الزر"}</button> : null}
          </div>
        )}
        <div className="grid h-16 grid-cols-4 border-t bg-white text-center text-[10px]"><span className="pt-5 text-primary">الرئيسية</span><span className="pt-5">الأقسام</span><span className="pt-5">الطلبات</span><span className="pt-5">حسابي</span></div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">المعاينة تقريبية؛ المقاسات النهائية تتبع شاشة العميل.</p>
    </div>
  );
}
