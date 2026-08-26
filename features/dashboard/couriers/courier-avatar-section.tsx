"use client";

import { Camera, Upload } from "lucide-react";

import { mediaSpecHint, mediaSpecs } from "@/lib/media-specs";
import { DashboardImage } from "../dashboard-image";
import { Button, Card } from "../primitives";
import type { useCourierForm } from "./use-courier-form";

type CourierForm = ReturnType<typeof useCourierForm>;

export function CourierAvatarSection({ form }: { form: CourierForm }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/70 shadow-lg shadow-black/5">
      <div className="h-36 rounded-t-xl bg-gradient-to-l from-primary via-primary/80 to-primary/50" />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-start">
          <div className="-mt-12 size-24"><DashboardImage src={form.avatarPreviewUrl || form.draft.avatarUrl} placeholderType="courier" alt="صورة المندوب" width={96} height={96} className="size-24 overflow-hidden rounded-2xl border-4 border-card bg-background shadow-lg" imageClassName="object-cover" /></div>
          <div className="min-w-0"><h3 className="truncate text-lg font-extrabold">{[form.draft.firstName, form.draft.lastName].filter(Boolean).join(" ") || "اسم المندوب"}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{form.draft.phone || "رقم الهاتف سيظهر هنا"}</p></div>
        </div>
        <div className="mt-auto rounded-xl border border-dashed bg-muted/20 p-4 text-start">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold"><Camera className="size-4 text-primary" />صورة المندوب</div>
          <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"><Upload className="size-4" />رفع صورة من الجهاز<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void form.uploadAvatar(event.target.files?.[0])} /></label>
          <p className="mt-2 text-xs text-muted-foreground">{mediaSpecHint(mediaSpecs.avatar)}</p>
          {(form.avatarFile || form.avatarPreviewUrl || form.draft.avatarUrl) ? <Button type="button" variant="outline" className="mt-2 w-full text-destructive hover:text-destructive" disabled={form.saving} onClick={() => void form.removeAvatar()}>حذف الصورة</Button> : null}
          {form.avatarError ? <p className="mt-2 text-xs font-semibold text-destructive">{form.avatarError}</p> : null}
        </div>
      </div>
    </Card>
  );
}
