"use client";

import { Plus, X } from "lucide-react";

import { Button } from "../primitives";

export function MissingClassificationsDialog({ kind, onClose }: {
  kind: "classification" | "market-type";
  onClose: () => void;
}) {
  const missingClassification = kind === "classification";
  const title = missingClassification ? "أنشئ فئة محل أولًا" : "أنشئ فئة ثانوية أولًا";
  const description = missingClassification
    ? "أنشئ فئة أساسية للمحل مثل مطاعم أو ملابس قبل إضافة محل جديد."
    : "أضف فئة ثانوية نشطة مثل برجر أو شاورما لإحدى الفئات الأساسية قبل إضافة محل جديد.";
  const href = missingClassification ? "/categories/markets" : "/categories/market-types";
  const action = missingClassification ? "إضافة فئة أساسية" : "إضافة فئة ثانوية";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="missing-market-classifications-title" className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5"><div><h2 id="missing-market-classifications-title" className="text-xl font-bold leading-7">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div><button type="button" onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button></div>
        <div className="flex justify-end gap-2 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" onClick={() => { window.location.href = href; }}><Plus className="size-4" />{action}</Button></div>
      </section>
    </div>
  );
}
