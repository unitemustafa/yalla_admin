"use client";

import Link from "next/link";
import { Check, MapPin, Plus, Search, Store, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "../../primitives";
import type { ProductFormController } from "./use-product-form";

export function MarketPickerDialog({
  controller,
}: {
  controller: ProductFormController;
}) {
  if (!controller.marketModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="font-semibold">اختيار المحل</div>
          <button
            aria-label="إغلاق"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={() => controller.setMarketModalOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input
                className="h-10 ps-9"
                onChange={(event) => controller.setMarketQuery(event.target.value)}
                value={controller.marketQuery}
              />
            </div>
            <div className="flex rounded-md border bg-muted/20 p-1">
              {([
                ["general", "جاهز للشحن"],
                ["service_city", "مدن الخدمة"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={cn(
                    "h-8 rounded px-3 text-sm font-semibold transition",
                    controller.marketTab === value
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground",
                  )}
                  onClick={() => controller.setMarketTab(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {controller.marketTab === "service_city" ? (
            <div className="grid gap-2 border-b pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <MapPin className="size-4" />
                اختر مدينة الخدمة
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="مدن الخدمة">
                {["all", ...controller.marketServiceCities].map((city) => {
                  const selected = controller.marketServiceCity === city;
                  return (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "min-h-9 rounded-md border px-3 py-1.5 text-sm font-semibold transition hover:border-primary/50 hover:text-foreground",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "bg-background text-muted-foreground",
                      )}
                      onClick={() => controller.setMarketServiceCity(city)}
                    >
                      {city === "all" ? "كل المدن" : city}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="max-h-[54vh] overflow-y-auto">
            <div className="grid gap-2">
              {controller.filteredMarkets.map((market) => (
                <button
                  key={market.id}
                  className={cn(
                    "flex min-h-14 items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-start transition hover:border-primary/50",
                    controller.selectedMarketId === market.id &&
                      "border-primary bg-primary/10",
                  )}
                  onClick={() => controller.selectMarket(market)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {market.branch ? `${market.name} - ${market.branch}` : market.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {market.scope === "general"
                        ? "جاهز للشحن"
                        : market.serviceCities.join("، ") || "مدينة خدمة"}
                    </span>
                  </span>
                  {controller.selectedMarketId === market.id ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </button>
              ))}
              {!controller.filteredMarkets.length ? (
                controller.markets.length === 0 ? (
                  <div className="flex min-h-[230px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/10 px-5 py-8 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                      <Store className="size-7" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      لا توجد محلات حتى الآن
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                      أضف محلًا أولًا قبل ربط المنتج بالمحل المناسب.
                    </p>
                    <Link
                      href="/items/shops"
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
                      onClick={() => controller.setMarketModalOpen(false)}
                    >
                      <Plus className="size-4" />
                      إضافة محل
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                    لا توجد محلات مطابقة.
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
