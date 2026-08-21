"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "../primitives";
import { formatReferenceCurrency } from "../shared/money";
import { useSnackbar } from "../snackbar";
import {
  clampDiscountPercent,
  defaultVariantId,
  variantPriceValue,
} from "./form-domain";
import type { BundleLine } from "./form-types";
import type { BadgeTone } from "./offer-ui";
import { RefBadge } from "./offer-ui";
import { PackageProductCard } from "./package-product-card";
import { useOfferProducts } from "./product-context";
import { variantLabel } from "./product-domain";
import { ProductPickerDialog } from "./product-picker-dialog";

export function SingleProductPanel({
  title,
  description,
  selectedItemId,
  onSelectItem,
  selectedVariantId,
  onSelectVariant,
  quantity,
  onChangeQuantity,
  badgeTone,
  discountPercent,
  contextLabel = "العرض",
}: {
  title: string;
  description: string;
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  badgeTone: BadgeTone;
  discountPercent?: number;
  contextLabel?: string;
}) {
  const products = useOfferProducts();
  const { showSnackbar } = useSnackbar();
  const [productsOpen, setProductsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const item = products.find((product) => product.id === selectedItemId) ?? null;
  const variantText = item && selectedVariantId ? variantLabel(item, selectedVariantId) : "";
  const productTotal = item
    ? variantPriceValue(item, selectedVariantId) *
      (typeof discountPercent === "number" ? 1 - clampDiscountPercent(discountPercent) / 100 : 1) *
      quantity
    : 0;
  const line: BundleLine = {
    id: `single-${selectedItemId || "empty"}`,
    itemId: selectedItemId,
    variantId: selectedVariantId,
    quantity,
    applyProductDiscount: true,
  };

  function selectProduct(itemId: string) {
    const nextItem = products.find((product) => product.id === itemId) ?? null;
    onSelectItem(itemId);
    onSelectVariant(defaultVariantId(nextItem));
    onChangeQuantity(1);
    setSearchOpen(false);
    setProductsOpen(true);
  }

  function removeProduct() {
    if (item) showSnackbar({ message: `تم حذف ${item.name} من ${contextLabel}.`, tone: "danger" });
    onSelectItem("");
    onSelectVariant("");
    onChangeQuantity(1);
    setProductsOpen(false);
  }

  function updateLine(patch: Partial<BundleLine>) {
    if (patch.itemId) {
      const nextItem = products.find((product) => product.id === patch.itemId) ?? null;
      onSelectItem(patch.itemId);
      onSelectVariant(defaultVariantId(nextItem));
    }
    if (patch.variantId !== undefined) onSelectVariant(patch.variantId);
    if (typeof patch.quantity === "number") {
      onChangeQuantity(Math.max(1, Math.min(99, patch.quantity)));
    }
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border bg-muted/10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
          <button
            type="button"
            aria-expanded={productsOpen}
            onClick={() => item && setProductsOpen((open) => !open)}
            className="min-w-0 flex-1 rounded-md text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              <RefBadge tone={badgeTone}>{item ? "1 منتج" : "0 منتج"}</RefBadge>
              {item ? <RefBadge tone="gray">{formatReferenceCurrency(productTotal)}</RefBadge> : null}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item ? `${item.name}${variantText ? ` · ${variantText}` : " · اختر التركيبة"}` : "لم يتم اختيار منتج بعد."}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={() => setSearchOpen(true)}>
              <Plus className="size-4" />
              إضافة منتج
            </Button>
            {item ? (
              <button
                type="button"
                aria-expanded={productsOpen}
                onClick={() => setProductsOpen((open) => !open)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold text-primary shadow-sm transition hover:bg-accent"
              >
                {productsOpen ? "إخفاء المنتجات" : "عرض المنتجات"}
                <ChevronDown className={cn("size-4 transition-transform", productsOpen && "rotate-180")} />
              </button>
            ) : null}
          </div>
        </div>

        {productsOpen && item ? (
          <div className="grid gap-3 border-t bg-background/30 p-3">
            <PackageProductCard
              line={line}
              item={item}
              lineTotal={productTotal}
              canRemove
              contextLabel={contextLabel}
              discountPercent={discountPercent}
              onChange={updateLine}
              onRemove={removeProduct}
            />
          </div>
        ) : null}
      </div>

      <ProductPickerDialog
        open={searchOpen}
        selectedItemIds={selectedItemId ? [selectedItemId] : []}
        title={`إضافة منتج إلى ${title}`}
        description={description}
        selectedLabel="المنتج المحدد"
        onClose={() => setSearchOpen(false)}
        onSelect={selectProduct}
      />
    </div>
  );
}
