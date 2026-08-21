"use client";

import { Plus, Search, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppSelect, Button, Field, Input } from "../../primitives";
import { filterOffersForMarketAndAddress, marketLabel, offerLabel } from "../create-domain";
import { money } from "../formatters";
import { SummaryPill } from "../summary";
import type { MarketSectionDraft } from "../types";
import type { useCreateOrder } from "./use-create-order";

type CreateOrderState = ReturnType<typeof useCreateOrder>;

export function MarketSectionsEditor({ state }: { state: CreateOrderState }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">محلات الطلب</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {state.selectedAddressRecord
              ? `${state.eligibleMarkets.length.toLocaleString("en-US")} محل متاح لهذا العنوان`
              : "اختر عنوان التوصيل قبل إضافة المحلات."}
          </div>
        </div>
        <Button type="button" variant="outline" disabled={!state.selectedAddressRecord || state.eligibleMarkets.length <= state.marketSections.length} onClick={state.addMarketSection}>
          <Plus className="size-4" />
          إضافة محل
        </Button>
      </div>
      {state.marketSections.length === 0 ? (
        <div className="rounded-md border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">لم يتم اختيار محلات بعد</div>
      ) : null}
      {state.marketSections.map((section, index) => (
        <MarketSectionEditor key={section.id} state={state} section={section} index={index} />
      ))}
    </div>
  );
}

function MarketSectionEditor({ state, section, index }: { state: CreateOrderState; section: MarketSectionDraft; index: number }) {
  const sectionMarket = state.eligibleMarkets.find((market) => String(market.id) === section.marketId) ?? null;
  const sectionSubtotal = section.lines.reduce((sum, line) => {
    const variant = state.variants.find((item) => item.id === line.variantId);
    return sum + (variant?.price ?? 0) * Math.max(1, Number(line.quantity) || 1);
  }, 0);
  const selectedOffersCount = section.offers.filter((offer) => offer.offerId).length;
  return (
    <section className="grid gap-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">محل {index + 1}</div>
          <div className="mt-1 text-xs text-muted-foreground">{sectionMarket ? marketLabel(sectionMarket) : "اختر المحل لهذا القسم"}</div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => state.removeMarketSection(section.id)} aria-label={`حذف المحل ${index + 1}`}><Trash2 className="size-4 text-destructive" /></Button>
      </div>
      <Field label="اختر المحل">
        <AppSelect value={section.marketId} onValueChange={(marketId) => state.updateSectionMarket(section.id, marketId)} placeholder="اختر المحل" ariaLabel={`اختيار المحل ${index + 1}`} className="h-12 bg-input" options={state.marketOptionsForSection(section.id)} />
      </Field>
      <ProductLines state={state} section={section} />
      <OfferLines state={state} section={section} />
      <div className="grid gap-2 text-xs md:grid-cols-3">
        <SummaryPill label="إجمالي منتجات القسم" value={money(sectionSubtotal)} />
        <SummaryPill label="العروض" value={selectedOffersCount ? `${selectedOffersCount}` : "لا توجد عروض مختارة"} />
        <SummaryPill label="الخصم" value={selectedOffersCount ? "يحسبه الباك" : money(0)} />
      </div>
    </section>
  );
}

function ProductLines({ state, section }: { state: CreateOrderState; section: MarketSectionDraft }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">المنتجات</div>
        <Button type="button" variant="outline" disabled={!section.marketId} onClick={() => state.addLine(section.id)}><Plus className="size-4" />إضافة منتج</Button>
      </div>
      {section.lines.length === 0 ? (
        <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">لا توجد منتجات مختارة</div>
      ) : (
        <div className="grid gap-2">
          {section.lines.map((line, index) => {
            const variant = state.variants.find((item) => item.id === line.variantId);
            return (
              <div key={line.id} className="grid gap-3 rounded-md border bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_130px_130px_44px] md:items-center">
                <input type="hidden" value={line.variantId} readOnly />
                <button type="button" disabled={!section.marketId} onClick={() => { state.setPickerTarget({ sectionId: section.id, lineId: line.id }); state.setProductQuery(""); state.setProductCategoryFilter("all"); state.setProductAvailabilityFilter("all"); }} className={cn("flex h-14 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60", !variant && "text-muted-foreground")}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{variant?.productName ?? "اختر المنتج"}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{variant ? `${variant.variantLabel} - ${money(variant.price)}${variant.sku ? ` - ${variant.sku}` : ""}` : "منتجات هذا المحل فقط"}</span>
                  </span>
                  <Search className="size-4 shrink-0 text-primary" />
                </button>
                <Input readOnly value={variant ? money(variant.price) : ""} className="h-14 text-center text-sm font-semibold" placeholder="سعر الوحدة" />
                <Input min={1} type="number" value={line.quantity} onChange={(event) => state.updateLine(section.id, line.id, { quantity: event.target.value })} className="h-14 text-center text-base font-semibold" />
                <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => state.removeLine(section.id, line.id)} aria-label={`حذف المنتج ${index + 1}`}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfferLines({ state, section }: { state: CreateOrderState; section: MarketSectionDraft }) {
  const availableOffers = filterOffersForMarketAndAddress(state.offers, section.marketId, state.selectedAddressRecord);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">العروض</div>
        <Button type="button" variant="outline" disabled={!section.marketId || !availableOffers.length} onClick={() => state.addOffer(section.id)}><Plus className="size-4" />إضافة عرض</Button>
      </div>
      {section.offers.length === 0 ? (
        <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">لا توجد عروض مختارة</div>
      ) : (
        <div className="grid gap-2">
          {section.offers.map((offerLine, index) => (
            <div key={offerLine.id} className="grid gap-3 rounded-md border bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_44px] md:items-center">
              <AppSelect value={offerLine.offerId} onValueChange={(offerId) => state.updateOffer(section.id, offerLine.id, offerId)} placeholder="اختر العرض" ariaLabel={`اختيار العرض ${index + 1}`} className="h-12 bg-input" options={availableOffers.map((offer) => ({ value: String(offer.id), label: offerLabel(offer) }))} />
              <Button type="button" variant="ghost" size="icon" className="size-11" onClick={() => state.removeOffer(section.id, offerLine.id)} aria-label={`حذف العرض ${index + 1}`}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
