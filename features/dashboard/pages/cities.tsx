"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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

const defaultDraft: CityDraft = {
  nameAr: "",
  latitude: "30.0444000",
  longitude: "31.2357000",
  radiusKm: "25",
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

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-md bg-muted px-3 py-2">
                      <div className="font-bold">{coverage ? `${Number(coverage.radius_km).toLocaleString("ar-EG-u-nu-latn")} كم` : "-"}</div>
                      <div className="text-xs text-muted-foreground">النطاق</div>
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
    </div>
  );
}
