"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit3, LoaderCircle, MapPin, Plus, Search, Store, Trash2, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { AppSelect, Badge, Button, Card, DataTable, Input, PageTitle, Switch } from "../primitives";
import { loadDeliveryAreaOptions, type DeliveryAreaOption } from "../markets-api";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";

type Classification = { id: number; name: string };
type MarketDeliveryArea = {
  id?: number | string;
  name?: string;
  service_city_id?: number | string | null;
  service_city?: { id?: number | string | null; name?: string } | null;
  service_city_name?: string | null;
  city_name?: string | null;
};
type Market = {
  id: number;
  name: string;
  branch: string;
  status: "active" | "inactive";
  classification: Classification;
  delivery_area_ids?: number[];
  deliveryAreaIds?: number[];
  delivery_areas?: Array<number | MarketDeliveryArea>;
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

function marketDeliveryAreaIds(market: Market): number[] {
  const values: unknown[] = [];

  if (Array.isArray(market.delivery_area_ids)) values.push(...market.delivery_area_ids);
  if (Array.isArray(market.deliveryAreaIds)) values.push(...market.deliveryAreaIds);
  if (Array.isArray(market.delivery_areas)) {
    for (const area of market.delivery_areas) {
      if (area && typeof area === "object") {
        values.push(area.id);
      } else {
        values.push(area);
      }
    }
  }

  return uniqueNumbers(values);
}

function labelFromDeliveryArea(area: MarketDeliveryArea) {
  return (
    area.name ||
    area.service_city?.name ||
    area.service_city_name ||
    area.city_name ||
    (area.id ? `منطقة رقم ${area.id}` : "")
  );
}

function marketDeliveryAreaLabels(
  market: Market,
  deliveryAreaOptions: DeliveryAreaOption[],
) {
  const labels = new Map<number, string>();

  if (Array.isArray(market.delivery_areas)) {
    for (const area of market.delivery_areas) {
      if (!area || typeof area !== "object") {
        continue;
      }
      const id = Number(area.id);
      const label = labelFromDeliveryArea(area);
      if (Number.isFinite(id) && label) labels.set(id, label);
    }
  }

  for (const option of deliveryAreaOptions) {
    if (!labels.has(option.id)) labels.set(option.id, option.label);
  }

  const selectedIds = marketDeliveryAreaIds(market);
  return selectedIds.map((id) => labels.get(id) || `منطقة رقم ${id}`);
}

function marketDeliveryAreasText(
  market: Market,
  deliveryAreaOptions: DeliveryAreaOption[],
) {
  const labels = marketDeliveryAreaLabels(market, deliveryAreaOptions);
  return labels.length ? labels.join("، ") : "لا توجد مناطق محددة";
}

function MarketDialog({
  market,
  deliveryAreaOptions,
  classifications,
  onClose,
  onSaved,
  onDeliveryAreaOptionsLoaded,
}: {
  market?: Market;
  deliveryAreaOptions: DeliveryAreaOption[];
  classifications: Classification[];
  onClose: () => void;
  onSaved: (market: Market) => void;
  onDeliveryAreaOptionsLoaded: (options: DeliveryAreaOption[]) => void;
}) {
  const { apiFetch } = useAuth();
  const [name, setName] = useState(market?.name ?? "");
  const [branch, setBranch] = useState(market?.branch ?? "");
  const [classificationId, setClassificationId] = useState(String(market?.classification.id ?? classifications[0]?.id ?? ""));
  const [deliveryAreaIds, setDeliveryAreaIds] = useState<number[]>(() => market ? marketDeliveryAreaIds(market) : []);
  const [loadedDeliveryAreaOptions, setLoadedDeliveryAreaOptions] = useState<DeliveryAreaOption[]>(deliveryAreaOptions);
  const [deliveryAreaLoading, setDeliveryAreaLoading] = useState(true);
  const [deliveryAreaLoadError, setDeliveryAreaLoadError] = useState("");
  const [active, setActive] = useState(market?.status !== "inactive");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validBase = name.trim() && classificationId;

  const loadDeliveryAreas = useCallback(async () => {
    setDeliveryAreaLoading(true);
    setDeliveryAreaLoadError("");
    try {
      const options = await loadDeliveryAreaOptions(apiFetch);
      setLoadedDeliveryAreaOptions(options);
      onDeliveryAreaOptionsLoaded(options);
    } catch (reason) {
      setDeliveryAreaLoadError(reason instanceof Error ? reason.message : "تعذر تحميل مناطق الظهور.");
    } finally {
      setDeliveryAreaLoading(false);
    }
  }, [apiFetch, onDeliveryAreaOptionsLoaded]);

  useEffect(() => {
    void Promise.resolve().then(loadDeliveryAreas);
  }, [loadDeliveryAreas]);

  const selectedDeliveryAreaText = deliveryAreaIds.length
    ? deliveryAreaIds
        .map((id) => loadedDeliveryAreaOptions.find((option) => option.id === id)?.label ?? `منطقة رقم ${id}`)
        .join("، ")
    : "اختر مناطق الظهور";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validBase || saving) return;
    if (deliveryAreaIds.length === 0) {
      setError("اختر منطقة توصيل واحدة على الأقل.");
      return;
    }

    setSaving(true);
    setError("");
    const draft = {
      name,
      branch,
      classificationId,
      status: active ? "active" as const : "inactive" as const,
      deliveryAreaIds,
    };

    try {
      const response = await apiFetch(market ? `home/markets/${market.id}/` : "home/markets/", {
        method: market ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          branch: draft.branch.trim(),
          classification_id: Number(draft.classificationId),
          status: draft.status,
          delivery_areas: draft.deliveryAreaIds,
        }),
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
      <section role="dialog" aria-modal="true" className="mx-auto w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b bg-muted/20 px-6 py-5">
          <div><h2 className="text-xl font-bold">{market ? "تعديل المحل" : "إضافة محل"}</h2><p className="mt-1 text-sm text-muted-foreground">حدد المدن التي يظهر فيها المحل وكل منتجاته.</p></div>
          <button type="button" onClick={onClose} className="rounded-full border p-2 hover:bg-accent"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">اسم المحل *<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold">الفرع<Input value={branch} onChange={(event) => setBranch(event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold">التصنيف *<AppSelect value={classificationId} onValueChange={setClassificationId} options={classifications.map((item) => ({ value: String(item.id), label: item.name }))} /></label>
            <div className="grid gap-2 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold">مدن المناطق *</p>
                <p className="mt-1 text-xs text-muted-foreground">اختر منطقة توصيل واحدة على الأقل ليظهر فيها المحل.</p>
              </div>
              <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">{selectedDeliveryAreaText}</div>
              {deliveryAreaLoading ? (
                <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"><LoaderCircle className="me-2 size-4 animate-spin" />جاري تحميل مناطق الظهور...</div>
              ) : deliveryAreaLoadError ? (
                <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><span>{deliveryAreaLoadError}</span><Button type="button" variant="outline" size="sm" onClick={() => void loadDeliveryAreas()}>إعادة المحاولة</Button></div>
              ) : loadedDeliveryAreaOptions.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {loadedDeliveryAreaOptions.map((area) => {
                    const selected = deliveryAreaIds.includes(area.id);
                    return <button key={area.id} type="button" onClick={() => setDeliveryAreaIds((current) => selected ? current.filter((id) => id !== area.id) : [...current, area.id])} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold ${selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}><span>{area.label}</span><span className="size-4 rounded border text-center text-[10px]">{selected ? "✓" : ""}</span></button>;
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">لا توجد مناطق متاحة.</div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2"><div><p className="text-sm font-semibold">المحل مفعّل</p><p className="text-xs text-muted-foreground">المحلات المعطلة لا تظهر للعملاء.</p></div><Switch checked={active} onCheckedChange={setActive} /></div>
            {error ? <p className="flex gap-2 text-sm text-destructive sm:col-span-2"><AlertCircle className="size-4" />{error}</p> : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="submit" disabled={!validBase || saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{saving ? "جاري الحفظ..." : "حفظ المحل"}</Button></div>
        </form>
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
  const [deliveryAreaOptions, setDeliveryAreaOptions] = useState<DeliveryAreaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dialogMarket, setDialogMarket] = useState<Market | null | undefined>();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [marketsResponse, classificationsResponse, deliveryAreaOptionsResult] = await Promise.all([
        apiFetch("home/markets/"),
        apiFetch("home/market-classifications/"),
        loadDeliveryAreaOptions(apiFetch).then((options) => ({ options })).catch(() => ({ options: [] as DeliveryAreaOption[] })),
      ]);
      const [marketsData, classificationsData] = await Promise.all([json(marketsResponse), json(classificationsResponse)]);
      if (!marketsResponse.ok || !Array.isArray(marketsData)) throw new Error(errorMessage(marketsData, "تعذر تحميل المحلات."));
      if (!classificationsResponse.ok || !Array.isArray(classificationsData)) throw new Error(errorMessage(classificationsData, "تعذر تحميل التصنيفات."));
      setMarkets(marketsData as Market[]);
      setClassifications(classificationsData as Classification[]);
      setDeliveryAreaOptions(deliveryAreaOptionsResult.options);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحميل المحلات."); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? markets.filter((market) => [market.name, market.branch, market.classification.name].some((item) => item.toLowerCase().includes(value))) : markets;
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
      <PageTitle title="المحلات" description="إدارة المحلات وربط ظهور منتجاتها بالمدن." actions={<Button size="sm" onClick={() => setDialogMarket(null)} disabled={!classifications.length}><Plus className="size-4" />إضافة محل</Button>} />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[["إجمالي المحلات", markets.length, Store], ["المحلات النشطة", markets.filter((item) => item.status === "active").length, Store], ["مناطق الظهور", new Set(markets.flatMap((item) => marketDeliveryAreaIds(item))).size, MapPin]].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof Store; return <Card key={label as string} className="h-[80px]"><div className="flex h-full items-center gap-3 px-5"><span className="rounded-full bg-primary/10 p-3 text-primary"><MetricIcon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label as string}</p><p className="text-xl font-bold">{value as number}</p></div></div></Card>; })}
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">كل المحلات</h2><p className="text-xs text-muted-foreground">المنتجات ترث نطاق الظهور من المحل.</p></div><div className="relative sm:w-72"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pr-9" placeholder="ابحث عن محل..." /></div></div>
        {loading ? <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><LoaderCircle className="me-2 size-5 animate-spin" />جاري التحميل...</div> : error ? <div className="flex min-h-56 flex-col items-center justify-center gap-3"><AlertCircle className="size-8 text-destructive" /><p>{error}</p><Button variant="outline" onClick={() => void load()}>إعادة المحاولة</Button></div> : <DataTable minWidth={900} columnWidths={[220, 150, 260, 100, 150]} headers={["المحل", "التصنيف", "مدن الظهور", "الحالة", <span key="actions" className="block text-center">الإجراءات</span>]} rows={filtered.map((market) => [<div key="name" className="px-2"><p className="font-semibold">{market.name}</p><p className="text-xs text-muted-foreground">{market.branch || "بدون فرع"}</p></div>, <Badge key="classification">{market.classification.name}</Badge>, <span key="cities" className="text-sm text-muted-foreground">{marketDeliveryAreasText(market, deliveryAreaOptions)}</span>, <Badge key="status" tone={market.status === "active" ? "green" : "red"}>{market.status === "active" ? "نشط" : "معطل"}</Badge>, <div key="actions" className="flex justify-center gap-1"><Button size="icon" variant="ghost" onClick={() => setDialogMarket(market)}><Edit3 className="size-4" /></Button><Button size="icon" variant="ghost" onClick={() => void remove(market)}><Trash2 className="size-4 text-destructive" /></Button></div>])} />}
      </Card>
      {dialogMarket !== undefined ? <MarketDialog market={dialogMarket ?? undefined} deliveryAreaOptions={deliveryAreaOptions} classifications={classifications} onDeliveryAreaOptionsLoaded={setDeliveryAreaOptions} onClose={() => setDialogMarket(undefined)} onSaved={(saved) => { setMarkets((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]); setDialogMarket(undefined); showSnackbar({ message: "تم حفظ المحل وربطه بمناطق الظهور." }); }} /> : null}
    </div>
  );
}
