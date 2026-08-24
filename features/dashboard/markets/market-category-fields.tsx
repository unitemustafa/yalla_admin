"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Classification } from "./types";
import { classificationTypeLabel } from "./domain";
import { AppSelect, Button, Input } from "../primitives";
import type { useMarketForm } from "./use-market-form";

type MarketForm = ReturnType<typeof useMarketForm>;

export function MarketCategoryFields({ form, classifications }: {
  form: MarketForm;
  classifications: Classification[];
}) {
  return <>
    <label className="grid gap-2 text-sm font-semibold">اسم المحل *<Input value={form.draft.name} onChange={(event) => form.update("name", event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-semibold">الفئة الأساسية للمحل *<AppSelect value={form.draft.classificationId} onValueChange={form.changeClassification} options={classifications.map((item) => ({ value: String(item.id), label: `${item.name} - ظهور ${classificationTypeLabel(item.classification_type)}` }))} /></label>
    <div className="grid gap-3 rounded-lg border p-4 sm:col-span-2">
      <div><h3 className="text-sm font-bold">الفئات الثانوية للمحل *</h3><p className="mt-1 text-xs text-muted-foreground">تظهر فقط الفئات التابعة للفئة الأساسية المختارة. اختر واحدة أو أكثر مثل برجر أو شاورما.</p></div>
      {form.availableMarketTypes.length ? (
        <div className="flex flex-wrap gap-2">{form.availableMarketTypes.map((item) => {
          const selected = form.draft.selectedMarketTypeIds.includes(item.id);
          return <button key={item.id} type="button" onClick={() => form.toggleMarketType(item.id)} className={cn("rounded-full border px-3 py-2 text-xs font-bold transition", selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent", !item.is_active && "border-dashed text-muted-foreground")}>{item.name_ar}{!item.is_active ? " (معطل)" : ""}</button>;
        })}</div>
      ) : <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3"><p className="text-xs text-destructive">لا توجد فئات ثانوية مضافة لهذه الفئة الأساسية، ولا يمكن حفظ المحل قبل إضافتها.</p><Button type="button" size="sm" variant="outline" onClick={() => { window.location.href = "/categories/market-types"; }}>إضافة فئة ثانوية</Button></div>}
      {form.availableMarketTypes.length && !form.draft.selectedMarketTypeIds.length ? <p className="text-xs text-destructive">يجب اختيار فئة ثانوية واحدة على الأقل.</p> : null}
    </div>
    <label className="grid gap-2 text-sm font-semibold">وقت التوصيل من (دقيقة) *<Input type="number" min={1} inputMode="numeric" value={form.draft.deliveryTimeMin} onChange={(event) => form.update("deliveryTimeMin", event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-semibold">وقت التوصيل إلى (دقيقة) *<Input type="number" min={1} inputMode="numeric" value={form.draft.deliveryTimeMax} onChange={(event) => form.update("deliveryTimeMax", event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">وصف المحل<textarea value={form.draft.description} onChange={(event) => form.update("description", event.target.value)} className="min-h-24 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15" placeholder="اكتب وصفًا مختصرًا للمحل" /></label>
    <div className="grid gap-3 rounded-lg border p-4 sm:col-span-2">
      <div><h3 className="text-sm font-bold">الفئات الداخلية <span className="text-xs font-normal text-muted-foreground">(اختياري)</span></h3><p className="mt-1 text-xs text-muted-foreground">يمكن إضافتها لاحقًا، لكنها مطلوبة قبل إضافة منتجات للمحل.</p></div>
      <div className="flex flex-wrap gap-2">{form.availableSubcategories.map((item) => {
        const selected = form.draft.selectedSubcategoryIds.includes(item.id);
        return <button key={item.id} type="button" onClick={() => form.toggleSubcategory(item.id)} className={cn("rounded-full border px-3 py-2 text-xs font-bold transition", selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent", !item.is_active && "border-dashed text-muted-foreground")}>{item.name_ar}{!item.is_active ? " (معطلة)" : ""}</button>;
      })}</div>
      {form.draft.selectedSubcategoryIds.length ? <div className="grid gap-2">{form.draft.selectedSubcategoryIds.map((id, index) => {
        const item = form.availableSubcategories.find((candidate) => candidate.id === id);
        if (!item) return null;
        return <div key={id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"><span><span className="font-bold">{index + 1}. {item.name_ar}</span><span className="ms-2 text-xs text-muted-foreground">{item.name_en}</span></span><span className="flex gap-1"><Button type="button" size="icon" variant="outline" disabled={index === 0} onClick={() => form.moveSubcategory(id, -1)} aria-label="تحريك لأعلى"><ArrowUp className="size-3.5" /></Button><Button type="button" size="icon" variant="outline" disabled={index === form.draft.selectedSubcategoryIds.length - 1} onClick={() => form.moveSubcategory(id, 1)} aria-label="تحريك لأسفل"><ArrowDown className="size-3.5" /></Button></span></div>;
      })}</div> : <p className="text-xs text-muted-foreground">لا توجد فئات داخلية مختارة حاليًا.</p>}
    </div>
  </>;
}
