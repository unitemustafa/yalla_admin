"use client";

import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Field, Input } from "../primitives";
import { formatReferenceCurrency } from "../shared/money";
import { lineUnitPrice, selectedItemFrom } from "./form-domain";
import { RefBadge } from "./offer-ui";
import { PackageProductCard } from "./package-product-card";
import { ProductPickerDialog } from "./product-picker-dialog";
import type { CreateOfferFormController } from "./use-create-offer-form";

export function PackageSettings({ form }: { form: CreateOfferFormController }) {
  const { state, pricing } = form;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <Field label="نسبة خصم الباكج *">
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              value={state.packageDiscountPercent}
              onChange={(event) => form.patchState({ packageDiscountPercent: event.target.value })}
              className="h-10 ps-10"
            />
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
          </div>
        </Field>
        <Field label="مجموع المنتجات">
          <Input value={formatReferenceCurrency(pricing.subtotal)} className="h-10" readOnly />
        </Field>
        <Field label="السعر بعد الخصم">
          <Input value={formatReferenceCurrency(pricing.finalPrice)} className="h-10" readOnly />
        </Field>
        <Field label="توفير العميل">
          <Input value={formatReferenceCurrency(pricing.saving)} className="h-10" readOnly />
        </Field>
      </div>

      <div className="overflow-hidden rounded-md border bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <button
            type="button"
            aria-expanded={state.packageProductsOpen}
            onClick={() => form.patchState({ packageProductsOpen: !state.packageProductsOpen })}
            className="min-w-0 flex-1 rounded-md text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">منتجات الباكج</span>
              <RefBadge tone="blue">{state.bundleItems.length} منتجات</RefBadge>
              <RefBadge tone="blue">{form.packageMarketCount} محل</RefBadge>
              <RefBadge tone="gray">{formatReferenceCurrency(pricing.subtotal)}</RefBadge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {form.packageMarketNames || form.packageProductNames || "اختار المنتجات اللي هتدخل في الباكج."}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => form.patchState({ packageProductSearchOpen: true })}
            >
              <Plus className="size-4" />
              إضافة منتج للباكج
            </Button>
            <button
              type="button"
              aria-expanded={state.packageProductsOpen}
              onClick={() => form.patchState({ packageProductsOpen: !state.packageProductsOpen })}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-accent"
            >
              {state.packageProductsOpen ? "إخفاء المنتجات" : "عرض المنتجات"}
              <ChevronDown className={cn("size-4 transition-transform", state.packageProductsOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {state.packageProductsOpen ? (
          <div className="grid gap-3 border-t bg-background/30 p-3">
            {state.bundleItems.map((line) => {
              const item = selectedItemFrom(form.products, line.itemId);
              if (!item) return null;
              return (
                <PackageProductCard
                  key={line.id}
                  line={line}
                  item={item}
                  lineTotal={lineUnitPrice(item, line) * line.quantity}
                  canRemove
                  showProductDiscountControl
                  onChange={(patch) => form.updateBundleLine(line.id, patch)}
                  onRemove={() => form.removeBundleLine(line.id)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <ProductPickerDialog
        open={state.packageProductSearchOpen}
        selectedItemIds={state.bundleItems.map((line) => line.itemId)}
        onClose={() => form.patchState({ packageProductSearchOpen: false })}
        onSelect={form.addBundleProduct}
      />
    </div>
  );
}
