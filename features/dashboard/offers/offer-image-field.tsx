import { ImagePlus, X } from "lucide-react";

import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { DashboardImage } from "../dashboard-image";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function OfferImageField({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
      <label className="group relative flex aspect-[8/3] min-h-[98px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void form.handleImageChange(event)}
          type="file"
        />
        {state.imagePreview ? (
          <>
            <DashboardImage
              src={state.imagePreview}
              placeholderType="offer"
              alt="معاينة صورة العرض"
              width={640}
              height={240}
              sizes="260px"
              className="absolute inset-0 size-full"
              imageClassName="object-cover"
            />
            <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/35" />
            <span className="relative z-30 rounded-md bg-background/95 px-3 py-2 text-sm font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
              تغيير الصورة
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 px-5 text-sm text-muted-foreground">
            <span className="flex size-10 items-center justify-center rounded-md bg-muted/50">
              <ImagePlus className="size-5 text-primary" />
            </span>
            <span className="font-semibold text-foreground">اختيار صورة العرض</span>
          </span>
        )}
      </label>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <div className="text-sm font-semibold">صورة العرض</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {mediaSpecHint(mediaSpecs.offerBanner)} — ضع النص والشعار داخل منطقة الأمان.
          </p>
          {state.imageError ? <p className="mt-2 text-xs font-semibold text-destructive">{state.imageError}</p> : null}
        </div>
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{state.imageName || "لم يتم اختيار صورة"}</span>
          {state.imagePreview ? (
            <button
              type="button"
              onClick={form.removeImage}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 font-semibold text-destructive transition hover:bg-destructive/10"
            >
              <X className="size-3.5" />
              حذف الصورة
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
