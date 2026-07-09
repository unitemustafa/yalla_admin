"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit3, LoaderCircle, MapPin, Plus, Search, Store, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { AppSelect, Badge, Button, Card, DataTable, Input, PageTitle, Switch } from "../primitives";
import {
  loadServiceCities,
  type ServiceCity,
} from "../markets-api";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";

type Classification = { id: number; name: string; classification_type?: string };
type MarketScope = "general" | "service_city";
type MarketServiceCity = Partial<ServiceCity> & {
  id?: number | string;
  name?: string | null;
};
type Market = {
  id: number;
  name: string;
  scope?: MarketScope;
  status: "active" | "inactive";
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

function classificationName(market: Market) {
  return market.classification?.name || "بدون تصنيف";
}

function classificationTypeLabel(value: string | undefined) {
  if (value === "popular") return "شائعة";
  if (value === "featured") return "مميزة";
  return "عادية";
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
  const [classificationId, setClassificationId] = useState(String(market?.classification?.id ?? classifications[0]?.id ?? ""));
  const [selectedScope, setSelectedScope] = useState<MarketScope>(initialScope);
  const [selectedServiceCityIds, setSelectedServiceCityIds] = useState<number[]>(() => initialScope === "service_city" && market ? marketServiceCityIds(market) : []);
  const [active, setActive] = useState(market?.status !== "inactive");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validBase = Boolean(name.trim() && classificationId && selectedScope);

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

  const selectedCityNames = selectedServiceCityIds.map((id) => {
    const city = availableServiceCities.find((item) => item.id === id);
    return city ? serviceCityName(city) : `مدينة رقم ${id}`;
  });

  function changeScope(nextScope: MarketScope) {
    setSelectedScope(nextScope);
    setError("");
    if (nextScope === "general") {
      setSelectedServiceCityIds([]);
    }
  }

  function toggleServiceCity(cityId: number) {
    setError("");
    if (selectedServiceCityIds.includes(cityId)) {
      setSelectedServiceCityIds((current) => current.filter((id) => id !== cityId));
      return;
    }

    setSelectedServiceCityIds((current) => uniqueNumbers([...current, cityId]));
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
    if (!selectedScope) {
      setError("اختر نطاق ظهور المحل");
      return;
    }

    const basePayload = {
      classification_id: Number(classificationId),
      name: name.trim(),
      scope: selectedScope,
      status: active ? "active" as const : "inactive" as const,
      delivery_area_ids: [],
    };

    if (selectedScope === "general") {
      setSaving(true);
      setError("");
      try {
        const response = await apiFetch(market ? `home/markets/${market.id}/` : "home/markets/", {
          method: market ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        const data = await json(response);
        if (!response.ok || !data || typeof data !== "object") throw new Error(errorMessage(data, "تعذر حفظ المحل."));
        onSaved(data as Market);
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

    setSaving(true);
    setError("");
    const payload = {
      ...basePayload,
      service_city_ids: serviceCityIds,
    };

    try {
      const response = await apiFetch(market ? `home/markets/${market.id}/` : "home/markets/", {
        method: market ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await json(response);
      if (!response.ok || !data || typeof data !== "object") throw new Error(errorMessage(data, "تعذر حفظ المحل."));
      onSaved(data as Market);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ المحل.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="mx-auto w-full max-w-4xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b bg-muted/20 px-6 py-5">
          <div><h2 className="text-xl font-bold">{market ? "تعديل المحل" : "إضافة محل"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد نطاق ظهور المحل، عام أو مرتبط بمدن خدمة.</p></div>
          <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">اسم المحل *<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">تصنيف المحل *<AppSelect value={classificationId} onValueChange={setClassificationId} options={classifications.map((item) => ({ value: String(item.id), label: `${item.name} - ${classificationTypeLabel(item.classification_type)}` }))} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
              نطاق ظهور المحل *
              <AppSelect
                value={selectedScope}
                onValueChange={(value) => changeScope(value as MarketScope)}
                contentClassName="z-[80]"
                options={[
                  { value: "general", label: "عام" },
                  { value: "service_city", label: "مدينة خدمة" },
                ]}
              />
            </label>
            {selectedScope === "service_city" ? (
            <div className="grid gap-2 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold">المدن *</p>
                <p className="mt-1 text-xs text-muted-foreground">اختر المدن التي يظهر فيها المحل.</p>
              </div>
              <div className="grid gap-1 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground">المدن: </span>{selectedCityNames.length ? selectedCityNames.join("، ") : "اختر المدن"}</p>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="mb-3 text-sm font-semibold">اختر المدن التي يظهر فيها المحل</p>
                {serviceCitiesLoading ? (
                  <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"><LoaderCircle className="me-2 size-4 animate-spin" />جاري تحميل المدن...</div>
                ) : serviceCitiesError ? (
                  <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{serviceCitiesError}</span><Button type="button" variant="outline" size="sm" onClick={onReloadServiceCities}>إعادة المحاولة</Button></div>
                ) : availableServiceCities.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {availableServiceCities.map((city) => {
                      const selected = selectedServiceCityIds.includes(city.id);
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => toggleServiceCity(city.id)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold ${selected ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-accent"}`}
                        >
                          <span>{serviceCityName(city)}</span>
                          <span className="size-4 rounded border text-center text-[10px]">{selected ? "✓" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-background px-3 py-4 text-center text-sm text-muted-foreground">لا توجد مدن متاحة.</div>
                )}
              </div>
            </div>
            ) : (
              <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground sm:col-span-2">
                <p className="font-semibold text-foreground">عام</p>
                <p className="mt-1">هذا المحل عام ويظهر بدون ربطه بمدن خدمة محددة.</p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2"><div><p className="text-sm font-semibold">المحل مفعّل</p><p className="text-xs text-muted-foreground">المحلات المعطلة لا تظهر للعملاء.</p></div><Switch checked={active} onCheckedChange={setActive} /></div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm">
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
    return value ? markets.filter((market) => [market.name, classificationName(market)].some((item) => item.toLowerCase().includes(value))) : markets;
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
    if (!window.confirm(`هل تريد حذف محل ${market.name}؟`)) return;
    const marketIndex = markets.findIndex((item) => item.id === market.id);

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

  return (
    <div className="px-6 py-6">
      <PageTitle title="المحلات" description="إدارة المحلات وربط ظهور منتجاتها بالمدن." actions={<Button size="sm" onClick={() => setDialogMarket(null)}><Plus className="size-4" />إضافة محل</Button>} />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[["إجمالي المحلات", markets.length, Store], ["المحلات النشطة", markets.filter((item) => item.status === "active").length, Store], ["مدن الظهور", new Set(markets.flatMap((item) => marketServiceCityIds(item))).size, MapPin]].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof Store; return <Card key={label as string} className="h-[80px]"><div className="flex h-full items-center gap-3 px-5"><span className="rounded-full bg-primary/10 p-3 text-primary"><MetricIcon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-xl font-bold">{value as number}</p></div></div></Card>; })}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">كل المحلات</h2><p className="text-xs text-muted-foreground">المنتجات ترث نطاق الظهور من المحل.</p></div><div className="relative sm:w-72"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pr-9" placeholder="ابحث عن محل..." /></div></div>
        {loading ? <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><LoaderCircle className="me-2 size-5 animate-spin" />جاري التحميل...</div> : error ? <div className="flex min-h-56 flex-col items-center justify-center gap-3"><AlertCircle className="size-8 text-destructive" /><p>{error}</p><Button variant="outline" onClick={() => void load()}>إعادة المحاولة</Button></div> : <DataTable minWidth={900} columnWidths={[220, 150, 280, 100, 150]} headers={["المحل", "التصنيف", "المدن", "الحالة", <span key="actions" className="block text-center">الإجراءات</span>]} rows={filtered.map((market) => [<div key="name" className="px-2"><p className="font-semibold">{market.name}</p></div>, <Badge key="classification">{classificationName(market)}</Badge>, <MarketLocationsCell key="locations" market={market} serviceCities={serviceCities} />, <Badge key="status" tone={market.status === "active" ? "green" : "red"}>{market.status === "active" ? "نشط" : "معطل"}</Badge>, <div key="actions" className="flex justify-center gap-1"><Button size="icon" variant="ghost" onClick={() => setDialogMarket(market)}><Edit3 className="size-4" /></Button><Button size="icon" variant="ghost" onClick={() => void remove(market)}><Trash2 className="size-4 text-destructive" /></Button></div>])} />}
      </Card>
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
