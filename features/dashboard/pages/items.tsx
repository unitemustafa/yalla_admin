"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  Edit,
  Eye,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Store,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { type ItemRow } from "../data";
import { useAuth } from "@/features/auth/auth-provider";
import {
  AdminApiError,
  adminApiPaths,
  addonRowFromApi,
  apiList,
  deleteProduct,
  fetchAdminRows,
  getProduct,
  primaryProductImageUrl,
  listProducts,
  productRowFromApi,
  readApiData,
  shopRowFromApi,
  toggleProductAvailability,
  type BackendRecord,
  type NormalizedProduct,
  type ShopRow,
} from "../admin-api";
import { DashboardImage } from "../dashboard-image";
import {
  Button,
  Card,
  CurrencyText,
  DataTable,
  PageTitle,
  Pagination,
  Switch,
} from "../primitives";
import { useSnackbar } from "../snackbar";
import { cn } from "@/lib/utils";

type ItemScopeFilter = "all" | "general" | "cities";

type ItemAdvancedFilters = {
  scope: ItemScopeFilter;
  cityIds: string[];
  shopIds: string[];
  status: "all" | "active" | "inactive";
};

type ItemFilters = ItemAdvancedFilters & {
  search: string;
};

const defaultAdvancedFilters: ItemAdvancedFilters = {
  scope: "all",
  cityIds: [],
  shopIds: [],
  status: "all",
};

const defaultFilters: ItemFilters = {
  search: "",
  ...defaultAdvancedFilters,
};

const itemsPageSize = 10;

const checkboxClass =
  "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border text-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground";

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

const itemSortCollator = new Intl.Collator("ar", {
  numeric: true,
  sensitivity: "base",
});

function compareText(firstValue: string, secondValue: string) {
  return itemSortCollator.compare(firstValue.trim(), secondValue.trim());
}

function compareItems(firstRow: ItemRow, secondRow: ItemRow) {
  const categoryComparison = compareText(firstRow.category, secondRow.category);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  return compareText(firstRow.name, secondRow.name);
}

function formatItemPrice(price: string) {
  return price.replace(/\s*\u062c\u0646\u064a\u0647/g, " EGP");
}

function normalizeItemRow(row: ItemRow, market?: ShopRow): ItemRow {
  const priceLabel = formatItemPrice(row.displayPriceLabel ?? row.price);
  const isCityMarket = market?.scope === "service_city";
  const marketCityNames = market?.serviceCityNames ?? [];

  return {
    ...row,
    code: row.code ?? row.id,
    shopName: market?.name ?? row.shopName ?? "",
    price: priceLabel,
    displayPriceLabel: priceLabel,
    visibilityMode: market
      ? isCityMarket
        ? "regions"
        : "general"
      : row.visibilityMode ?? "general",
    regionSlugs: market?.serviceCityIds ?? row.regionSlugs ?? [],
    regionNames: marketCityNames.length
      ? marketCityNames
      : row.regionNames ?? [],
    scopeLabel: market
      ? isCityMarket
        ? marketCityNames.join("، ") || "مدينة خدمة"
        : "عام"
      : row.scopeLabel,
  };
}

function itemVisibilityLabel(row: ItemRow) {
  if (row.scopeLabel?.trim()) return row.scopeLabel;
  if (row.visibilityMode !== "regions") return "عام";
  const names = row.regionNames?.length ? row.regionNames : row.regionSlugs;
  return names?.length ? names.join("، ") : "مناطق محددة";
}

function itemShopLabel(row: ItemRow) {
  return row.shopName?.trim() || "-";
}

function splitItemPrice(price: string) {
  const normalizedPrice = formatItemPrice(price).trim();
  if (!normalizedPrice || normalizedPrice === "بدون سعر" || normalizedPrice.includes(" - ")) {
    return { amount: normalizedPrice || "بدون سعر", currency: "" };
  }

  const parts = normalizedPrice.split(/\s+/);
  if (parts[0]?.toUpperCase() === "EGP") {
    return { amount: parts.slice(1).join(" "), currency: parts[0] };
  }

  const [amount = normalizedPrice, currency = ""] = parts;

  return { amount, currency };
}

function matchesFilters(row: ItemRow, filters: ItemFilters) {
  const search = filters.search.trim().toLowerCase();
  const matchesSearch =
    !search ||
    [
      row.code,
      row.id,
      row.name,
      row.description,
      row.category,
      row.shopName,
      formatItemPrice(row.displayPriceLabel ?? row.price),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  const matchesShop =
    filters.shopIds.length === 0 ||
    (row.marketId ? filters.shopIds.includes(row.marketId) : false);
  const matchesStatus =
    filters.status === "all" ||
    (filters.status === "active" ? row.active : !row.active);
  const matchesScope =
    filters.scope === "all" ||
    (filters.scope === "general"
      ? row.visibilityMode !== "regions"
      : row.visibilityMode === "regions" &&
        filters.cityIds.some((cityId) => (row.regionSlugs ?? []).includes(cityId)));

  return matchesSearch && matchesShop && matchesStatus && matchesScope;
}

function MetricCards({ rows }: { rows: ItemRow[] }) {
  const activeCount = rows.filter((row) => row.active).length;
  const inactiveCount = rows.length - activeCount;
  const cards = [
    {
      label: "إجمالي المنتجات",
      value: String(rows.length),
      detail: "حسب الفلاتر الحالية",
      icon: Package,
      tone: "bg-primary/10 text-primary",
      marker: "bg-primary",
    },
    {
      label: "نشط",
      value: String(activeCount),
      detail: "ظاهر للعملاء",
      icon: CheckCircle,
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      marker: "bg-emerald-500",
    },
    {
      label: "غير نشط",
      value: String(inactiveCount),
      detail: "متوقف مؤقتًا",
      icon: XCircle,
      tone: "bg-red-500/10 text-red-700 dark:text-red-300",
      marker: "bg-destructive",
    },
  ] as const;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.label} className="relative min-h-[92px] overflow-hidden">
            <span className={cn("absolute inset-y-4 end-0 w-1 rounded-s-full", card.marker)} />
            <div className="flex h-full items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-black leading-tight">
                  {card.value}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {card.detail}
                </p>
              </div>
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", card.tone)}>
                <Icon className="size-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ItemsFilters({
  filters,
  markets,
  onSearchChange,
  onApply,
  onClear,
}: {
  filters: ItemFilters;
  markets: ShopRow[];
  onSearchChange: (search: string) => void;
  onApply: (filters: ItemAdvancedFilters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<ItemAdvancedFilters>(() => ({
    scope: filters.scope,
    cityIds: [...filters.cityIds],
    shopIds: [...filters.shopIds],
    status: filters.status,
  }));
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cityOptions = useMemo(() => {
    const cities = new Map<string, string>();

    for (const market of markets) {
      if (market.scope !== "service_city") continue;
      const cityIds = market.serviceCityIds ?? [];
      const cityNames = market.serviceCityNames ?? [];
      cityIds.forEach((cityId, index) => {
        cities.set(cityId, cityNames[index] || `مدينة رقم ${cityId}`);
      });
    }

    return Array.from(cities, ([id, name]) => ({ id, name })).sort((first, second) =>
      compareText(first.name, second.name),
    );
  }, [markets]);

  const eligibleMarkets = useMemo(() => {
    if (draftFilters.scope === "general") {
      return markets.filter((market) => market.scope !== "service_city");
    }
    if (draftFilters.scope === "cities" && draftFilters.cityIds.length > 0) {
      return markets.filter(
        (market) =>
          market.scope === "service_city" &&
          (market.serviceCityIds ?? []).some((cityId) =>
            draftFilters.cityIds.includes(cityId),
          ),
      );
    }
    return [];
  }, [draftFilters.cityIds, draftFilters.scope, markets]);

  const activeFilterCount =
    (filters.scope !== "all" ? 1 : 0) +
    filters.cityIds.length +
    filters.shopIds.length +
    (filters.status !== "all" ? 1 : 0);
  const hasAdvancedFilters = activeFilterCount > 0;
  const hasDraftAdvancedFilters =
    draftFilters.scope !== "all" ||
    draftFilters.cityIds.length > 0 ||
    draftFilters.shopIds.length > 0 ||
    draftFilters.status !== "all";
  const citySelectionRequired =
    draftFilters.scope === "cities" && draftFilters.cityIds.length === 0;

  function closePanel() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.querySelector("button")?.focus());
  }

  function openPanel() {
    setDraftFilters({
      scope: filters.scope,
      cityIds: [...filters.cityIds],
      shopIds: [...filters.shopIds],
      status: filters.status,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function changeScope(scope: Exclude<ItemScopeFilter, "all">) {
    setDraftFilters((current) => ({
      ...current,
      scope: current.scope === scope ? "all" : scope,
      cityIds: [],
      shopIds: [],
    }));
  }

  function toggleCity(cityId: string) {
    setDraftFilters((current) => {
      const cityIds = current.cityIds.includes(cityId)
        ? current.cityIds.filter((id) => id !== cityId)
        : [...current.cityIds, cityId];
      const allowedMarketIds = new Set(
        markets
          .filter(
            (market) =>
              market.scope === "service_city" &&
              (market.serviceCityIds ?? []).some((id) => cityIds.includes(id)),
          )
          .map((market) => market.id),
      );

      return {
        ...current,
        cityIds,
        shopIds: current.shopIds.filter((shopId) => allowedMarketIds.has(shopId)),
      };
    });
  }

  function toggleShop(shopId: string) {
    setDraftFilters((current) => ({
      ...current,
      shopIds: current.shopIds.includes(shopId)
        ? current.shopIds.filter((id) => id !== shopId)
        : [...current.shopIds, shopId],
    }));
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <SlidersHorizontal className="size-4" />
        </span>
        بحث وتصفية
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-medium">
          بحث
          <span className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث بالاسم أو الوصف..."
              className="h-10 w-full rounded-md border border-border bg-input px-10 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
            />
            {filters.search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute end-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="مسح البحث"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </span>
        </label>
        <div ref={triggerRef} className="relative sm:self-end">
          <Button
            type="button"
            variant={hasAdvancedFilters ? "secondary" : "outline"}
            onClick={() => (open ? closePanel() : openPanel())}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls="items-filter-panel"
            className="h-10 w-full min-w-32 px-4 sm:w-auto"
          >
            <SlidersHorizontal className="size-4" />
            تصفية
            {activeFilterCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-black leading-none text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          {open ? (
            <>
              <button
                type="button"
                aria-label="إغلاق لوحة التصفية"
                onClick={closePanel}
                className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[1px] sm:hidden"
              />
              <div
                ref={panelRef}
                id="items-filter-panel"
                role="dialog"
                aria-labelledby="items-filter-title"
                tabIndex={-1}
                className="fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl outline-none sm:absolute sm:inset-x-auto sm:bottom-auto sm:end-0 sm:top-[calc(100%+0.5rem)] sm:w-[440px]"
              >
                <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div>
                    <h2 id="items-filter-title" className="font-black">
                      تصفية المنتجات
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      اختر النطاق ثم المدن والمحلات المناسبة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    aria-label="إغلاق"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="min-h-0 space-y-5 overflow-y-auto p-4">
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">نطاق الظهور</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["general", "عام", Store],
                        ["cities", "مدن", MapPin],
                      ] as const).map(([value, label, Icon]) => {
                        const selected = draftFilters.scope === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => changeScope(value)}
                            className={cn(
                              "flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-bold transition",
                              selected
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                            {label}
                            {selected ? <Check className="size-4" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      عدم اختيار نطاق يعني عرض كل المنتجات.
                    </p>
                  </fieldset>

                  {draftFilters.scope === "cities" ? (
                    <fieldset>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <legend className="text-sm font-bold">المدن</legend>
                        <span className="text-xs text-muted-foreground">
                          {draftFilters.cityIds.length} محددة
                        </span>
                      </div>
                      {cityOptions.length ? (
                        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border bg-background p-2 sm:grid-cols-2">
                          {cityOptions.map((city) => {
                            const selected = draftFilters.cityIds.includes(city.id);
                            return (
                              <label
                                key={city.id}
                                className={cn(
                                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-transparent hover:bg-accent",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleCity(city.id)}
                                  className="size-4 accent-primary"
                                />
                                <span className="truncate">{city.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                          لا توجد مدن مرتبطة بالمحلات حاليًا.
                        </div>
                      )}
                      {citySelectionRequired ? (
                        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                          اختر مدينة واحدة على الأقل لعرض النتائج.
                        </p>
                      ) : null}
                    </fieldset>
                  ) : null}

                  {draftFilters.scope !== "all" ? (
                    <fieldset>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <legend className="text-sm font-bold">المحلات</legend>
                        <span className="text-xs text-muted-foreground">
                          {draftFilters.shopIds.length
                            ? `${draftFilters.shopIds.length} محددة`
                            : "الكل"}
                        </span>
                      </div>
                      {eligibleMarkets.length ? (
                        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border bg-background p-2 sm:grid-cols-2">
                          {eligibleMarkets.map((market) => {
                            const selected = draftFilters.shopIds.includes(market.id);
                            return (
                              <label
                                key={market.id}
                                className={cn(
                                  "flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-transparent hover:bg-accent",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleShop(market.id)}
                                    className="size-4 shrink-0 accent-primary"
                                  />
                                  <span className="truncate">{market.name}</span>
                                </span>
                                {!market.active ? (
                                  <span className="shrink-0 text-[10px] text-destructive">
                                    معطل
                                  </span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                          {draftFilters.scope === "cities" && draftFilters.cityIds.length === 0
                            ? "اختر المدن أولًا لعرض المحلات."
                            : "لا توجد محلات مطابقة لهذا الاختيار."}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        ترك المحلات بدون تحديد يعني كل المحلات المطابقة.
                      </p>
                    </fieldset>
                  ) : null}

                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">حالة المنتج</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["all", "الكل"],
                        ["active", "نشط"],
                        ["inactive", "غير نشط"],
                      ] as const).map(([value, label]) => {
                        const selected = draftFilters.status === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setDraftFilters((current) => ({
                                ...current,
                                status: value,
                              }))
                            }
                            className={cn(
                              "h-10 rounded-md border text-xs font-bold transition",
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t bg-muted/10 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!hasAdvancedFilters && !hasDraftAdvancedFilters}
                    onClick={() => {
                      setDraftFilters(defaultAdvancedFilters);
                      onClear();
                      closePanel();
                    }}
                  >
                    <RotateCcw className="size-4" />
                    مسح الفلاتر
                  </Button>
                  <Button
                    type="button"
                    className="h-10"
                    disabled={citySelectionRequired}
                    onClick={() => {
                      onApply(draftFilters);
                      closePanel();
                    }}
                  >
                    عرض النتائج
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RowActions({
  row,
  onView,
  onDelete,
}: {
  row: ItemRow;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-w-[150px] items-center justify-end gap-2">
      <button type="button" aria-label={`بيانات ${row.name}`} title={`بيانات ${row.name}`} onClick={onView} className="inline-flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"><Eye className="size-4" /></button>
      <Link href={`/items/edit/${row.id}?returnTo=%2Fitems%3F`} aria-label={`تعديل ${row.name}`} title={`تعديل ${row.name}`} className="inline-flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"><Edit className="size-4" /></Link>
      <button type="button" aria-label={`حذف ${row.name}`} title={`حذف ${row.name}`} onClick={onDelete} className="inline-flex size-10 items-center justify-center rounded-md border border-destructive/35 text-destructive transition hover:bg-destructive/10"><Trash2 className="size-4" /></button>
    </div>
  );
}

function ProductIdentity({ row, compact = false }: { row: ItemRow; compact?: boolean }) {
  const imageSize = compact ? 48 : 52;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <DashboardImage
        alt={row.name}
        src={row.image}
        placeholderType="product"
        width={imageSize}
        height={imageSize}
        sizes={`${imageSize}px`}
        className={cn(
          "shrink-0 rounded-md border bg-muted/35 shadow-sm",
          compact ? "size-12" : "size-[52px]",
        )}
        imageClassName="object-contain p-1"
      />
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-black leading-5">{row.name}</h3>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold",
              row.active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300",
            )}
          >
            {row.active ? "نشط" : "متوقف"}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground">
      <span className="truncate">{children}</span>
    </span>
  );
}

function PriceCell({ price }: { price: string }) {
  const { amount, currency } = splitItemPrice(price);
  const compactText = !currency && (amount === "بدون سعر" || amount.includes(" - "));

  return (
    <div className="inline-flex min-w-[78px] items-baseline justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary">
      <span className={cn(compactText ? "text-xs font-bold leading-4" : "text-sm font-black leading-none")}>
        {amount}
      </span>
      {currency ? <span className="currency-text text-[11px] font-bold">{currency}</span> : null}
    </div>
  );
}

function ActiveToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (active: boolean) => void;
}) {
  return (
    <Switch
      checked={active}
      aria-label={active ? "إلغاء تنشيط المنتج" : "تنشيط المنتج"}
      onCheckedChange={onToggle}
    />
  );
}

function DeleteDialog({
  itemName,
  onClose,
  onConfirm,
}: {
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useBodyScrollLock(true);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden overscroll-none bg-foreground/30 px-4 backdrop-blur-[1px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-item-title"
        className="w-full max-w-[512px] rounded-lg border bg-background p-6 shadow-lg"
      >
        <h2 id="delete-item-title" className="text-lg font-semibold">
          حذف المنتج
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          متأكد إنك عايز تحذف <span className="font-semibold">{itemName}</span>؟
          الإجراء ده هيشيله من الجدول الحالي.
        </p>
        <div className="mt-4 flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            تأكيد الحذف
          </Button>
        </div>
      </div>
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function detailText(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function nestedDetailName(value: unknown, fallback = "-") {
  const record = asRecord(value);
  if (!record) return fallback;
  return detailText(record.name ?? record.name_ar ?? record.name_en ?? record.title, fallback);
}

function productDetailDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function variantAttributeLabel(value: unknown) {
  const record = asRecord(value);
  if (!record) return "";
  const attribute = asRecord(record.attribute);
  const option = asRecord(record.option);
  const attributeName = nestedDetailName(attribute, "");
  const optionValue = detailText(option?.value ?? record.option_value ?? record.value, "");

  if (attributeName && optionValue) return `${attributeName}: ${optionValue}`;
  return optionValue || attributeName;
}

function productAdditionLabel(
  additionId: number,
  additionsById: Map<string, string>,
) {
  return additionsById.get(String(additionId)) ?? `#${additionId}`;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md bg-muted/35 px-3 py-2 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 font-semibold">{value}</span>
    </div>
  );
}

function ProductDetailDialog({
  additionsById,
  error,
  loading,
  onClose,
  product,
}: {
  additionsById: Map<string, string>;
  error: string;
  loading: boolean;
  onClose: () => void;
  product: NormalizedProduct | null;
}) {
  useBodyScrollLock(true);

  const variants = product?.variants ?? [];
  const additions = product?.additions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        aria-labelledby="product-detail-title"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id="product-detail-title" className="truncate text-lg font-semibold">
              بيانات المنتج
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {product?.name || "تفاصيل المنتج من الباك"}
            </p>
          </div>
          <button
            aria-label="إغلاق"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={onClose}
            type="button"
          >
            <XCircle className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              جاري تحميل بيانات المنتج...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : product ? (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <DashboardImage
                  alt={product.name}
                  src={primaryProductImageUrl(product)}
                  placeholderType="product"
                  width={180}
                  height={180}
                  sizes="180px"
                  className="h-44 w-full rounded-md border bg-muted/30 md:w-44"
                  imageClassName="object-contain p-2"
                />
                <div className="grid gap-3">
                  <div>
                    <h3 className="text-xl font-black leading-8">{product.name || "-"}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {product.description || "-"}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow label="السوق" value={nestedDetailName(product.market)} />
                    <DetailRow label="فرع السوق" value={detailText(product.market?.branch)} />
                    <DetailRow label="الفئة" value={nestedDetailName(product.category)} />
                    <DetailRow label="الحالة" value={product.isAvailable ? "متاح" : "غير متاح"} />
                    <DetailRow label="الخصم" value={`${detailText(product.discount, "0.00")}%`} />
                    <DetailRow label="رقم المنتج" value={`#${product.id}`} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b bg-muted/20 px-4 py-3 text-sm font-semibold">
                  المتغيرات والأسعار
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-start">SKU</th>
                        <th className="px-4 py-2 text-start">السعر</th>
                        <th className="px-4 py-2 text-start">الخصائص</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.length ? (
                        variants.map((variant, index) => {
                          const attributes = Array.isArray(variant.attribute_values)
                            ? variant.attribute_values.map(variantAttributeLabel).filter(Boolean)
                            : [];

                          return (
                            <tr key={`${variant.id ?? "variant"}-${index}`} className="border-t">
                              <td className="px-4 py-3 font-medium" dir="ltr">
                                {detailText(variant.sku, "-")}
                              </td>
                              <td className="px-4 py-3">
                                <CurrencyText>{formatItemPrice(`EGP ${detailText(variant.price, "0.00")}`)}</CurrencyText>
                              </td>
                              <td className="px-4 py-3">
                                {attributes.length ? attributes.join("، ") : "-"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>
                            لا توجد متغيرات.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailRow
                  label="الإضافات"
                  value={
                    additions.length
                      ? additions.map((additionId) =>
                          productAdditionLabel(additionId, additionsById),
                        ).join("، ")
                      : "-"
                  }
                />
                <DetailRow label="تاريخ الإنشاء" value={productDetailDate(product.createdAt)} />
                <DetailRow label="آخر تحديث" value={productDetailDate(product.updatedAt)} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ItemsMobileCards({
  rows,
  selectedRows,
  onToggleSelected,
  onToggleActive,
  onView,
  onDelete,
}: {
  rows: ItemRow[];
  selectedRows: Set<string>;
  onToggleSelected: (rowIndex: string) => void;
  onToggleActive: (row: ItemRow, active: boolean) => void;
  onView: (row: ItemRow) => void;
  onDelete: (rowId: string) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-3 lg:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="min-w-0 overflow-hidden rounded-md border bg-card p-3 text-card-foreground shadow-sm"
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={selectedRows.has(row.index)}
              data-state={selectedRows.has(row.index) ? "checked" : "unchecked"}
              value="on"
              aria-label="تحديد الصف"
              className={cn(checkboxClass, "mt-3")}
              onClick={() => onToggleSelected(row.index)}
            >
              {selectedRows.has(row.index) ? <Check className="size-3" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <ProductIdentity row={row} compact />
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {row.description}
                  </p>
                </div>
                <RowActions
                  row={row}
                  onView={() => onView(row)}
                  onDelete={() => onDelete(row.id)}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">الفئة</div>
                  <div className="mt-1 truncate font-medium">{row.category}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">المحل</div>
                  <div className="mt-1 truncate font-medium">{itemShopLabel(row)}</div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">السعر</div>
                  <div className="mt-1">
                    <PriceCell price={row.price} />
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="text-muted-foreground">الظهور</div>
                  <div className="mt-1 line-clamp-1 font-medium">
                    {itemVisibilityLabel(row)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <ActiveToggleButton
                  active={row.active}
                  onToggle={(active) => onToggleActive(row, active)}
                />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ItemsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [markets, setMarkets] = useState<ShopRow[]>([]);
  const [additionRows, setAdditionRows] = useState(() => new Map<string, string>());
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailProduct, setDetailProduct] = useState<NormalizedProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const visibleRows = useMemo(
    () =>
      rows
        .filter((row) => matchesFilters(row, filters))
        .sort(compareItems),
    [filters, rows],
  );
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * itemsPageSize;
  const pagedRows = visibleRows.slice(pageStartIndex, pageStartIndex + itemsPageSize);
  const deleteRow = rows.find((row) => row.id === deleteId);
  const detailDialogOpen = detailLoading || Boolean(detailError) || Boolean(detailProduct);
  const showEmptyState = !loading && !error && rows.length === 0;

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const [products, additionsResponse, loadedMarkets] = await Promise.all([
          listProducts(apiFetch),
          apiFetch(adminApiPaths.productAdditions),
          fetchAdminRows(apiFetch, adminApiPaths.markets, shopRowFromApi),
        ]);
        const additionsData = await readApiData(additionsResponse);
        const marketsById = new Map(
          loadedMarkets.map((market) => [market.id, market]),
        );

        if (!active) return;
        setMarkets(loadedMarkets);
        setRows(
          products.map((product, index) => {
            const row = productRowFromApi(product, index);
            return normalizeItemRow(
              row,
              row.marketId ? marketsById.get(row.marketId) : undefined,
            );
          }),
        );
        if (additionsResponse.ok) {
          setAdditionRows(
            new Map(
              apiList(additionsData)
                .map((record, index) => addonRowFromApi(record as BackendRecord, index))
                .map((addon) => [addon.id, addon.nameAr || addon.name]),
            ),
          );
        }
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل المنتجات",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      active = false;
    };
  }, [apiFetch, reloadKey]);

  function toggleSelectedRow(rowIndex: string) {
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);

      if (nextRows.has(rowIndex)) {
        nextRows.delete(rowIndex);
      } else {
        nextRows.add(rowIndex);
      }

      return nextRows;
    });
  }

  async function toggleActive(row: ItemRow, active: boolean) {
    const previousRows = rows;
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.id === row.id ? { ...currentRow, active } : currentRow,
      ),
    );
    setError("");

    try {
      await toggleProductAvailability(apiFetch, row.id, active);
      showSnackbar({
        message: active ? "تم تفعيل المنتج في الباك." : "تم إيقاف المنتج في الباك.",
      });
    } catch (updateError) {
      setRows(previousRows);
      showSnackbar({
        message:
          updateError instanceof Error
            ? updateError.message
            : "تعذر تحديث حالة المنتج في الباك.",
        tone: "danger",
      });
    }
  }

  async function openProductDetail(row: ItemRow) {
    setError("");
    setDetailProduct(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const product = await getProduct(apiFetch, row.id);
      setDetailProduct(product);
    } catch (detailLoadError) {
      if (detailLoadError instanceof AdminApiError && detailLoadError.status === 404) {
        setDetailError("تعذر العثور على المنتج");
      } else {
        setDetailError(
          detailLoadError instanceof Error
            ? detailLoadError.message
            : "تعذر تحميل بيانات المنتج",
        );
      }
    } finally {
      setDetailLoading(false);
    }
  }

  function closeProductDetail() {
    setDetailProduct(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function confirmDelete() {
    if (!deleteRow) {
      return;
    }

    const deletedItemName = deleteRow.name;
    const previousRows = rows;

    setRows((currentRows) => currentRows.filter((row) => row.id !== deleteRow.id));
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);
      nextRows.delete(deleteRow.index);
      return nextRows;
    });
    setDeleteId(null);
    setError("");

    try {
      await deleteProduct(apiFetch, deleteRow.id);
      showSnackbar({
        message: `تم حذف ${deletedItemName} من الباك.`,
        tone: "danger",
      });
    } catch (deleteError) {
      setRows(previousRows);
      showSnackbar({
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "تعذر حذف المنتج من الباك.",
        tone: "danger",
      });
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        title="المنتجات"
        description="إدارة منتجات المنيو في كل الفروع"
        size="compact"
        className="rounded-lg border bg-card p-4 shadow-sm"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9 px-4 text-sm" onClick={() => setReloadKey((current) => current + 1)} disabled={loading}>
              <RotateCcw className={cn("size-4", loading && "animate-spin")} />
              تحديث
            </Button>
            <Link
              href="/items/create"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 sm:w-[132px]"
            >
              <Plus className="size-4" />
              منتج جديد
            </Link>
          </div>
        }
      />

      <MetricCards rows={visibleRows} />

      <div className="mt-6">
        {showEmptyState ? (
          <Card className="flex min-h-[280px] items-center justify-center bg-card shadow">
            <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Package className="size-8" />
              </div>
              <h2 className="mt-4 text-xl font-semibold leading-7">
                لا توجد منتجات حتى الآن
              </h2>
              <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
                سيظهر هنا أول منتج تضيفه للعملاء في تطبيق يلا ماركت.
              </p>
              <div className="mt-4 flex w-full justify-center sm:w-auto">
                <Link
                  href="/items/create"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
                >
                  <Plus className="size-4" />
                  إضافة أول منتج
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            ) : null}
            <ItemsFilters
              filters={filters}
              markets={markets}
              onSearchChange={(search) => {
                setFilters((current) => ({ ...current, search }));
                setCurrentPage(1);
              }}
              onApply={(advancedFilters) => {
                setFilters((current) => ({
                  search: current.search,
                  scope: advancedFilters.scope,
                  cityIds: [...advancedFilters.cityIds],
                  shopIds: [...advancedFilters.shopIds],
                  status: advancedFilters.status,
                }));
                setCurrentPage(1);
              }}
              onClear={() => {
                setFilters((current) => ({
                  search: current.search,
                  ...defaultAdvancedFilters,
                }));
                setCurrentPage(1);
              }}
            />
            {loading ? (
              <div className="mt-4 flex h-16 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
                جاري تحميل المنتجات...
              </div>
            ) : visibleRows.length ? (
              <ItemsMobileCards
                rows={pagedRows}
                selectedRows={selectedRows}
                onToggleSelected={toggleSelectedRow}
                onToggleActive={toggleActive}
                onView={openProductDetail}
                onDelete={setDeleteId}
              />
            ) : (
              <div className="mt-4 flex h-16 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
                لا توجد نتائج مطابقة.
              </div>
            )}
            <div className="mt-4 hidden overflow-hidden rounded-md border transition-opacity duration-200 lg:block">
              <DataTable
                minWidth={1162}
                columnWidths={[78, 300, 210, 120, 130, 112, 70, 190]}
                rowHeight="normal"
                headers={[
                  "",
                  "المنتج",
                  "الوصف",
                  "المحل",
                  "الظهور",
                  "السعر",
                  "نشط",
                  "",
                ]}
                rows={(loading ? [] : pagedRows).map((row, rowPosition) => [
                  <span key={`index-${row.index}`} className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                    {pageStartIndex + rowPosition + 1}
                  </span>,
                  <div
                    key={`product-${row.index}`}
                    className="min-w-0 py-1.5"
                  >
                    <ProductIdentity row={row} />
                  </div>,
                  <div key={`description-${row.index}`} className="min-w-0 py-1.5">
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {row.description}
                    </p>
                  </div>,
                  <div key={`shop-${row.index}`} className="min-w-0">
                    <InfoPill>{itemShopLabel(row)}</InfoPill>
                  </div>,
                  <div key={`visibility-${row.index}`} className="min-w-0">
                    <InfoPill>{itemVisibilityLabel(row)}</InfoPill>
                  </div>,
                  <div key={`price-${row.index}`} className="flex justify-start">
                    <PriceCell price={row.price} />
                  </div>,
                  <div key={`active-wrap-${row.index}`} className="flex items-center gap-3">
                    <ActiveToggleButton
                      active={row.active}
                      onToggle={(active) => toggleActive(row, active)}
                    />
                  </div>,
                  <div key={`actions-${row.index}`} className="flex items-center justify-end">
                    <RowActions
                      row={row}
                      onView={() => openProductDetail(row)}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  </div>,
                ])}
              />
              {loading ? (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  جاري تحميل المنتجات...
                </div>
              ) : !visibleRows.length ? (
                <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
                  لا توجد نتائج مطابقة.
                </div>
              ) : null}
            </div>
            <Pagination
              text={`عرض ${pagedRows.length} من ${visibleRows.length} نتيجة`}
              pages={`${safeCurrentPage} / ${totalPages}`}
              previousDisabled={safeCurrentPage === 1}
              nextDisabled={safeCurrentPage === totalPages}
              onPrevious={() =>
                setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
              }
              onNext={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, Math.min(page, totalPages) + 1),
                )
              }
            />
          </>
        )}
      </div>

      {detailDialogOpen ? (
        <ProductDetailDialog
          additionsById={additionRows}
          error={detailError}
          loading={detailLoading}
          onClose={closeProductDetail}
          product={detailProduct}
        />
      ) : null}

      {deleteRow ? (
        <DeleteDialog
          itemName={deleteRow.name}
          onClose={() => setDeleteId(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
