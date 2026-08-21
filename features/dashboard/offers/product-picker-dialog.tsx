"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DashboardImage } from "../dashboard-image";
import { Button, Input } from "../primitives";
import { RefBadge } from "./offer-ui";
import { useOfferProducts } from "./product-context";
import {
  itemMatchesProductSearch,
  itemPriceLabel,
  normalizeProductSearch,
} from "./product-domain";

export function ProductPickerDialog({
  open,
  selectedItemIds,
  title = "إضافة منتج للباكج",
  description = "ابحث بالاسم أو الكود، أو اختار من تصنيفات كل المنتجات.",
  selectedLabel = "موجود في الباكج",
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedItemIds: string[];
  title?: string;
  description?: string;
  selectedLabel?: string;
  onClose: () => void;
  onSelect: (itemId: string) => void;
}) {
  const products = useOfferProducts();
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeProductSearch(query);
  const filteredItems = useMemo(
    () => products.filter((item) => itemMatchesProductSearch(item, normalizedQuery)),
    [normalizedQuery, products],
  );

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-product-search-title"
        className="flex max-h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="package-product-search-title" className="text-base font-bold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            aria-label="إغلاق اختيار المنتج"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b bg-muted/15 p-4">
          <label className="grid gap-2 text-sm font-medium">
            بحث
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم المنتج أو الكود..."
                className="h-10 ps-9"
                autoFocus
              />
            </div>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {filteredItems.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const selected = selectedItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "group grid min-h-28 grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border bg-card p-3 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45",
                      selected && "border-primary/45 bg-primary/10",
                    )}
                  >
                    <DashboardImage
                      src={item.image}
                      placeholderType="product"
                      alt=""
                      width={128}
                      height={128}
                      sizes="56px"
                      className="size-14 rounded-md"
                      imageClassName="object-cover"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <RefBadge tone={item.active ? "green" : "red"}>{item.active ? "نشط" : "متوقف"}</RefBadge>
                        {selected ? <RefBadge tone="blue">{selectedLabel}</RefBadge> : null}
                      </span>
                      <span className="mt-2 block truncate text-sm font-bold">{item.name}</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-primary">
                        {item.shopName || `محل #${item.marketId ?? "-"}`}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                        {item.code ?? item.id}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-md bg-muted/50 px-2 py-1 font-semibold text-foreground">
                          {itemPriceLabel(item)}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">مفيش منتجات مطابقة</div>
              <p className="mt-1 text-xs text-muted-foreground">جرّب تغير كلمة البحث أو التصنيف.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            ظاهر {filteredItems.length} من {products.length} منتج
          </div>
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
}
