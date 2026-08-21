"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AlertCircle, Globe2, LoaderCircle, MapPin, MapPinned, Plus, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { Button, Card, Input } from "../primitives";
import { lookupServiceCityCoverage, saveServiceCity } from "./api";
import {
  cityDraft,
  payloadFromCityDraft,
  validateCityDraft,
  type CityDraft,
} from "./domain";
import type { ServiceCity } from "./types";

const CityCoverageMap = dynamic(() => import("./city-coverage-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
      <LoaderCircle className="me-2 size-4 animate-spin" />
      جاري تحميل الخريطة...
    </div>
  ),
});

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

export function CityDialog({
  city,
  onClose,
  onSaved,
}: {
  city?: ServiceCity;
  onClose: () => void;
  onSaved: (city: ServiceCity) => void;
}) {
  const { apiFetch } = useAuth();
  useLockedPageScroll();
  const [draft, setDraft] = useState(() => cityDraft(city));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [detectingCoverage, setDetectingCoverage] = useState(false);
  const [coverageNote, setCoverageNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latitude = Number(draft.latitude);
  const longitude = Number(draft.longitude);
  const radiusKm = Number(draft.radiusKm);
  const valid = validateCityDraft(draft);

  function update<K extends keyof CityDraft>(key: K, value: CityDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "latitude" || key === "longitude" || key === "radiusKm"
        ? { boundaryGeojson: null, boundaryBbox: null }
        : {}),
    }));
    setCoverageNote(null);
    setError(null);
  }

  async function detectCoverage() {
    const cityName = draft.nameAr.trim();
    if (cityName.length < 2 || detectingCoverage) return;
    setDetectingCoverage(true);
    setCoverageNote(null);
    setError(null);
    try {
      const coverage = await lookupServiceCityCoverage(apiFetch, cityName);
      setDraft((current) => ({
        ...current,
        latitude: coverage.latitude.toFixed(7),
        longitude: coverage.longitude.toFixed(7),
        radiusKm: coverage.radiusKm.toFixed(2),
        boundaryGeojson: null,
        boundaryBbox: coverage.boundingBox,
      }));
      const radiusLabel = coverage.radiusKm.toLocaleString("ar-EG-u-nu-latn");
      setCoverageNote(
        `تم تحديد مركز المدينة ونصف قطر ${radiusLabel} كم تلقائيًا${
          coverage.formattedAddress ? ` — ${coverage.formattedAddress}` : ""
        }.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحديد نطاق المدينة تلقائيًا.");
    } finally {
      setDetectingCoverage(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveServiceCity(apiFetch, payloadFromCityDraft(draft), city?.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المدينة.");
    } finally {
      setSaving(false);
    }
  }

  function useCurrentLocation() {
    if (locating) return;
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
          boundaryGeojson: null,
          boundaryBbox: null,
        }));
        setLocating(false);
      },
      () => {
        setError("تعذر الوصول إلى موقعك الحالي. راجع صلاحية الموقع.");
        setLocating(false);
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/30 px-4 py-4 backdrop-blur-[1px]">
      <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="city-dialog-title" className="mx-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b bg-muted/20 px-6 py-5">
          <div>
            <h2 id="city-dialog-title" className="text-xl font-bold">{city ? "تعديل المدينة" : "إضافة مدينة جديدة"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">حدد مركز المدينة ونصف قطر التغطية الذي سيُستخدم لعرض المحلات والعروض.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button>
        </div>

        <form onSubmit={submit}>
          <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Globe2 className="size-4" /></span>
                <div><h3 className="font-bold">بيانات المدينة</h3><p className="text-xs text-muted-foreground">الاسم وحالة الظهور داخل التطبيق.</p></div>
              </div>
              <div className="grid gap-4 p-5">
                <label className="grid gap-2 text-sm font-semibold">اسم المدينة *<Input autoFocus dir="rtl" className="h-11 text-right" value={draft.nameAr} onChange={(event) => update("nameAr", event.target.value)} placeholder="مثال: القاهرة" /></label>
                <Button type="button" variant="outline" onClick={detectCoverage} disabled={draft.nameAr.trim().length < 2 || detectingCoverage} className="h-11">
                  {detectingCoverage ? <LoaderCircle className="size-4 animate-spin" /> : <MapPinned className="size-4" />}
                  {detectingCoverage ? "جاري حساب النطاق..." : "تحديد المركز والنطاق تلقائيًا"}
                </Button>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">خط العرض<Input dir="ltr" className="h-11 text-right" inputMode="decimal" value={draft.latitude} onChange={(event) => update("latitude", event.target.value)} /></label>
                  <label className="grid gap-2 text-sm font-semibold">خط الطول<Input dir="ltr" className="h-11 text-right" inputMode="decimal" value={draft.longitude} onChange={(event) => update("longitude", event.target.value)} /></label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">نصف قطر التغطية (كم) *<Input dir="ltr" className="h-11 text-right" inputMode="decimal" min="0.1" step="0.01" type="number" value={draft.radiusKm} onChange={(event) => update("radiusKm", event.target.value)} /></label>
                <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating} className="h-11">
                  {locating ? <LoaderCircle className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                  {locating ? "جاري تحديد الموقع..." : "استخدام موقعي الحالي"}
                </Button>
                {coverageNote ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{coverageNote}</div> : null}
                {error ? <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPinned className="size-4" /></span>
                <div><h3 className="font-bold">نطاق التغطية</h3><p className="text-xs text-muted-foreground">غيّر نصف القطر من البيانات، واضغط على الخريطة لتغيير مركز الدائرة.</p></div>
              </div>
              <div className="p-5">
                {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
                  <div className="overflow-hidden rounded-lg border p-1">
                    <CityCoverageMap latitude={latitude} longitude={longitude} radiusKm={Number.isFinite(radiusKm) ? radiusKm : 0.1} onCenterChange={(nextLatitude, nextLongitude) => setDraft((current) => ({ ...current, latitude: nextLatitude.toFixed(7), longitude: nextLongitude.toFixed(7), boundaryGeojson: null, boundaryBbox: null }))} />
                  </div>
                ) : <div className="flex h-65 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">أدخل إحداثيات صحيحة لعرض الخريطة.</div>}
              </div>
            </Card>
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={!valid || saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "جاري الحفظ..." : city ? "حفظ التعديلات" : "إضافة المدينة"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
