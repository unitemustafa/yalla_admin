"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Edit3, ImagePlus, LoaderCircle, MapPin, Plus, RefreshCw, Search, Store, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { PageLoadError, PageLoadingState } from "../load-error-card";
import { AppSelect, Badge, Button, Card, DataTable, Input, PageTitle, Switch } from "../primitives";
import { DashboardImage } from "../dashboard-image";
import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import {
  loadServiceCities,
  type ServiceCity,
} from "../markets-api";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { cn } from "@/lib/utils";

type Classification = { id: number; name: string; classification_type?: string };
type MarketScope = "general" | "service_city";
type MarketServiceCity = Partial<ServiceCity> & {
  id?: number | string;
  name?: string | null;
};
type Market = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  scope?: MarketScope;
  status: "active" | "inactive";
  is_popular?: boolean;
  classification?: Classification;
  service_city_ids?: Array<number | string>;
  service_cities?: MarketServiceCity[];
};

async function json(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return errorMessage(value[0], fallback);
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = errorMessage(item, "");
      if (message) return message;
    }
  }
  return fallback;
}

function uniqueNumbers(values: unknown[]) {
  const ids: number[] = [];
  for (const value of values) {
    const id = Number(value);
    if (Number.isFinite(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function listFromResponse(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as { results?: unknown; data?: unknown };
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.data)) return record.data;
    if (record.data && typeof record.data === "object") {
      const data = record.data as { results?: unknown };
      if (Array.isArray(data.results)) return data.results;
    }
  }
  return [];
}

function classificationTypeLabel(value: string | undefined) {
  if (value === "popular") return "شائعة";
  if (value === "featured") return "مميزة";
  return "عادية";
}

function classificationLabel(market: Market) {
  const classification = market.classification;
  if (!classification) return "بدون تصنيف";

  return `${classification.name} — ${classificationTypeLabel(classification.classification_type)}`;
}

function normalizeClassification(value: unknown): Classification | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const classification_type =
    record.classification_type === "popular" ||
    record.classification_type === "featured" ||
    record.classification_type === "normal"
      ? record.classification_type
      : "normal";

  if (!Number.isFinite(id) || !name) return null;

  return { id, name, classification_type };
}

function serviceCityName(city: Pick<ServiceCity, "id" | "name"> | MarketServiceCity) {
  return city.name || `مدينة رقم ${city.id}`;
}

function marketServiceCityIds(market: Market): number[] {
  const values: unknown[] = [];
  if (Array.isArray(market.service_city_ids)) values.push(...market.service_city_ids);
  if (Array.isArray(market.service_cities)) {
    for (const city of market.service_cities) values.push(city.id);
  }
  return uniqueNumbers(values);
}

function marketCityNames(market: Market, serviceCities: ServiceCity[]) {
  const names = new Map<number, string>();
  for (const city of serviceCities) names.set(city.id, serviceCityName(city));
  if (Array.isArray(market.service_cities)) {
    for (const city of market.service_cities) {
      const id = Number(city.id);
      if (Number.isFinite(id)) names.set(id, serviceCityName(city));
    }
  }

  return marketServiceCityIds(market).map((id) => names.get(id) || `مدينة رقم ${id}`);
}

function MarketLocationsCell({
  market,
  serviceCities,
}: {
  market: Market;
  serviceCities: ServiceCity[];
}) {
  if (market.scope === "general") {
    return (
      <div className="grid gap-1 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">المدن: </span>
          عام
        </p>
      </div>
    );
  }

  const cityNames = marketCityNames(market, serviceCities);

  return (
    <div className="grid gap-1 text-sm text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">المدن: </span>
        {cityNames.length ? cityNames.join("، ") : "لا توجد مدن محددة"}
      </p>
    </div>
  );
}

function MarketActionButton({
  label,
  tone = "default",
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-accent ${tone === "danger" ? "border-destructive/35 text-destructive hover:bg-destructive/10" : "border-border text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function MarketDialog({
  market,
  serviceCities,
  serviceCitiesLoading,
  serviceCitiesError,
  classifications,
  onClose,
  onSaved,
  onReloadServiceCities,
}: {
  market?: Market;
  serviceCities: ServiceCity[];
  serviceCitiesLoading: boolean;
  serviceCitiesError: string;
  classifications: Classification[];
  onClose: () => void;
  onSaved: (market: Market) => void;
  onReloadServiceCities: () => void;
}) {
  const { apiFetch } = useAuth();
  const initialScope: MarketScope = market?.scope === "service_city" ? "service_city" : "general";
  const [name, setName] = useState(market?.name ?? "");
  const [description, setDescription] = useState(market?.description ?? "");
  const [isPopular, setIsPopular] = useState(market?.is_popular ?? false);
  const [classificationId, setClassificationId] = useState(String(market?.classification?.id ?? classifications[0]?.id ?? ""));
  const [showInGeneral, setShowInGeneral] = useState(initialScope === "general");
  const [showInServiceCities, setShowInServiceCities] = useState(initialScope === "service_city");
  const [selectedServiceCityIds, setSelectedServiceCityIds] = useState<number[]>(() =>
    initialScope === "service_city" && market ? marketServiceCityIds(market).slice(0, 1) : [],
  );
  const [imagePreview, setImagePreview] = useState(market?.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageName, setImageName] = useState(market?.image ? "صورة المحل الحالية" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validBase = Boolean(name.trim() && classificationId && (showInGeneral || showInServiceCities));

  const availableServiceCities = useMemo(() => {
    const cities = new Map<number, ServiceCity>();
    for (const city of serviceCities) {
      if (city.is_active) cities.set(city.id, city);
    }
    if (Array.isArray(market?.service_cities)) {
      for (const city of market.service_cities) {
        const id = Number(city.id);
        if (!Number.isFinite(id) || !city.name) continue;
        cities.set(id, {
          id,
          name: city.name,
          center_latitude: city.center_latitude ?? null,
          center_longitude: city.center_longitude ?? null,
          radius_km: city.radius_km ?? null,
          delivery_price: city.delivery_price,
          is_active: city.is_active !== false,
        });
      }
    }
    return Array.from(cities.values());
  }, [market, serviceCities]);

  function setGeneralVisibility(enabled: boolean) {
    setShowInGeneral(enabled);
    if (enabled) {
      setShowInServiceCities(false);
      setSelectedServiceCityIds([]);
    }
    setError("");
  }

  function setServiceCityVisibility(enabled: boolean) {
    setShowInServiceCities(enabled);
    if (enabled) setShowInGeneral(false);
    if (!enabled) setSelectedServiceCityIds([]);
    setError("");
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageFile(file);
    setImageName(file.name);
    event.target.value = "";
  }

  function removeSelectedImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(market?.image ?? "");
    setImageFile(null);
    setImageName(market?.image ? "صورة المحل الحالية" : "");
  }

  useEffect(
    () => () => {
      if (imageFile && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imageFile, imagePreview],
  );

  function toggleServiceCity(cityId: number) {
    setError("");
    if (selectedServiceCityIds.includes(cityId)) {
      setSelectedServiceCityIds((current) => current.filter((id) => id !== cityId));
      return;
    }

    setSelectedServiceCityIds([cityId]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setError("اسم المحل مطلوب");
      return;
    }
    if (!classificationId) {
      setError("التصنيف مطلوب");
      return;
    }
    if (!showInGeneral && !showInServiceCities) {
      setError("اختر نطاق ظهور المحل");
      return;
    }
    if (showInGeneral && showInServiceCities) {
      setError("اختر العام أو مدينة واحدة فقط.");
      return;
    }

    const basePayload = {
      classification_id: Number(classificationId),
      name: name.trim(),
      description: description.trim(),
      is_popular: isPopular,
      scope: showInGeneral ? "general" as const : "service_city" as const,
      delivery_area_ids: [],
      service_city_ids: [] as number[],
    };

    async function saveMarket(payload: typeof basePayload) {
      const path = market ? `home/markets/${market.id}/` : "home/markets/";
      const method = market ? "PATCH" : "POST";
      const response = imageFile
        ? await apiFetch(path, {
            method,
            body: (() => {
              const formData = new FormData();
              formData.set("classification_id", String(payload.classification_id));
              formData.set("name", payload.name);
              formData.set("description", payload.description);
              formData.set("is_popular", String(payload.is_popular));
              formData.set("scope", payload.scope);
              payload.service_city_ids.forEach((serviceCityId) => {
                formData.append("service_city_ids", String(serviceCityId));
              });
              formData.set("image", imageFile);
              return formData;
            })(),
          })
        : await apiFetch(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await json(response);
      if (!response.ok || !data || typeof data !== "object") {
        throw new Error(errorMessage(data, "تعذر حفظ المحل."));
      }
      onSaved(data as Market);
    }

    if (!showInServiceCities) {
      setSaving(true);
      setError("");
      try {
        await saveMarket(basePayload);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "تعذر حفظ المحل.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const serviceCityIds = uniqueNumbers(selectedServiceCityIds);
    if (!serviceCityIds.length) {
      setError("اختر مدينة واحدة على الأقل");
      return;
    }
    if (serviceCityIds.length > 1) {
      setError("يمكن اختيار مدينة واحدة فقط للمحل.");
      return;
    }

    setSaving(true);
    setError("");
    const payload = {
      ...basePayload,
      service_city_ids: serviceCityIds,
    };

    try {
      await saveMarket(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المحل.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section role="dialog" aria-modal="true" className="mx-auto w-full max-w-4xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b bg-muted/20 px-6 py-5">
          <div><h2 className="text-xl font-bold">{market ? "تعديل المحل" : "إضافة محل"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد نطاق ظهور المحل، عام أو مرتبط بمدن خدمة.</p></div>
          <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 sm:col-span-2 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
              <label className="group relative flex aspect-[16/9] min-h-[138px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                <input accept="image/*" className="sr-only" type="file" onChange={handleImageChange} />
                {imagePreview ? <DashboardImage src={imagePreview} placeholderType="store" alt="معاينة صورة المحل" width={640} height={360} sizes="260px" className="absolute inset-0 size-full" imageClassName="object-cover" /> : <span className="flex flex-col items-center gap-2 px-5 text-sm text-muted-foreground"><span className="flex size-10 items-center justify-center rounded-md bg-muted/50"><ImagePlus className="size-5 text-primary" /></span><span className="font-semibold text-foreground">اختيار صورة المحل</span></span>}
              </label>
              <div className="flex min-w-0 flex-col gap-3"><div><div className="text-sm font-semibold">صورة المحل</div><p className="mt-1 text-xs leading-5 text-muted-foreground">استخدم صورة أفقية واضحة للمحل. الصيغ المدعومة PNG, JPG, WEBP.</p></div><div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground"><span className="min-w-0 truncate">{imageName || "لم يتم اختيار صورة"}</span>{imagePreview ? <button type="button" onClick={removeSelectedImage} className="inline-flex shrink-0 items-center gap-1 font-semibold text-destructive transition hover:text-destructive/80"><X className="size-3.5" />حذف</button> : null}</div></div>
            </div>
            <label className="grid gap-2 text-sm font-semibold">اسم المحل *<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold">فئة المحل *<AppSelect value={classificationId} onValueChange={setClassificationId} options={classifications.map((item) => ({ value: String(item.id), label: `${item.name} - ${classificationTypeLabel(item.classification_type)}` }))} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">وصف المحل<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15" placeholder="اكتب وصفًا مختصرًا للمحل" /></label>
            <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40 sm:col-span-2">
              <span>
                <span className="block text-sm font-semibold">محل شائع</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">يظهر بأولوية داخل فئته في صفحة المتجر.</span>
              </span>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} aria-label="تحديد المحل كشائع" />
            </label>
            <div className="grid gap-3 sm:col-span-2">
              <div className="text-sm font-medium">نطاق ظهور المحل *</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                  <span className="block text-sm font-semibold">يظهر في العام</span>
                  <Switch checked={showInGeneral} disabled={showInServiceCities} onCheckedChange={setGeneralVisibility} />
                </label>
                <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-md border bg-background px-4 py-3 shadow-sm transition hover:border-primary/40">
                  <span className="block text-sm font-semibold">يظهر في المدن</span>
                  <Switch checked={showInServiceCities} disabled={showInGeneral} onCheckedChange={setServiceCityVisibility} />
                </label>
              </div>
            </div>
            {showInServiceCities ? (
            <div className="grid gap-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">المدن</div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold leading-none text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  {selectedServiceCityIds.length} مدينة
                </span>
              </div>
                {serviceCitiesLoading ? (
                  <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground"><LoaderCircle className="me-2 size-4 animate-spin" />جاري تحميل المدن...</div>
                ) : serviceCitiesError ? (
                  <div className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{serviceCitiesError}</span><Button type="button" variant="outline" size="sm" onClick={onReloadServiceCities}>إعادة المحاولة</Button></div>
                ) : availableServiceCities.length ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {availableServiceCities.map((city) => {
                      const selected = selectedServiceCityIds.includes(city.id);
                      return (
                        <button
                          key={city.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={selectedServiceCityIds.length > 0 && !selected}
                          onClick={() => toggleServiceCity(city.id)}
                          className={cn(
                            "flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold shadow-sm transition",
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : selectedServiceCityIds.length > 0
                                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60"
                                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                          )}
                        >
                          <span className="truncate">{serviceCityName(city)}</span>
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-transparent")}>
                            <CheckCircle2 className="size-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-14 items-center justify-center rounded-md border bg-muted/20 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-3 xl:col-span-4">لا توجد مدن خدمة نشطة.</div>
                )}
            </div>
            ) : null}
            {error ? <p className="flex gap-2 text-sm text-destructive sm:col-span-2"><AlertCircle className="size-4" />{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!validBase || saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "جاري الحفظ..." : "حفظ المحل"}</Button></div>
        </form>
      </section>
    </div>
  );
}

function MissingClassificationsDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missing-market-classifications-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b bg-muted/20 px-6 py-5">
          <div>
            <h2
              id="missing-market-classifications-title"
              className="text-xl font-bold leading-7"
            >
              أنشئ فئة محل أولًا
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              أنشئ فئة محل أولًا مثل مطاعم أو ملابس قبل إضافة محل جديد.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => {
              window.location.href = "/items/categories";
            }}
          >
            <Plus className="size-4" />
            إضافة فئة
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ShopsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [serviceCities, setServiceCities] = useState<ServiceCity[]>([]);
  const [serviceCitiesLoading, setServiceCitiesLoading] = useState(true);
  const [serviceCitiesError, setServiceCitiesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dialogMarket, setDialogMarket] = useState<Market | null | undefined>();
  const [deleteMarket, setDeleteMarket] = useState<Market | null>(null);

  const loadServiceCityOptions = useCallback(async () => {
    setServiceCitiesLoading(true);
    setServiceCitiesError("");
    try {
      const cities = await loadServiceCities(apiFetch);
      setServiceCities(cities);
    } catch (reason) {
      setServiceCitiesError(reason instanceof Error ? reason.message : "تعذر تحميل المدن.");
    } finally {
      setServiceCitiesLoading(false);
    }
  }, [apiFetch]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [marketsResponse, classificationsResponse] = await Promise.all([
        apiFetch("home/markets/"),
        apiFetch("home/market-classifications/"),
      ]);
      const [marketsData, classificationsData] = await Promise.all([json(marketsResponse), json(classificationsResponse)]);
      if (!marketsResponse.ok) throw new Error(errorMessage(marketsData, "تعذر تحميل المحلات."));
      if (!classificationsResponse.ok) throw new Error(errorMessage(classificationsData, "تعذر تحميل التصنيفات."));
      setMarkets(listFromResponse(marketsData) as Market[]);
      setClassifications(
        listFromResponse(classificationsData)
          .map(normalizeClassification)
          .filter((item): item is Classification => item !== null),
      );
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحميل المحلات."); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { void Promise.resolve().then(loadServiceCityOptions); }, [loadServiceCityOptions]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? markets.filter((market) => [market.name, classificationLabel(market)].some((item) => item.toLowerCase().includes(value))) : markets;
  }, [markets, query]);

  function restoreMarket(market: Market, index: number) {
    setMarkets((current) => {
      if (current.some((item) => item.id === market.id)) return current;
      const next = [...current];
      next.splice(Math.max(0, index), 0, market);
      return next;
    });
  }

  function remove(market: Market) {
    const marketIndex = markets.findIndex((item) => item.id === market.id);
    setDeleteMarket(null);

    queueUndoableDelete({
      message: `تم حذف ${market.name}.`,
      onDelete: () => setMarkets((current) => current.filter((item) => item.id !== market.id)),
      onUndo: () => restoreMarket(market, marketIndex),
      onCommit: async () => {
        const response = await apiFetch(`home/markets/${market.id}/`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error(errorMessage(await json(response), "تعذر حذف المحل."));
        }
      },
      onCommitError: (reason) => {
        showSnackbar({
          message: reason instanceof Error ? reason.message : "تعذر حذف المحل.",
          tone: "danger",
        });
      },
    });
  }

  async function toggleMarketActive(market: Market, nextActive: boolean) {
    const nextStatus = nextActive ? "active" : "inactive";
    setMarkets((current) =>
      current.map((item) => item.id === market.id ? { ...item, status: nextStatus } : item),
    );

    try {
      const response = await apiFetch(`home/markets/${market.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await json(response);
      if (!response.ok || !data || typeof data !== "object") {
        throw new Error(errorMessage(data, "تعذر تحديث حالة المحل."));
      }
      setMarkets((current) =>
        current.map((item) => item.id === market.id ? data as Market : item),
      );
      showSnackbar({
        message: nextActive ? `تم تفعيل المحل ${market.name}.` : `تم تعطيل المحل ${market.name}.`,
        tone: nextActive ? "success" : "danger",
      });
    } catch (reason) {
      setMarkets((current) =>
        current.map((item) => item.id === market.id ? market : item),
      );
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث حالة المحل.",
        tone: "danger",
      });
    }
  }

  return (
    <div className="px-6 py-6">
      <PageTitle title="المحلات" description="إدارة المحلات وربط ظهور منتجاتها بالمدن." actions={<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" className="h-9 px-4 text-sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />تحديث</Button><Button className="h-9 px-4 text-sm" onClick={() => setDialogMarket(null)}><Plus className="size-4" />إضافة محل</Button></div>} />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[["إجمالي المحلات", markets.length, Store], ["المحلات النشطة", markets.filter((item) => item.status === "active").length, Store], ["مدن الظهور", new Set(markets.flatMap((item) => marketServiceCityIds(item))).size, MapPin]].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof Store; return <Card key={label as string} className="h-[80px]"><div className="flex h-full items-center gap-3 px-5"><span className="rounded-full bg-primary/10 p-3 text-primary"><MetricIcon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-xl font-bold">{value as number}</p></div></div></Card>; })}
      </div>
      {!loading && !error && markets.length === 0 ? (
        <Card className="mt-6 flex min-h-[420px] items-center justify-center bg-card shadow">
          <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Store className="size-8" />
            </div>
            <h2 className="mt-6 text-xl font-semibold leading-7">لا توجد محلات حتى الآن</h2>
            <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
              سيظهر هنا أول محل تنشئه وتربطه بمدن الظهور.
            </p>
            <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
              <Button type="button" className="h-10 px-4" onClick={() => setDialogMarket(null)}>
                <Plus className="size-4" />
                إنشاء أول محل
              </Button>
            </div>
          </div>
        </Card>
      ) : (
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">كل المحلات</h2><p className="text-xs text-muted-foreground">المنتجات ترث نطاق الظهور من المحل.</p></div>
          <div className="relative w-full sm:w-[700px]"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 ps-9" placeholder="ابحث عن محل..." /></div>
        </div>
        {loading ? <PageLoadingState /> : error ? <PageLoadError onRetry={() => void load()} /> : <DataTable minWidth={1060} columnWidths={[80, 310, 170, 280, 245]} headers={["", "المحل", "الفئة", "المدن", ""]} rows={filtered.map((market, index) => [
          <span key="index" className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{index + 1}</span>,
          <div key="name" className="flex min-w-0 items-center gap-2.5 py-1"><DashboardImage src={market.image} placeholderType="store" alt="صورة المتجر" width={52} height={52} sizes="52px" className="size-[52px] shrink-0 rounded-md border bg-muted/35 shadow-sm" imageClassName="object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{market.name}</p><span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold ${market.status === "active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>{market.status === "active" ? "مفعلة" : "معطلة"}</span>{market.is_popular ? <span className="inline-flex rounded-md border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">شائع</span> : null}</div><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{market.description || "لا يوجد وصف للمحل."}</p></div></div>,
          <Badge key="classification">{classificationLabel(market)}</Badge>,
          <MarketLocationsCell key="locations" market={market} serviceCities={serviceCities} />,
          <div key="actions" className="flex min-w-[225px] items-center justify-end gap-2"><div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold"><span>{market.status === "active" ? "مفعلة" : "معطلة"}</span><Switch checked={market.status === "active"} onCheckedChange={(checked) => void toggleMarketActive(market, checked)} aria-label={`تفعيل المحل ${market.name}`} /></div><MarketActionButton label={`تعديل ${market.name}`} onClick={() => setDialogMarket(market)}><Edit3 className="size-4" /></MarketActionButton><MarketActionButton tone="danger" label={`حذف ${market.name}`} onClick={() => setDeleteMarket(market)}><Trash2 className="size-4" /></MarketActionButton></div>,
        ])} />}
      </Card>
      )}
      {deleteMarket ? <ConfirmDeleteDialog title="حذف المحل" description={`هل تريد حذف المحل ${deleteMarket.name}؟`} busy={false} onCancel={() => setDeleteMarket(null)} onConfirm={() => remove(deleteMarket)} /> : null}
      {dialogMarket !== undefined ? (
        classifications.length ? (
          <MarketDialog market={dialogMarket ?? undefined} serviceCities={serviceCities} serviceCitiesLoading={serviceCitiesLoading} serviceCitiesError={serviceCitiesError} classifications={classifications} onReloadServiceCities={() => void loadServiceCityOptions()} onClose={() => setDialogMarket(undefined)} onSaved={(saved) => { setMarkets((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]); setDialogMarket(undefined); showSnackbar({ message: "تم حفظ المحل وربطه بمدن الظهور." }); }} />
        ) : (
          <MissingClassificationsDialog onClose={() => setDialogMarket(undefined)} />
        )
      ) : null}
    </div>
  );
}
