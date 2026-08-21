"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Switch } from "../primitives";
import type { useMarketForm } from "./use-market-form";

type MarketForm = ReturnType<typeof useMarketForm>;

export function MarketVisibilityFields({ form, serviceCitiesLoading, serviceCitiesError, onReloadServiceCities }: {
  form: MarketForm;
  serviceCitiesLoading: boolean;
  serviceCitiesError: string;
  onReloadServiceCities: () => void;
}) {
  const cityScope = form.draft.showInServiceCities;
  return <>
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40 sm:col-span-2"><span><span className="block text-sm font-semibold">محل شائع</span><span className="mt-1 block text-xs font-normal text-muted-foreground">يظهر بأولوية داخل فئته في صفحة المتجر.</span></span><Switch checked={form.draft.isPopular} onCheckedChange={(value) => form.update("isPopular", value)} aria-label="تحديد المحل كشائع" /></label>
    <div className="grid gap-3 sm:col-span-2">
      <div className="text-sm font-medium">نطاق ظهور المحل *</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40"><span className="block text-sm font-semibold">يظهر في العام</span><Switch checked={form.draft.showInGeneral} disabled={form.draft.showInServiceCities} onCheckedChange={form.setGeneralVisibility} /></label>
        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40"><span className="block text-sm font-semibold">يظهر في المدن</span><Switch checked={form.draft.showInServiceCities} disabled={form.draft.showInGeneral} onCheckedChange={form.setServiceCityVisibility} /></label>
      </div>
    </div>
    {cityScope ? <div className="grid gap-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3"><div className="text-sm font-medium">المدن</div><span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold leading-none text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{form.draft.selectedServiceCityIds.length} مدينة</span></div>
      {serviceCitiesLoading ? <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground"><LoaderCircle className="me-2 size-4 animate-spin" />جاري تحميل المدن...</div> : serviceCitiesError ? <div className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{serviceCitiesError}</span><Button type="button" variant="outline" size="sm" onClick={onReloadServiceCities}>إعادة المحاولة</Button></div> : form.availableServiceCities.length ? (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{form.availableServiceCities.map((city) => {
          const selected = form.draft.selectedServiceCityIds.includes(city.id);
          return <button key={city.id} type="button" aria-pressed={selected} disabled={form.draft.selectedServiceCityIds.length > 0 && !selected} onClick={() => form.toggleServiceCity(city.id)} className={cn("flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition", selected ? "border-primary bg-primary/10 text-primary" : form.draft.selectedServiceCityIds.length > 0 ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent")}><span className="truncate">{form.serviceCityName(city)}</span><span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-transparent")}><CheckCircle2 className="size-3.5" /></span></button>;
        })}</div>
      ) : <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">لا توجد مدن خدمة نشطة.</div>}
    </div> : null}
    {!form.editing ? <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-md border border-primary/25 bg-primary/5 px-4 py-3 shadow-sm transition hover:border-primary/45 sm:col-span-2"><span><span className="block text-sm font-semibold">إرسال إشعار عن المحل</span><span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">مش هيتبعت فورًا؛ هنستنى أول منتج متاح، وبعدها نبعت إعلان المحل{!cityScope ? " لعملاء السوق العام فقط." : form.draft.selectedServiceCityIds.length ? ` لعملاء ${form.availableServiceCities.find((city) => city.id === form.draft.selectedServiceCityIds[0])?.name ?? "المدينة المحددة"} فقط.` : " لعملاء المدينة اللي هتحددها فقط."} ولو اخترت إشعار المنتج كمان، هنبعت إشعار المحل وحده.</span></span><Switch checked={form.draft.sendStoreNotification} disabled={form.saving} onCheckedChange={(value) => form.update("sendStoreNotification", value)} aria-label="إرسال إشعار عن المحل بعد إضافة أول منتج متاح" /></label> : null}
  </>;
}
