"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  Globe2,
  Edit3,
  LoaderCircle,
  MapPin,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  Input,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import {
  deleteDeliveryArea,
  deleteServiceCity,
  loadDeliveryAreas,
  saveDeliveryArea,
  type DeliveryArea,
  type DeliveryAreaPayload,
  saveServiceCity,
  type ServiceCity,
  type ServiceCityPayload,
  useServiceCities,
} from "../cities-api";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { useAuth } from "@/features/auth/auth-provider";

const CityCoverageMap = dynamic(() => import("../city-coverage-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
      <LoaderCircle className="me-2 size-4 animate-spin" />
      جاري تحميل الخريطة...
    </div>
  ),
});

const citiesPageSize = 5;

type CityDraft = {
  nameAr: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
  active: boolean;
};

type AreaDraft = {
  name: string;
  deliveryPrice: string;
  centerLatitude: string;
  centerLongitude: string;
  radiusKm: string;
  active: boolean;
};

const defaultDraft: CityDraft = {
  nameAr: "",
  latitude: "30.0444000",
  longitude: "31.2357000",
  radiusKm: "25",
  active: true,
};

const defaultAreaDraft: AreaDraft = {
  name: "",
  deliveryPrice: "",
  centerLatitude: "",
  centerLongitude: "",
  radiusKm: "",
  active: true,
};

function cityDraft(city?: ServiceCity): CityDraft {
  const coverage = city?.coverages[0];
  return {
    nameAr: city?.name_ar || city?.name || defaultDraft.nameAr,
    latitude: coverage?.center_latitude ?? defaultDraft.latitude,
    longitude: coverage?.center_longitude ?? defaultDraft.longitude,
    radiusKm: coverage?.radius_km ?? defaultDraft.radiusKm,
    active: city?.is_active ?? true,
  };
}

function payloadFromDraft(draft: CityDraft): ServiceCityPayload {
  return {
    name: draft.nameAr.trim(),
    center_latitude: Number(draft.latitude).toFixed(7),
    center_longitude: Number(draft.longitude).toFixed(7),
    radius_km: Number(draft.radiusKm).toFixed(2),
    is_active: draft.active,
  };
}

function areaDraft(area?: DeliveryArea): AreaDraft {
  return {
    name: area?.name ?? defaultAreaDraft.name,
    deliveryPrice: area?.delivery_price ?? defaultAreaDraft.deliveryPrice,
    centerLatitude: area?.center_latitude ?? defaultAreaDraft.centerLatitude,
    centerLongitude: area?.center_longitude ?? defaultAreaDraft.centerLongitude,
    radiusKm: area?.radius_km ?? defaultAreaDraft.radiusKm,
    active: area?.is_active ?? defaultAreaDraft.active,
  };
}

function validateAreaDraft(draft: AreaDraft) {
  if (!draft.name.trim()) return "اسم المنطقة مطلوب";
  if (!draft.deliveryPrice.trim()) return "سعر التوصيل مطلوب";

  const deliveryPrice = Number(draft.deliveryPrice);
  if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) {
    return "سعر التوصيل يجب أن يكون رقمًا صحيحًا";
  }

  const radius = draft.radiusKm.trim() ? Number(draft.radiusKm) : null;
  if (radius !== null && (!Number.isFinite(radius) || radius <= 0)) {
    return "نصف القطر يجب أن يكون أكبر من صفر";
  }

  const latitude = draft.centerLatitude.trim() ? Number(draft.centerLatitude) : null;
  const longitude = draft.centerLongitude.trim() ? Number(draft.centerLongitude) : null;
  if (
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    return "إحداثيات غير صحيحة";
  }

  return null;
}

function payloadFromAreaDraft(city: ServiceCity, draft: AreaDraft): DeliveryAreaPayload {
  return {
    service_city_id: city.id,
    name: draft.name.trim(),
    center_latitude: draft.centerLatitude.trim() || null,
    center_longitude: draft.centerLongitude.trim() || null,
    radius_km: draft.radiusKm.trim() || null,
    delivery_price: Number(draft.deliveryPrice).toFixed(2),
    is_active: draft.active,
  };
}

function formatMoney(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  const amount = Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
  return `${amount} EGP`;
}

function formatRadius(value: string | null | undefined) {
  if (!value) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return `${number.toLocaleString("ar-EG-u-nu-latn")} كم`;
}

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

function CityDeleteDialog({
  city,
  busy,
  onCancel,
  onConfirm,
}: {
  city: ServiceCity;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useLockedPageScroll();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">حذف المدينة</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              هل تريد حذف مدينة {city.name_ar || city.name}؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف
          </Button>
        </div>
      </section>
    </div>
  );
}

function CityDialog({
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
  const [error, setError] = useState<string | null>(null);
  const latitude = Number(draft.latitude);
  const longitude = Number(draft.longitude);
  const radiusKm = Number(draft.radiusKm);
  const valid =
    draft.nameAr.trim().length > 1 &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(radiusKm) &&
    radiusKm > 0;

  function update<K extends keyof CityDraft>(key: K, value: CityDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveServiceCity(apiFetch, payloadFromDraft(draft), city?.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المدينة.");
    } finally {
      setSaving(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        }));
      },
      () => setError("تعذر الوصول إلى موقعك الحالي. راجع صلاحية الموقع."),
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 px-4 py-4 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-dialog-title"
        className="mx-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between border-b bg-muted/20 px-6 py-5">
          <div>
            <h2 id="city-dialog-title" className="text-xl font-bold">
              {city ? "تعديل المدينة" : "إضافة مدينة جديدة"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              حدد مركز المدينة ونصف قطر التغطية الذي سيُستخدم لعرض المحلات والعروض.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full border p-2 hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 border-b px-5 py-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Globe2 className="size-4" />
                </span>
                <div>
                  <h3 className="font-bold">بيانات المدينة</h3>
                  <p className="text-xs text-muted-foreground">الاسم وحالة الظهور داخل التطبيق.</p>
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <label className="grid gap-2 text-sm font-semibold">
                  اسم المدينة *
                  <Input
                    autoFocus
                    dir="rtl"
                    className="h-11 text-right"
                    value={draft.nameAr}
                    onChange={(event) => update("nameAr", event.target.value)}
                    placeholder="مثال: القاهرة"
                  />
                </label>
                {city ? (
                  <label className="grid gap-2 text-sm font-semibold">
                    المعرّف الثابت
                    <Input dir="rtl" className="h-11 text-right" value={city.slug} disabled />
                  </label>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    خط العرض
                    <Input
                      dir="ltr"
                      className="h-11 text-right"
                      inputMode="decimal"
                      value={draft.latitude}
                      onChange={(event) => update("latitude", event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    خط الطول
                    <Input
                      dir="ltr"
                      className="h-11 text-right"
                      inputMode="decimal"
                      value={draft.longitude}
                      onChange={(event) => update("longitude", event.target.value)}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  نصف قطر التغطية (كم)
                  <Input
                    dir="ltr"
                    className="h-11 text-right"
                    inputMode="decimal"
                    min="0.1"
                    step="0.1"
                    type="number"
                    value={draft.radiusKm}
                    onChange={(event) => update("radiusKm", event.target.value)}
                  />
                </label>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">المدينة مفعّلة</p>
                    <p className="text-xs text-muted-foreground">تظهر داخل تطبيق العميل والاختيارات.</p>
                  </div>
                  <Switch
                    checked={draft.active}
                    onCheckedChange={(checked) => update("active", checked)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={useCurrentLocation} className="h-11">
                  <MapPin className="size-4" />
                  استخدام موقعي الحالي
                </Button>
                {error ? (
                  <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPinned className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold">نطاق التغطية</h3>
                    <p className="text-xs text-muted-foreground">اضغط على الخريطة لتغيير المركز.</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
                  <div className="overflow-hidden rounded-lg border p-1">
                    <CityCoverageMap
                      latitude={latitude}
                      longitude={longitude}
                      radiusKm={Number.isFinite(radiusKm) ? radiusKm : 1}
                      onCenterChange={(nextLatitude, nextLongitude) => {
                        setDraft((current) => ({
                          ...current,
                          latitude: nextLatitude.toFixed(7),
                          longitude: nextLongitude.toFixed(7),
                        }));
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    أدخل إحداثيات صحيحة لعرض الخريطة.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {saving ? "جاري الحفظ..." : city ? "حفظ التعديلات" : "إضافة المدينة"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AreaDeleteDialog({
  area,
  busy,
  onCancel,
  onConfirm,
}: {
  area: DeliveryArea;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useLockedPageScroll();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">حذف منطقة التوصيل</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              هل أنت متأكد من حذف هذه المنطقة؟ قد لا يمكن حذفها إذا كانت مرتبطة بمحلات أو طلبات.
            </p>
            <p className="mt-2 text-sm font-semibold">{area.name}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف
          </Button>
        </div>
      </section>
    </div>
  );
}

function AreaForm({
  area,
  city,
  saving,
  onCancel,
  onSubmit,
}: {
  area?: DeliveryArea;
  city: ServiceCity;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (draft: AreaDraft) => void;
}) {
  const cityCoverage = city.coverages[0];
  const [draft, setDraft] = useState(() => ({
    ...areaDraft(area),
    centerLatitude: area?.center_latitude ?? cityCoverage?.center_latitude ?? defaultAreaDraft.centerLatitude,
    centerLongitude:
      area?.center_longitude ?? cityCoverage?.center_longitude ?? defaultAreaDraft.centerLongitude,
    radiusKm: area?.radius_km ?? cityCoverage?.radius_km ?? defaultAreaDraft.radiusKm,
  }));
  const [error, setError] = useState<string | null>(null);
  const latitude = Number(draft.centerLatitude);
  const longitude = Number(draft.centerLongitude);
  const radiusKm = Number(draft.radiusKm);
  const mapRadiusKm = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 1;

  function update<K extends keyof AreaDraft>(key: K, value: AreaDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateAreaDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(draft);
  }

  function useCityCoverageCenter() {
    if (!cityCoverage) return;
    setDraft((current) => ({
      ...current,
      centerLatitude: cityCoverage.center_latitude,
      centerLongitude: cityCoverage.center_longitude,
      radiusKm: current.radiusKm || cityCoverage.radius_km,
    }));
    setError(null);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-muted/10 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">{area ? "تعديل منطقة التوصيل" : "إضافة منطقة"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            المنطقة ستتبع مدينة {city.name_ar || city.name}.
          </p>
        </div>
        <Badge tone="blue">service_city_id: {city.id}</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-4">
            <h4 className="font-bold">بيانات المنطقة</h4>
            <p className="text-xs text-muted-foreground">الاسم والسعر وحالة الظهور داخل المدينة.</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              اسم المنطقة *
              <Input
                autoFocus
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="مثال: باب الزوار"
                className="h-11"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              سعر التوصيل *
              <Input
                dir="ltr"
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
                value={draft.deliveryPrice}
                onChange={(event) => update("deliveryPrice", event.target.value)}
                placeholder="300.00"
                className="h-11 text-right"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              نصف قطر التغطية كم
              <Input
                dir="ltr"
                inputMode="decimal"
                min="0.1"
                step="0.1"
                type="number"
                value={draft.radiusKm}
                onChange={(event) => update("radiusKm", event.target.value)}
                placeholder="6.50"
                className="h-11 text-right"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              خط العرض
              <Input
                dir="ltr"
                inputMode="decimal"
                value={draft.centerLatitude}
                onChange={(event) => update("centerLatitude", event.target.value)}
                placeholder="36.7167000"
                className="h-11 text-right"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              خط الطول
              <Input
                dir="ltr"
                inputMode="decimal"
                value={draft.centerLongitude}
                onChange={(event) => update("centerLongitude", event.target.value)}
                placeholder="3.1833000"
                className="h-11 text-right"
              />
            </label>
            <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3">
              <div>
                <p className="text-sm font-semibold">المنطقة مفعلة</p>
                <p className="text-xs text-muted-foreground">تظهر ضمن مناطق المدينة.</p>
              </div>
              <Switch
                checked={draft.active}
                onCheckedChange={(checked) => update("active", checked)}
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPinned className="size-4" />
              </span>
              <div>
                <h4 className="font-bold">نطاق التغطية</h4>
                <p className="text-xs text-muted-foreground">اضغط على الخريطة لاختيار مركز المنطقة.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5">
            {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
              <div className="overflow-hidden rounded-lg border p-1">
                <CityCoverageMap
                  latitude={latitude}
                  longitude={longitude}
                  radiusKm={mapRadiusKm}
                  onCenterChange={(nextLatitude, nextLongitude) => {
                    setDraft((current) => ({
                      ...current,
                      centerLatitude: nextLatitude.toFixed(7),
                      centerLongitude: nextLongitude.toFixed(7),
                    }));
                    setError(null);
                  }}
                />
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                أدخل إحداثيات صحيحة لعرض الخريطة.
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={useCityCoverageCenter}
              disabled={!cityCoverage}
              className="h-11"
            >
              <MapPin className="size-4" />
              استخدام مركز المدينة
            </Button>
          </div>
        </Card>
      </div>
      {error ? (
        <div className="mt-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          إلغاء
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? "جاري الحفظ..." : "حفظ المنطقة"}
        </Button>
      </div>
    </form>
  );
}

function DeliveryAreasDialog({
  city,
  areas,
  loading,
  loadError,
  areaFormOpen,
  editingArea,
  savingArea,
  busyAreaId,
  onClose,
  onReload,
  onOpenCreate,
  onEditArea,
  onCancelForm,
  onSubmitArea,
  onToggleArea,
  onRequestDelete,
}: {
  city: ServiceCity;
  areas: DeliveryArea[];
  loading: boolean;
  loadError: string | null;
  areaFormOpen: boolean;
  editingArea: DeliveryArea | null;
  savingArea: boolean;
  busyAreaId: number | null;
  onClose: () => void;
  onReload: () => void;
  onOpenCreate: () => void;
  onEditArea: (area: DeliveryArea) => void;
  onCancelForm: () => void;
  onSubmitArea: (draft: AreaDraft) => void;
  onToggleArea: (area: DeliveryArea, checked: boolean) => void;
  onRequestDelete: (area: DeliveryArea) => void;
}) {
  useLockedPageScroll();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 px-4 py-4 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-areas-dialog-title"
        className="mx-auto max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5">
          <div>
            <h2 id="delivery-areas-dialog-title" className="text-xl font-bold">
              مناطق التوصيل - {city.name_ar || city.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة المناطق والأسعار الثابتة داخل هذه المدينة فقط.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onReload} disabled={loading}>
              <RefreshCw className="size-4" />
              تحديث
            </Button>
            <Button type="button" onClick={onOpenCreate}>
              <Plus className="size-4" />
              إضافة منطقة
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="rounded-full border p-2 hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          {areaFormOpen ? (
            <AreaForm
              key={editingArea?.id ?? "new-area"}
              area={editingArea ?? undefined}
              city={city}
              saving={savingArea}
              onCancel={onCancelForm}
              onSubmit={onSubmitArea}
            />
          ) : null}

          {loading ? (
            <div className="flex min-h-48 items-center justify-center rounded-lg border bg-muted/10 text-sm text-muted-foreground">
              <LoaderCircle className="me-2 size-5 animate-spin" />
              جاري تحميل مناطق التوصيل...
            </div>
          ) : loadError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border px-6 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <p className="text-sm">{loadError}</p>
              <Button type="button" variant="outline" onClick={onReload}>
                إعادة المحاولة
              </Button>
            </div>
          ) : areas.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/10 text-center">
              <MapPin className="size-8 text-muted-foreground" />
              <p className="font-semibold">لا توجد مناطق توصيل لهذه المدينة</p>
              <p className="text-sm text-muted-foreground">أضف منطقة توصيل ثابتة السعر.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/35 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-start">اسم المنطقة</th>
                    <th className="px-4 py-3 text-start">سعر التوصيل</th>
                    <th className="px-4 py-3 text-start">نصف القطر</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area) => (
                    <tr key={area.id} className="border-b last:border-0">
                      <td className="px-4 py-4 font-semibold">{area.name}</td>
                      <td className="px-4 py-4">{formatMoney(area.delivery_price)}</td>
                      <td className="px-4 py-4">{formatRadius(area.radius_km)}</td>
                      <td className="px-4 py-4">
                        <Badge tone={area.is_active ? "green" : "red"}>
                          {area.is_active ? "مفعلة" : "معطلة"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
                            <Switch
                              checked={area.is_active}
                              disabled={busyAreaId === area.id}
                              onCheckedChange={(checked) => onToggleArea(area, checked)}
                            />
                            <span className="text-xs font-semibold">
                              {area.is_active ? "تعطيل" : "تفعيل"}
                            </span>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => onEditArea(area)}>
                            <Edit3 className="size-4" />
                            تعديل
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyAreaId === area.id}
                            onClick={() => onRequestDelete(area)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function CitiesPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const { cities, setCities, loading, error, reload } = useServiceCities();
  const [query, setQuery] = useState("");
  const [editingCity, setEditingCity] = useState<ServiceCity | null | undefined>();
  const [deleteCity, setDeleteCity] = useState<ServiceCity | null>(null);
  const [busyCityId, setBusyCityId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryAreaCounts, setDeliveryAreaCounts] = useState<Record<number, number>>({});
  const [selectedCityForAreas, setSelectedCityForAreas] = useState<ServiceCity | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [deleteArea, setDeleteArea] = useState<DeliveryArea | null>(null);
  const [savingArea, setSavingArea] = useState(false);
  const [busyAreaId, setBusyAreaId] = useState<number | null>(null);

  const loadAreasForCity = useCallback(
    async (city: ServiceCity) => {
      setAreasLoading(true);
      setAreasError(null);
      try {
        const nextAreas = await loadDeliveryAreas(apiFetch, city.id);
        setDeliveryAreas(nextAreas);
        setDeliveryAreaCounts((current) => ({
          ...current,
          [city.id]: nextAreas.length,
        }));
      } catch (reason) {
        setDeliveryAreas([]);
        setAreasError(
          reason instanceof Error ? reason.message : "تعذر تحميل مناطق التوصيل.",
        );
      } finally {
        setAreasLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    if (!cities.length) {
      const timer = window.setTimeout(() => setDeliveryAreaCounts({}), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;

    void Promise.all(
      cities.map(async (city) => {
        try {
          const areas = await loadDeliveryAreas(apiFetch, city.id);
          return [city.id, areas.length] as const;
        } catch {
          return [city.id, 0] as const;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setDeliveryAreaCounts(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [apiFetch, cities]);

  const filteredCities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cities;
    return cities.filter((city) =>
      [city.name, city.name_ar, city.slug].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [cities, query]);
  const totalPages = Math.max(1, Math.ceil(filteredCities.length / citiesPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * citiesPageSize;
  const pagedCities = filteredCities.slice(pageStartIndex, pageStartIndex + citiesPageSize);

  async function toggleCity(city: ServiceCity, checked: boolean) {
    setBusyCityId(city.id);
    try {
      const updated = await saveServiceCity(
        apiFetch,
        { ...payloadFromDraft(cityDraft(city)), is_active: checked },
        city.id,
      );
      setCities((current) => current.map((item) => (item.id === city.id ? updated : item)));
      showSnackbar({ message: checked ? "تم تفعيل المدينة." : "تم تعطيل المدينة." });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث المدينة.",
        tone: "danger",
      });
    } finally {
      setBusyCityId(null);
    }
  }

  function restoreCity(city: ServiceCity, index: number) {
    setCities((current) => {
      if (current.some((item) => item.id === city.id)) return current;
      const next = [...current];
      next.splice(Math.max(0, index), 0, city);
      return next;
    });
  }

  function removeCity(city: ServiceCity) {
    const cityIndex = cities.findIndex((item) => item.id === city.id);

    setBusyCityId(city.id);
    setDeleteCity(null);
    queueUndoableDelete({
      message: `تم حذف ${city.name_ar || city.name}.`,
      onDelete: () => setCities((current) => current.filter((item) => item.id !== city.id)),
      onUndo: () => {
        restoreCity(city, cityIndex);
        setBusyCityId(null);
      },
      onCommit: async () => {
        await deleteServiceCity(apiFetch, city.id);
      },
      onCommitError: (reason) => {
        showSnackbar({
          message: reason instanceof Error ? reason.message : "تعذر حذف المدينة.",
          tone: "danger",
        });
      },
    });
    setBusyCityId(null);
  }

  function openDeliveryAreas(city: ServiceCity) {
    setSelectedCityForAreas(city);
    setAreaFormOpen(false);
    setEditingArea(null);
    setDeleteArea(null);
    void loadAreasForCity(city);
  }

  function closeDeliveryAreas() {
    setSelectedCityForAreas(null);
    setDeliveryAreas([]);
    setAreasError(null);
    setAreaFormOpen(false);
    setEditingArea(null);
    setDeleteArea(null);
  }

  function openCreateAreaForm() {
    setEditingArea(null);
    setAreaFormOpen(true);
  }

  function openEditAreaForm(area: DeliveryArea) {
    setEditingArea(area);
    setAreaFormOpen(true);
  }

  function closeAreaForm() {
    setAreaFormOpen(false);
    setEditingArea(null);
  }

  async function submitArea(draft: AreaDraft) {
    if (!selectedCityForAreas || savingArea) return;
    const validationError = validateAreaDraft(draft);
    if (validationError) {
      showSnackbar({ message: validationError, tone: "danger" });
      return;
    }

    setSavingArea(true);
    try {
      await saveDeliveryArea(
        apiFetch,
        payloadFromAreaDraft(selectedCityForAreas, draft),
        editingArea?.id,
      );
      closeAreaForm();
      await loadAreasForCity(selectedCityForAreas);
      showSnackbar({
        message: editingArea
          ? "تم تحديث منطقة التوصيل."
          : "تمت إضافة منطقة التوصيل.",
        tone: "success",
      });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر حفظ منطقة التوصيل.",
        tone: "danger",
      });
    } finally {
      setSavingArea(false);
    }
  }

  async function toggleArea(area: DeliveryArea, checked: boolean) {
    if (!selectedCityForAreas) return;

    setBusyAreaId(area.id);
    try {
      await saveDeliveryArea(
        apiFetch,
        {
          service_city_id: selectedCityForAreas.id,
          name: area.name,
          center_latitude: area.center_latitude,
          center_longitude: area.center_longitude,
          radius_km: area.radius_km,
          delivery_price: Number(area.delivery_price).toFixed(2),
          is_active: checked,
        },
        area.id,
      );
      await loadAreasForCity(selectedCityForAreas);
      showSnackbar({
        message: checked ? "تم تفعيل منطقة التوصيل." : "تم تعطيل منطقة التوصيل.",
        tone: "success",
      });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث منطقة التوصيل.",
        tone: "danger",
      });
    } finally {
      setBusyAreaId(null);
    }
  }

  async function confirmDeleteArea() {
    if (!selectedCityForAreas || !deleteArea) return;
    const area = deleteArea;

    setBusyAreaId(area.id);
    try {
      await deleteDeliveryArea(apiFetch, area.id);
      setDeleteArea(null);
      await loadAreasForCity(selectedCityForAreas);
      showSnackbar({ message: "تم حذف منطقة التوصيل.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر حذف منطقة التوصيل.",
        tone: "danger",
      });
    } finally {
      setBusyAreaId(null);
    }
  }

  const activeCount = cities.filter((city) => city.is_active).length;
  const linkedMarkets = cities.reduce((total, city) => total + city.market_count, 0);
  const linkedOffers = cities.reduce((total, city) => total + city.offer_count, 0);

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title="المدن"
        description="إدارة المدن التي تحدد ظهور المحلات والمنتجات والعروض داخل تطبيق العميل."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void reload()} disabled={loading} className="h-9 px-4 text-sm">
              <RefreshCw className="size-4" />
              تحديث
            </Button>
          <Button onClick={() => setEditingCity(null)} className="h-9 px-4 text-sm">
            <Plus className="size-4" />
            إضافة مدينة
          </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["المدن النشطة", String(activeCount), MapPinned, "text-primary"],
          ["ارتباطات المحلات", String(linkedMarkets), Building2, "text-emerald-500"],
          ["ارتباطات العروض", String(linkedOffers), Tag, "text-amber-500"],
        ].map(([label, value, Icon, tone]) => {
          const MetricIcon = Icon as typeof MapPinned;
          return (
            <Card key={label as string} className="h-[82px]">
              <div className="flex h-full items-center gap-3 px-5">
                <span className={`rounded-full bg-muted p-3 ${tone}`}><MetricIcon className="size-5" /></span>
                <div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-xl font-bold">{value as string}</p></div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-4 border-b px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-end">
          <div>
            <h2 className="font-semibold">كل المدن</h2>
            <p className="text-xs text-muted-foreground">راجع النطاق الجغرافي والارتباطات وحالة كل مدينة.</p>
          </div>
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث باسم المدينة..."
              className="h-11 pr-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><LoaderCircle className="me-2 size-5 animate-spin" />جاري تحميل المدن...</div>
        ) : error ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-6 text-center"><AlertCircle className="size-8 text-destructive" /><p className="text-sm">{error}</p><Button variant="outline" onClick={() => void reload()}>إعادة المحاولة</Button></div>
        ) : filteredCities.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center"><MapPinned className="size-9 text-muted-foreground" /><p className="font-semibold">لا توجد مدن مطابقة</p><p className="text-sm text-muted-foreground">أضف أول مدينة أو غيّر عبارة البحث.</p></div>
        ) : (
          <div className="grid gap-3 p-4">
            {pagedCities.map((city, index) => {
              const coverage = city.coverages[0];
              return (
                <Card key={city.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_320px_220px] xl:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                      {pageStartIndex + index + 1}
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPinned className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{city.name_ar || city.name}</h3>
                        <Badge tone={city.is_active ? "green" : "red"}>
                          {city.is_active ? "مفعلة" : "معطلة"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        نطاق التغطية {coverage ? `${Number(coverage.radius_km).toLocaleString("ar-EG-u-nu-latn")} كم` : "غير محدد"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">{coverage ? `${Number(coverage.radius_km).toLocaleString("ar-EG-u-nu-latn")} كم` : "-"}</div>
                      <div className="text-xs text-muted-foreground">النطاق</div>
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">
                        {deliveryAreaCounts[city.id] ?? "…"}
                      </div>
                      <div className="text-xs text-muted-foreground">مناطق التوصيل</div>
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">{city.market_count}</div>
                      <div className="text-xs text-muted-foreground">المحلات</div>
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">{city.offer_count}</div>
                      <div className="text-xs text-muted-foreground">العروض</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                    <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
                      <Switch checked={city.is_active} disabled={busyCityId === city.id} onCheckedChange={(checked) => void toggleCity(city, checked)} />
                      <span className="text-xs font-semibold">{city.is_active ? "مفعّلة" : "معطلة"}</span>
                    </div>
                    <Button type="button" variant="outline" onClick={() => openDeliveryAreas(city)}>
                      <MapPin className="size-4" />
                      مناطق التوصيل
                    </Button>
                    <Button size="icon" variant="outline" title="تعديل" onClick={() => setEditingCity(city)} aria-label={`تعديل ${city.name_ar || city.name}`}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="icon" variant="outline" title="حذف" disabled={busyCityId === city.id} onClick={() => setDeleteCity(city)} aria-label={`حذف ${city.name_ar || city.name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
            <Pagination
              text={`عرض ${pagedCities.length} من ${filteredCities.length} نتيجة`}
              pages={`${safeCurrentPage} / ${totalPages}`}
              previousDisabled={safeCurrentPage === 1}
              nextDisabled={safeCurrentPage === totalPages}
              onPrevious={() =>
                setCurrentPage((page) =>
                  Math.max(1, Math.min(page, totalPages) - 1),
                )
              }
              onNext={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, Math.min(page, totalPages) + 1),
                )
              }
            />
          </div>
        )}
      </Card>

      {editingCity !== undefined ? (
        <CityDialog
          city={editingCity ?? undefined}
          onClose={() => setEditingCity(undefined)}
          onSaved={(savedCity) => {
            setCities((current) => {
              const exists = current.some((city) => city.id === savedCity.id);
              return exists
                ? current.map((city) => (city.id === savedCity.id ? savedCity : city))
                : [savedCity, ...current];
            });
            setEditingCity(undefined);
            showSnackbar({ message: editingCity ? "تم تحديث المدينة." : "تمت إضافة المدينة." });
          }}
        />
      ) : null}
      {deleteCity ? (
        <CityDeleteDialog
          city={deleteCity}
          busy={busyCityId === deleteCity.id}
          onCancel={() => setDeleteCity(null)}
          onConfirm={() => removeCity(deleteCity)}
        />
      ) : null}
      {selectedCityForAreas ? (
        <DeliveryAreasDialog
          city={selectedCityForAreas}
          areas={deliveryAreas}
          loading={areasLoading}
          loadError={areasError}
          areaFormOpen={areaFormOpen}
          editingArea={editingArea}
          savingArea={savingArea}
          busyAreaId={busyAreaId}
          onClose={closeDeliveryAreas}
          onReload={() => void loadAreasForCity(selectedCityForAreas)}
          onOpenCreate={openCreateAreaForm}
          onEditArea={openEditAreaForm}
          onCancelForm={closeAreaForm}
          onSubmitArea={(draft) => void submitArea(draft)}
          onToggleArea={(area, checked) => void toggleArea(area, checked)}
          onRequestDelete={setDeleteArea}
        />
      ) : null}
      {deleteArea ? (
        <AreaDeleteDialog
          area={deleteArea}
          busy={busyAreaId === deleteArea.id}
          onCancel={() => setDeleteArea(null)}
          onConfirm={() => void confirmDeleteArea()}
        />
      ) : null}
    </div>
  );
}
