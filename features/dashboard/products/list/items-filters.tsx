"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, RotateCcw, Search, SlidersHorizontal, Store, X } from "lucide-react";

import type { ShopRow } from "../../admin-api";
import { Button } from "../../primitives";
import { cn } from "@/lib/utils";
import { compareItemText } from "./domain";
import {
  defaultAdvancedFilters,
  type ItemAdvancedFilters,
  type ItemFilters,
  type ItemScopeFilter,
} from "./types";

export function ItemsFilters({
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
      compareItemText(first.name, second.name),
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
