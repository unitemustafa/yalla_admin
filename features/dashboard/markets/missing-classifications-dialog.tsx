"use client";

import { Plus, X } from "lucide-react";

import { Button } from "../primitives";

export function MissingClassificationsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="missing-market-classifications-title" className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5"><div><h2 id="missing-market-classifications-title" className="text-xl font-bold leading-7">أنشئ فئة محل أولًا</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">أنشئ فئة محل أولًا مثل مطاعم أو ملابس قبل إضافة محل جديد.</p></div><button type="button" onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button></div>
        <div className="flex justify-end gap-2 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" onClick={() => { window.location.href = "/categories/markets"; }}><Plus className="size-4" />إضافة فئة محل</Button></div>
      </section>
    </div>
  );
}
