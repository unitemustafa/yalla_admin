"use client";

import { ImagePlus } from "lucide-react";

import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { DashboardImage } from "../dashboard-image";
import type { useMarketForm } from "./use-market-form";

type MarketForm = ReturnType<typeof useMarketForm>;

export function MarketMediaFields({ form }: { form: MarketForm }) {
  return (
    <div className="grid gap-4 rounded-lg border border-border/70 bg-muted/15 p-4 sm:col-span-2 lg:grid-cols-2">
      <div className="grid gap-3">
        <label className="group relative mx-auto flex aspect-square w-full max-w-52 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" type="file" onChange={(event) => void form.handleImageChange(event)} />
          {form.imagePreview ? <DashboardImage src={form.imagePreview} placeholderType="store" alt="معاينة شعار المحل" width={320} height={320} sizes="208px" className="absolute inset-0 size-full" imageClassName="object-contain p-2" /> : <span className="flex flex-col items-center gap-2 px-5 text-sm text-muted-foreground"><ImagePlus className="size-6 text-primary" /><span className="font-semibold text-foreground">اختيار شعار المحل</span></span>}
        </label>
        <div><div className="text-sm font-semibold">شعار المحل *</div><p className="mt-1 text-xs text-muted-foreground">{mediaSpecHint(mediaSpecs.storeLogo)}</p></div>
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground"><span className="min-w-0 truncate">{form.imageName || "لم يتم اختيار شعار"}</span>{form.imagePreview ? <button type="button" onClick={form.removeSelectedImage} className="font-semibold text-destructive">إلغاء التغيير</button> : null}</div>
      </div>
      <div className="grid gap-3">
        <label className="group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" type="file" onChange={(event) => void form.handleCoverChange(event)} />
          {form.coverPreview ? <DashboardImage src={form.coverPreview} placeholderType="store" alt="معاينة غلاف المحل" width={640} height={360} sizes="420px" className="absolute inset-0 size-full" imageClassName="object-cover" /> : <span className="flex flex-col items-center gap-2 px-5 text-sm text-muted-foreground"><ImagePlus className="size-6 text-primary" /><span className="font-semibold text-foreground">اختيار صورة الغلاف</span></span>}
        </label>
        <div><div className="text-sm font-semibold">صورة الغلاف *</div><p className="mt-1 text-xs text-muted-foreground">{mediaSpecHint(mediaSpecs.storeCover)}</p></div>
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground"><span className="min-w-0 truncate">{form.coverName || "لم يتم اختيار غلاف"}</span>{form.coverPreview ? <button type="button" onClick={form.removeSelectedCover} className="font-semibold text-destructive">إلغاء التغيير</button> : null}</div>
      </div>
    </div>
  );
}
