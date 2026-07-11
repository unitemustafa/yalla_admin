"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
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
  deleteServiceCity,
  loadDeliveryAreas,
  saveDeliveryArea,
  type DeliveryArea,
  saveServiceCity,
  type ServiceCity,
  type ServiceCityPayload,
  useServiceCities,
} from "../cities-api";
import { useSnackbar } from "../snackbar";
import { useAuth } from "@/features/auth/auth-provider";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";

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

const defaultDraft: CityDraft = {
  nameAr: "",
  latitude: "30.0444000",
  longitude: "31.2357000",
  radiusKm: "25",
  active: true,
};

function cityDraft(city?: ServiceCity): CityDraft {
  return {
    nameAr: city?.name || defaultDraft.nameAr,
    latitude: city?.center_latitude ?? defaultDraft.latitude,
    longitude: city?.center_longitude ?? defaultDraft.longitude,
    radiusKm: city?.radius_km ?? defaultDraft.radiusKm,
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

function payloadFromCity(city: ServiceCity): ServiceCityPayload {
  return {
    name: city.name,
    center_latitude: city.center_latitude ?? defaultDraft.latitude,
    center_longitude: city.center_longitude ?? defaultDraft.longitude,
    radius_km: city.radius_km ?? defaultDraft.radiusKm,
    is_active: city.is_active,
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
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latitude = Number(draft.latitude);
  const longitude = Number(draft.longitude);
  const radiusKm = Number(draft.radiusKm);
  const valid =
    draft.nameAr.trim().length > 0 &&
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
                <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating} className="h-11">
                  {locating ? <LoaderCircle className="size-4 animate-spin" /> : <MapPin className="size-4" />}
                  {locating ? "جاري تحديد الموقع..." : "استخدام موقعي الحالي"}
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

function DeliveryAreasDialog({
  city,
  areas,
  loading,
  loadError,
  busyAreaId,
  onClose,
  onReload,
  onToggleArea,
}: {
  city: ServiceCity;
  areas: DeliveryArea[];
  loading: boolean;
  loadError: string | null;
  busyAreaId: number | null;
  onClose: () => void;
  onReload: () => void;
  onToggleArea: (area: DeliveryArea, checked: boolean) => void;
}) {
  useLockedPageScroll();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-areas-dialog-title"
        className="max-h-[88vh] w-full max-w-[940px] overflow-y-auto rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-background px-6 py-5">
          <div>
            <h2 id="delivery-areas-dialog-title" className="text-xl font-bold">
              مناطق التوصيل - {city.name}
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
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[680px] text-sm">
                <colgroup>
                  <col className="w-[220px]" />
                  <col className="w-[180px]" />
                  <col className="w-[120px]" />
                  <col className="w-[210px]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-muted/35 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-start">اسم المنطقة</th>
                    <th className="px-4 py-3 text-start">سعر التوصيل</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start" aria-label="تعطيل أو تفعيل" />
                  </tr>
                </thead>
                <tbody>
                  {areas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <div className="flex min-h-48 flex-col items-center justify-center gap-2 bg-muted/10 px-4 text-center">
                          <MapPin className="size-8 text-muted-foreground" />
                          <p className="font-semibold">لا توجد مناطق توصيل لهذه المدينة</p>
                          <p className="text-sm text-muted-foreground">أضف منطقة توصيل ثابتة السعر.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    areas.map((area) => (
                      <tr key={area.id} className="border-b last:border-0">
                        <td className="px-4 py-4 font-semibold">{area.name}</td>
                        <td className="px-4 py-4">{formatMoney(area.delivery_price)}</td>
                        <td className="px-4 py-4">
                          <Badge tone={area.is_active ? "green" : "red"}>
                            {area.is_active ? "مفعلة" : "معطلة"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap">
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
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
  const { cities, setCities, loading, error, reload } = useServiceCities();
  const [query, setQuery] = useState("");
  const [editingCity, setEditingCity] = useState<ServiceCity | null | undefined>();
  const [deleteCity, setDeleteCity] = useState<ServiceCity | null>(null);
  const [busyCityId, setBusyCityId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCityForAreas, setSelectedCityForAreas] = useState<ServiceCity | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [busyAreaId, setBusyAreaId] = useState<number | null>(null);

  const loadAreasForCity = useCallback(
    async (city: ServiceCity) => {
      setAreasLoading(true);
      setAreasError(null);
      try {
        const nextAreas = await loadDeliveryAreas(apiFetch, city.id);
        setDeliveryAreas(nextAreas);
        setCities((current) =>
          current.map((item) =>
            item.id === city.id ? { ...item, delivery_area_count: nextAreas.length } : item,
          ),
        );
      } catch (reason) {
        setDeliveryAreas([]);
        setAreasError(
          reason instanceof Error ? reason.message : "تعذر تحميل مناطق التوصيل.",
        );
      } finally {
        setAreasLoading(false);
      }
    },
    [apiFetch, setCities],
  );

  const filteredCities = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cities;
    return cities.filter((city) =>
      city.name.toLowerCase().includes(normalized),
    );
  }, [cities, query]);
  const totalPages = Math.max(1, Math.ceil(filteredCities.length / citiesPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * citiesPageSize;
  const pagedCities = filteredCities.slice(pageStartIndex, pageStartIndex + citiesPageSize);

  async function toggleCity(city: ServiceCity, checked: boolean) {
    if (busyCityId === city.id) return;
    setBusyCityId(city.id);
    try {
      const updated = await saveServiceCity(
        apiFetch,
        { is_active: checked },
        city.id,
      );
      setCities((current) => current.map((item) => (item.id === city.id ? updated : item)));
      showSnackbar({
        message: checked ? "تم تفعيل المدينة." : "تم تعطيل المدينة.",
        tone: checked ? "success" : "danger",
      });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث المدينة.",
        tone: "danger",
      });
    } finally {
      setBusyCityId(null);
    }
  }

  async function restoreDeletedCity(city: ServiceCity, index: number) {
    try {
      const restoredCity = await saveServiceCity(apiFetch, payloadFromCity(city));
      setCities((current) => {
        if (current.some((item) => item.id === restoredCity.id)) return current;
        const next = [...current];
        next.splice(Math.max(0, index), 0, {
          ...restoredCity,
          delivery_area_count: city.delivery_area_count,
          market_count: city.market_count,
          offer_count: city.offer_count,
        });
        return next;
      });
      showSnackbar({ message: `تم التراجع واستعادة ${city.name}.`, tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر التراجع عن حذف المدينة.",
        tone: "danger",
      });
    }
  }

  async function removeCity(city: ServiceCity) {
    if (busyCityId === city.id) return;
    const cityIndex = cities.findIndex((item) => item.id === city.id);
    setBusyCityId(city.id);
    try {
      await deleteServiceCity(apiFetch, city.id);
      setCities((current) => current.filter((item) => item.id !== city.id));
      setDeleteCity(null);
      showSnackbar({
        message: `تم حذف ${city.name}.`,
        tone: "danger",
        actionLabel: "تراجع",
        onAction: () => void restoreDeletedCity(city, cityIndex),
      });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر حذف المدينة.",
        tone: "danger",
      });
    } finally {
      setBusyCityId(null);
    }
  }

  function openDeliveryAreas(city: ServiceCity) {
    setSelectedCityForAreas(city);
    void loadAreasForCity(city);
  }

  function closeDeliveryAreas() {
    setSelectedCityForAreas(null);
    setDeliveryAreas([]);
    setAreasError(null);
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
        tone: checked ? "success" : "danger",
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

  const activeCount = cities.filter((city) => city.is_active).length;
  const deliveryAreaTotal = cities.reduce((total, city) => total + city.delivery_area_count, 0);
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

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {[
          ["المدن النشطة", String(activeCount), MapPinned, "text-primary"],
          ["مناطق التوصيل", String(deliveryAreaTotal), MapPin, "text-sky-500"],
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
        <div className="grid gap-4 border-b px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:items-end">
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
              return (
                <Card key={city.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,420px)_minmax(340px,auto)] xl:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                      {pageStartIndex + index + 1}
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPinned className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{city.name}</h3>
                        <Badge tone={city.is_active ? "green" : "red"}>
                          {city.is_active ? "مفعلة" : "معطلة"}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        نطاق التغطية {formatRadius(city.radius_km)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">{city.delivery_area_count}</div>
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

                  <div className="flex items-center justify-start gap-2 whitespace-nowrap xl:justify-end">
                    <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
                      <Switch checked={city.is_active} disabled={busyCityId === city.id} onCheckedChange={(checked) => void toggleCity(city, checked)} />
                      <span className="text-xs font-semibold">{city.is_active ? "مفعّلة" : "معطلة"}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2.5"
                      onClick={() => openDeliveryAreas(city)}
                    >
                      <MapPin className="size-4" />
                      مناطق التوصيل
                    </Button>
                    <Button size="icon" variant="outline" title="تعديل" onClick={() => setEditingCity(city)} aria-label={`تعديل ${city.name}`}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="icon" variant="outline" title="حذف" disabled={busyCityId === city.id} onClick={() => setDeleteCity(city)} aria-label={`حذف ${city.name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
        <ConfirmDeleteDialog
          title="حذف المدينة"
          description={`هل تريد حذف المدينة ${deleteCity.name}؟`}
          busy={busyCityId === deleteCity.id}
          onCancel={() => setDeleteCity(null)}
          onConfirm={() => void removeCity(deleteCity)}
        />
      ) : null}
      {selectedCityForAreas ? (
        <DeliveryAreasDialog
          city={selectedCityForAreas}
          areas={deliveryAreas}
          loading={areasLoading}
          loadError={areasError}
          busyAreaId={busyAreaId}
          onClose={closeDeliveryAreas}
          onReload={() => void loadAreasForCity(selectedCityForAreas)}
          onToggleArea={(area, checked) => void toggleArea(area, checked)}
        />
      ) : null}
    </div>
  );
}
