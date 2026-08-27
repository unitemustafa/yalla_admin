"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, RotateCcw, Search, SlidersHorizontal, Store, Tags, X } from "lucide-react";

import type { ShopRow } from "../../admin-api";
import { Button } from "../../primitives";
import type { ItemRow } from "../types";
import { cn } from "@/lib/utils";
import { deriveItemFilterOptions } from "./domain";
import {
  defaultAdvancedFilters,
  type ItemAdvancedFilters,
  type ItemFilters,
  type ItemScopeFilter,
} from "./types";

function ProductSearchField({
  label,
  placeholder,
  search,
  onSearchChange,
}: {
  label: string;
  placeholder: string;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <label className="grid min-w-0 flex-1 gap-2 text-sm font-medium">
      {label}
      <span className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-border bg-input px-10 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
        />
        {search ? (
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
  );
}

export function ItemsFilters({
  filters,
  markets,
  rows,
  onSearchChange,
  onApply,
  onClear,
}: {
  filters: ItemFilters;
  markets: ShopRow[];
  rows: ItemRow[];
  onSearchChange: (search: string) => void;
  onApply: (filters: ItemAdvancedFilters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<ItemAdvancedFilters>(() => ({
    scope: filters.scope,
    cityId: filters.cityId,
    categoryId: filters.categoryId,
    shopId: filters.shopId,
  }));
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { cityOptions, categoryOptions, eligibleMarkets } = useMemo(
    () =>
      deriveItemFilterOptions({
        rows,
        markets,
        search: filters.search,
        scope: draftFilters.scope,
        cityId: draftFilters.cityId,
        categoryId: draftFilters.categoryId,
      }),
    [
      draftFilters.categoryId,
      draftFilters.cityId,
      draftFilters.scope,
      filters.search,
      markets,
      rows,
    ],
  );

  const activeFilterCount =
    Number(filters.scope !== "all") +
    Number(Boolean(filters.cityId)) +
    Number(Boolean(filters.categoryId)) +
    Number(Boolean(filters.shopId));
  const hasAdvancedFilters = activeFilterCount > 0;
  const hasDraftAdvancedFilters =
    draftFilters.scope !== "all" ||
    Boolean(draftFilters.cityId) ||
    Boolean(draftFilters.categoryId) ||
    Boolean(draftFilters.shopId);
  const citySelectionRequired = draftFilters.scope === "cities" && !draftFilters.cityId;
  const canChooseCategory =
    draftFilters.scope === "general" ||
    (draftFilters.scope === "cities" && Boolean(draftFilters.cityId));

  function closePanel() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.querySelector("button")?.focus());
  }

  function openPanel() {
    setDraftFilters({
      scope: filters.scope,
      cityId: filters.cityId,
      categoryId: filters.categoryId,
      shopId: filters.shopId,
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

  function changeSearch(search: string) {
    onSearchChange(search);
    setDraftFilters((current) => ({
      ...current,
      cityId: "",
      categoryId: "",
      shopId: "",
    }));
  }

  function changeScope(scope: Exclude<ItemScopeFilter, "all">) {
    setDraftFilters((current) => ({
      scope: current.scope === scope ? "all" : scope,
      cityId: "",
      categoryId: "",
      shopId: "",
    }));
  }

  function changeCity(cityId: string) {
    setDraftFilters((current) => ({
      ...current,
      cityId: current.cityId === cityId ? "" : cityId,
      categoryId: "",
      shopId: "",
    }));
  }

  function changeCategory(categoryId: string) {
    setDraftFilters((current) => ({
      ...current,
      categoryId: current.categoryId === categoryId ? "" : categoryId,
      shopId: "",
    }));
  }

  function selectShop(shopId: string) {
    const nextFilters = { ...draftFilters, shopId };
    setDraftFilters(nextFilters);
    onApply(nextFilters);
    closePanel();
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
        <ProductSearchField
          label="بحث"
          placeholder="ابحث بالاسم أو الوصف..."
          search={filters.search}
          onSearchChange={onSearchChange}
        />
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
                      ابحث ثم اختر النطاق والمدينة والفئة والمحل.
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
                  <ProductSearchField
                    label="اسم المنتج"
                    placeholder="اكتب اسم المنتج مثل زيت..."
                    search={filters.search}
                    onSearchChange={changeSearch}
                  />

                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">نطاق الظهور</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["general", "جاهز للشحن", Store],
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
                      عدم اختيار نطاق يعني عرض كل المنتجات المطابقة للبحث.
                    </p>
                  </fieldset>

                  {draftFilters.scope === "cities" ? (
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold">المدينة</legend>
                      {cityOptions.length ? (
                        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border bg-background p-2 sm:grid-cols-2">
                          {cityOptions.map((city) => {
                            const selected = draftFilters.cityId === city.id;
                            return (
                              <button
                                key={city.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => changeCity(city.id)}
                                className={cn(
                                  "flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-start text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-transparent hover:bg-accent",
                                )}
                              >
                                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">{city.name}</span>
                                {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                          لا توجد مدن بها منتجات مطابقة للبحث.
                        </div>
                      )}
                      {citySelectionRequired ? (
                        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                          اختر مدينة واحدة لعرض فئات المحلات المتاحة.
                        </p>
                      ) : null}
                    </fieldset>
                  ) : null}

                  {canChooseCategory ? (
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold">فئة المحل</legend>
                      {categoryOptions.length ? (
                        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border bg-background p-2 sm:grid-cols-2">
                          {categoryOptions.map((category) => {
                            const selected = draftFilters.categoryId === category.id;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => changeCategory(category.id)}
                                className={cn(
                                  "flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-start text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-transparent hover:bg-accent",
                                )}
                              >
                                <Tags className="size-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                                {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                          لا توجد فئات محلات بها منتجات مطابقة لهذا الاختيار.
                        </div>
                      )}
                    </fieldset>
                  ) : null}

                  {draftFilters.categoryId ? (
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold">المحل</legend>
                      {eligibleMarkets.length ? (
                        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border bg-background p-2 sm:grid-cols-2">
                          {eligibleMarkets.map((market) => {
                            const selected = draftFilters.shopId === market.id;
                            return (
                              <button
                                key={market.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectShop(market.id)}
                                className={cn(
                                  "flex min-h-10 items-center justify-between gap-2 rounded-md border px-3 py-2 text-start text-sm font-semibold transition",
                                  selected
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-transparent hover:bg-accent",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <Store className="size-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{market.name}</span>
                                </span>
                                {!market.active ? (
                                  <span className="shrink-0 text-[10px] text-destructive">
                                    معطل
                                  </span>
                                ) : selected ? (
                                  <Check className="size-4 shrink-0 text-primary" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                          لا توجد محلات في هذه الفئة تحتوي منتجات مطابقة للبحث.
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        اختيار المحل يطبّق الفلاتر ويعرض المنتجات فورًا.
                      </p>
                    </fieldset>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t bg-muted/10 p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!filters.search && !hasAdvancedFilters && !hasDraftAdvancedFilters}
                    onClick={() => {
                      setDraftFilters(defaultAdvancedFilters);
                      onSearchChange("");
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
