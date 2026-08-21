"use client";

import { useEffect } from "react";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSelect, Button, CurrencyText, Input } from "../../primitives";
import { money } from "../formatters";
import type { ProductVariantOption } from "../types";

type AvailabilityFilter = "all" | "available" | "unavailable";

type ProductVariantPickerProps = {
  open: boolean;
  variants: ProductVariantOption[];
  allVariantsCount: number;
  selectedVariantId: string;
  query: string;
  onQueryChange: (value: string) => void;
  marketFilter: string;
  onMarketFilterChange: (value: string) => void;
  marketOptions: Array<{ value: string; label: string }>;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryOptions: string[];
  availabilityFilter: AvailabilityFilter;
  onAvailabilityFilterChange: (value: AvailabilityFilter) => void;
  showMarketFilter?: boolean;
  onClose: () => void;
  onSelect: (variantId: string) => void;
};

export function ProductVariantPicker(props: ProductVariantPickerProps) {
  useEffect(() => {
    if (!props.open) return;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: document.documentElement.style.overflow,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.documentElement.style.overflow = previous.htmlOverflow;
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [props.open]);

  if (!props.open) return null;
  const showMarketFilter = props.showMarketFilter ?? true;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div role="dialog" aria-modal="true" aria-labelledby="product-variant-picker-title" className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="product-variant-picker-title" className="text-base font-bold">اختيار منتج للطلب</h2>
            <p className="mt-1 text-sm text-muted-foreground">ابحث بالاسم أو الكود، والنتائج مقصورة على محل هذا القسم.</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={props.onClose} aria-label="إغلاق اختيار المنتج" className="size-9 rounded-full bg-muted/30"><X className="size-4" /></Button>
        </div>
        <div className={cn("grid gap-3 border-b bg-muted/15 p-4", showMarketFilter ? "lg:grid-cols-[minmax(260px,1fr)_200px_190px_170px]" : "lg:grid-cols-[minmax(260px,1fr)_190px_170px]")}>
          <label className="grid gap-2 text-sm font-medium">
            بحث
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="اسم المنتج أو الكود أو المحل..." className="h-10 ps-9" autoFocus />
            </div>
          </label>
          {showMarketFilter ? (
            <PickerSelect label="المحل" value={props.marketFilter} onValueChange={props.onMarketFilterChange} ariaLabel="فلتر المحل" options={[{ value: "all", label: "كل المحلات" }, ...props.marketOptions]} />
          ) : null}
          <PickerSelect label="التصنيف" value={props.categoryFilter} onValueChange={props.onCategoryFilterChange} ariaLabel="فلتر التصنيف" options={[{ value: "all", label: "كل التصنيفات" }, ...props.categoryOptions.map((category) => ({ value: category, label: category }))]} />
          <PickerSelect label="الحالة" value={props.availabilityFilter} onValueChange={(value) => props.onAvailabilityFilterChange(value as AvailabilityFilter)} ariaLabel="فلتر حالة المنتج" options={[{ value: "all", label: "كل الحالات" }, { value: "available", label: "متاح" }, { value: "unavailable", label: "غير متاح" }]} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {props.variants.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {props.variants.map((variant) => {
                const selected = variant.id === props.selectedVariantId;
                return (
                  <button key={variant.id} type="button" onClick={() => props.onSelect(variant.id)} className={cn("group grid min-h-36 gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45", selected && "border-primary/55 bg-primary/10")}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{variant.productName}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{variant.variantLabel}{variant.sku ? ` - ${variant.sku}` : ""}</span>
                      </span>
                      {selected ? <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Check className="size-4" /></span> : null}
                    </span>
                    <span className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-muted/60 px-2 py-1">{variant.marketName}</span>
                      <span className="rounded-md bg-muted/60 px-2 py-1">{variant.categoryName}</span>
                      <span className={cn("rounded-md px-2 py-1 font-semibold", variant.available ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-destructive/10 text-destructive")}>{variant.available ? "متاح" : "غير متاح"}</span>
                    </span>
                    <CurrencyText className="text-base font-extrabold tabular-nums">{money(variant.price)}</CurrencyText>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">لا توجد منتجات مطابقة</div>
              <p className="mt-1 text-xs text-muted-foreground">جرّب تغيير البحث أو الفلاتر.</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
          <div className="text-xs text-muted-foreground">ظاهر {props.variants.length} من {props.allVariantsCount} منتج</div>
          <Button type="button" variant="outline" className="h-10" onClick={props.onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
}

function PickerSelect({ label, ...props }: { label: string; value: string; onValueChange: (value: string) => void; ariaLabel: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <AppSelect {...props} className="h-10 bg-input" />
    </label>
  );
}
