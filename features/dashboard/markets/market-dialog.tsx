"use client";

import { AlertCircle, LoaderCircle, Plus, X } from "lucide-react";

import type { ServiceCity } from "../cities/types";
import type { MarketType } from "../market-types-api";
import { Button } from "../primitives";
import { MarketCategoryFields } from "./market-category-fields";
import { MarketMediaFields } from "./market-media-fields";
import { MarketVisibilityFields } from "./market-visibility-fields";
import type { Classification, Market } from "./types";
import { useMarketForm } from "./use-market-form";

export function MarketDialog({ market, serviceCities, serviceCitiesLoading, serviceCitiesError, classifications, marketTypes, onClose, onSaved, onReloadServiceCities }: {
  market?: Market;
  serviceCities: ServiceCity[];
  serviceCitiesLoading: boolean;
  serviceCitiesError: string;
  classifications: Classification[];
  marketTypes: MarketType[];
  onClose: () => void;
  onSaved: (market: Market, notificationRequested: boolean) => void;
  onReloadServiceCities: () => void;
}) {
  const form = useMarketForm({ market, serviceCities, classifications, marketTypes, onSaved });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/30 p-4 backdrop-blur-[1px]">
      <section role="dialog" aria-modal="true" className="flex h-[min(820px,calc(100dvh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b bg-muted/20 px-6 py-4"><div><h2 className="text-xl font-bold">{market ? "تعديل المحل" : "إضافة محل"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد نطاق ظهور المحل: جاهز للشحن أو مرتبط بمدن خدمة.</p></div><button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button></div>
        <form onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-6 sm:grid-cols-2">
            <MarketMediaFields form={form} />
            <MarketCategoryFields form={form} classifications={classifications} />
            <MarketVisibilityFields form={form} serviceCitiesLoading={serviceCitiesLoading} serviceCitiesError={serviceCitiesError} onReloadServiceCities={onReloadServiceCities} />
            {form.error ? <p className="flex gap-2 text-sm text-destructive sm:col-span-2"><AlertCircle className="size-4" />{form.error}</p> : null}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-6 py-3"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!form.canSubmit || form.saving}>{form.saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{form.saving ? "جاري الحفظ..." : "حفظ المحل"}</Button></div>
        </form>
      </section>
    </div>
  );
}
