"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { DashboardImage } from "../dashboard-image";
import { selectedItemFrom } from "./form-domain";
import { useOfferProducts } from "./product-context";
import { itemPriceLabel } from "./product-domain";
import { ProductPickerDialog } from "./product-picker-dialog";

export function ProductPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (itemId: string) => void;
}) {
  const products = useOfferProducts();
  const [open, setOpen] = useState(false);
  const selectedItem = selectedItemFrom(products, value);

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Link
          href="/items/create"
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-accent"
        >
          <Plus className="size-3.5" />
          إضافة منتج
        </Link>
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-background p-2 shadow-sm">
        <DashboardImage
          src={selectedItem?.image ?? ""}
          placeholderType="product"
          alt=""
          width={88}
          height={88}
          sizes="44px"
          className="size-11 rounded-md"
          imageClassName="object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{selectedItem?.name ?? "لم يتم اختيار منتج"}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{selectedItem?.category ?? ""}</span>
            <span className="shrink-0">{selectedItem ? itemPriceLabel(selectedItem) : ""}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!products.length}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Search className="size-3.5" />
          تغيير
        </button>
      </div>

      <ProductPickerDialog
        open={open}
        selectedItemIds={[value]}
        title={`تغيير ${label}`}
        description="ابحث بالاسم أو الكود، أو اختار من تصنيفات كل المنتجات."
        selectedLabel="المنتج الحالي"
        onClose={() => setOpen(false)}
        onSelect={(itemId) => {
          onChange(itemId);
          setOpen(false);
        }}
      />
    </div>
  );
}
