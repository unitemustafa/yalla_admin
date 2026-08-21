"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";

import type { ServiceCity } from "../cities/types";
import { AppSelect, Button, Field, Input } from "../primitives";
import {
  createZoneDraft,
  formatDeliveryCurrency,
  parseDeliveryNumber,
  validateZoneDraft,
  zoneFromDraft,
  type ZoneDraft,
  type ZoneDraftErrors,
} from "./domain";
import type { DeliveryZone } from "./types";

const DeliveryAreaMap = dynamic(() => import("./delivery-area-map"), { ssr: false });

function useLockedPageScroll() {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="text-xs font-medium text-destructive">{children}</p> : null;
}

function NumberField({ label, value, onChange, error, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return <Field label={label}><Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} dir="ltr" className="text-right" /><FieldError>{error}</FieldError></Field>;
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-start font-semibold">{value}</span></div>;
}

export function ZoneFormDialog({ zone, cities, onClose, onSave }: {
  zone?: DeliveryZone;
  cities: ServiceCity[];
  onClose: () => void;
  onSave: (zone: DeliveryZone) => void;
}) {
  useLockedPageScroll();
  const [draft, setDraft] = useState<ZoneDraft>(() => createZoneDraft(zone));
  const [errors, setErrors] = useState<ZoneDraftErrors>({});
  const isEditing = Boolean(zone);
  const cityOptions = useMemo(() => {
    const activeOptions = cities.filter((city) => city.is_active !== false).map((city) => ({ value: String(city.id), label: city.name }));
    const currentCity = cities.find((city) => String(city.id) === draft.cityId);
    if (isEditing && currentCity?.is_active === false) {
      return [{ value: String(currentCity.id), label: `${currentCity.name} (غير مفعلة)` }, ...activeOptions.filter((option) => option.value !== String(currentCity.id))];
    }
    return activeOptions;
  }, [cities, draft.cityId, isEditing]);
  const selectedCity = cities.find((city) => String(city.id) === draft.cityId);

  function updateDraft<K extends keyof ZoneDraft>(field: K, value: ZoneDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submitZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateZoneDraft(draft);
    if (!cityOptions.some((option) => option.value === draft.cityId)) {
      nextErrors.cityId = "اختر مدينة خدمة مفعلة.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const city = cities.find((item) => String(item.id) === draft.cityId);
    onSave({ ...zoneFromDraft(draft, zone), cityName: city?.name || zone?.cityName || "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-3 backdrop-blur-[1px] sm:px-6">
      <section dir="rtl" role="dialog" aria-modal="true" className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
        <button type="button" onClick={onClose} className="absolute left-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button>
        <div className="border-b bg-muted/20 px-5 py-3 pe-14"><h2 className="text-xl font-semibold leading-7">{isEditing ? "تعديل منطقة توصيل" : "إضافة منطقة جديدة"}</h2><p className="mt-1 text-sm text-muted-foreground">اضبط قواعد التسعير وحدود التوصيل لهذه المنطقة.</p></div>
        <form onSubmit={submitZone} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 items-start gap-3 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3 text-sm font-bold">بيانات المنطقة</div>
              <div className="grid gap-3 p-3 md:grid-cols-2">
                <Field label="اسم المنطقة *"><Input autoFocus dir="rtl" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="مثلًا: القاهرة الجديدة" /><FieldError>{errors.name}</FieldError></Field>
                <Field label="مدينة التوصيل *"><AppSelect value={draft.cityId} onValueChange={(value) => updateDraft("cityId", value)} options={cityOptions} placeholder="اختر مدينة التوصيل" ariaLabel="مدينة التوصيل" disabled={!cityOptions.length} dir="rtl" /><FieldError>{errors.cityId}</FieldError></Field>
                <NumberField label="سعر التوصيل الثابت *" value={draft.fixedDeliveryPrice} onChange={(value) => updateDraft("fixedDeliveryPrice", value)} error={errors.fixedDeliveryPrice} placeholder="45" />
                <NumberField label="أقل مدة توصيل (دقيقة) *" value={draft.etaMinMinutes} onChange={(value) => updateDraft("etaMinMinutes", value)} error={errors.etaMinMinutes} placeholder="30" />
                <NumberField label="أقصى مدة توصيل (دقيقة) *" value={draft.etaMaxMinutes} onChange={(value) => updateDraft("etaMaxMinutes", value)} error={errors.etaMaxMinutes} placeholder="45" />
              </div>
            </div>
            <div className="rounded-lg border bg-card">
              <div className="border-b px-4 py-3 text-sm font-bold">معاينة التسعير</div>
              <div className="space-y-3 p-3 text-sm">
                <PreviewRow label="مدينة التوصيل" value={selectedCity?.name || "-"} />
                <PreviewRow label="المنطقة" value={draft.name || "منطقة جديدة"} />
                <PreviewRow label="سعر التوصيل" value={formatDeliveryCurrency(parseDeliveryNumber(draft.fixedDeliveryPrice))} />
                <PreviewRow label="مدة التوصيل" value={draft.etaMinMinutes && draft.etaMaxMinutes ? `${draft.etaMinMinutes}–${draft.etaMaxMinutes} دقيقة` : "-"} />
              </div>
            </div>
            <div className="rounded-lg border bg-card lg:col-span-2">
              <div className="border-b px-4 py-3 text-sm font-bold">حدود منطقة التوصيل</div>
              <div className="p-3">
                {selectedCity?.boundary_geojson ? <DeliveryAreaMap latitude={Number(selectedCity.center_latitude ?? 30.0444)} longitude={Number(selectedCity.center_longitude ?? 31.2357)} cityBoundary={selectedCity.boundary_geojson} areaBoundary={draft.boundaryGeojson} onAreaBoundaryChange={(value) => updateDraft("boundaryGeojson", value)} /> : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">ارسم حدود المدينة أولًا من صفحة المدن قبل إضافة منطقة توصيل.</div>}
                <FieldError>{errors.boundaryGeojson}</FieldError>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/15 px-5 py-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit"><Save className="size-4" />حفظ المنطقة</Button></div>
        </form>
      </section>
    </div>
  );
}

export function MissingServiceCitiesDialog({ onClose }: { onClose: () => void }) {
  useLockedPageScroll();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="missing-service-cities-title" className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5"><div><h2 id="missing-service-cities-title" className="text-xl font-bold leading-7">أنشئ مدينة أولًا</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">أنشئ مدينة خدمة مفعّلة أولًا لتحديد المدينة التي تتبع لها منطقة التوصيل الجديدة.</p></div><button type="button" onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-accent" aria-label="إغلاق"><X className="size-4" /></button></div>
        <div className="flex justify-end gap-2 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" onClick={() => { window.location.href = "/cities"; }}><Plus className="size-4" />إضافة مدينة</Button></div>
      </section>
    </div>
  );
}
