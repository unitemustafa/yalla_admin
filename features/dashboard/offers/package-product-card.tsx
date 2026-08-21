"use client";

import { Trash2 } from "lucide-react";

import type { ItemRow } from "../products/types";
import { AppSelect, Input, Switch } from "../primitives";
import { formatReferenceCurrency } from "../shared/money";
import {
  clampDiscountPercent,
  lineUnitPrice,
  variantPriceValue,
} from "./form-domain";
import type { BundleLine } from "./form-types";
import { MiniIconButton, RefBadge } from "./offer-ui";
import { ProductPicker } from "./product-picker";
import { variantLabel } from "./product-domain";
import { DashboardImage } from "../dashboard-image";

export function PackageProductCard({
  line,
  item,
  lineTotal,
  canRemove,
  contextLabel = "الباكج",
  discountPercent,
  showProductDiscountControl = false,
  onChange,
  onRemove,
}: {
  line: BundleLine;
  item: ItemRow;
  lineTotal: number;
  canRemove: boolean;
  contextLabel?: string;
  discountPercent?: number;
  showProductDiscountControl?: boolean;
  onChange: (patch: Partial<BundleLine>) => void;
  onRemove: () => void;
}) {
  const originalUnitPrice = variantPriceValue(item, line.variantId ?? "");
  const unitPrice = lineUnitPrice(item, line);
  const productDiscountPercent = clampDiscountPercent(item.discountPercent ?? 0);
  const discountedPrice = typeof discountPercent === "number"
    ? unitPrice * (1 - clampDiscountPercent(discountPercent) / 100)
    : unitPrice;

  return (
    <div className="rounded-md border bg-background p-3 shadow-sm transition hover:border-primary/30">
      <div className="grid gap-3 lg:grid-cols-[72px_minmax(0,1fr)_minmax(260px,320px)]">
        <DashboardImage
          src={item.image}
          placeholderType="product"
          alt=""
          width={144}
          height={144}
          sizes="72px"
          className="size-18 rounded-md"
          imageClassName="object-cover"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RefBadge tone="gray">#{item.index}</RefBadge>
            <RefBadge tone={item.active ? "green" : "red"}>{item.active ? "نشط" : "متوقف"}</RefBadge>
            {item.featured === "نعم" ? <RefBadge tone="purple">مميز</RefBadge> : null}
          </div>
          <h4 className="mt-2 truncate text-base font-semibold">{item.name}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.description || "لا يوجد وصف للمنتج حاليا."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-muted/40 px-2 py-1">{item.category}</span>
            <span className="rounded-md bg-muted/40 px-2 py-1">{item.subcategory}</span>
            <span className="rounded-md bg-muted/40 px-2 py-1">
              السعر الأصلي: {formatReferenceCurrency(originalUnitPrice)}
            </span>
            {productDiscountPercent > 0 && line.applyProductDiscount !== false ? (
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600">
                بعد خصم المنتج: {formatReferenceCurrency(unitPrice)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <ProductPicker
            label={`المنتج داخل ${contextLabel}`}
            value={line.itemId}
            onChange={(itemId) => onChange({ itemId })}
          />
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            التركيبة داخل {contextLabel}
            <AppSelect
              ariaLabel={`التركيبة داخل ${contextLabel}`}
              className="h-10"
              onValueChange={(variantId) => onChange({ variantId })}
              options={(item.variants ?? []).map((variant) => ({
                value: String(variant.id),
                label: variantLabel(item, String(variant.id)),
              }))}
              placeholder="اختر التركيبة"
              value={line.variantId ?? ""}
            />
            {!line.variantId && (item.variants?.length ?? 0) > 1 ? (
              <span className="text-[11px] font-semibold text-amber-600">
                المنتج له أكثر من تركيبة؛ اختر واحدة لتحديد السعر الصحيح.
              </span>
            ) : null}
          </label>

          {showProductDiscountControl && productDiscountPercent > 0 ? (
            <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2">
              <span>
                <span className="block text-xs font-semibold text-foreground">
                  تطبيق خصم المنتج ({productDiscountPercent}%)
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  يطبق أولًا، ثم يحسب خصم الباكدج على الإجمالي الناتج.
                </span>
              </span>
              <Switch
                checked={line.applyProductDiscount !== false}
                onCheckedChange={(checked) => onChange({ applyProductDiscount: checked })}
                aria-label={`تطبيق خصم المنتج على ${item.name}`}
              />
            </label>
          ) : null}

          <div className="grid grid-cols-[86px_minmax(0,1fr)_40px] items-end gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              الكمية
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) => onChange({ quantity: Number(event.target.value) || 1 })}
                className="h-10"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              إجمالي السطر
              <Input value={formatReferenceCurrency(lineTotal)} className="h-10" readOnly />
            </label>
            <MiniIconButton
              tone="red"
              ariaLabel={`حذف منتج من ${contextLabel}`}
              onClick={onRemove}
              disabled={!canRemove}
            >
              <Trash2 className="size-4" />
            </MiniIconButton>
          </div>
        </div>
      </div>

      <details className="mt-3 rounded-md border bg-muted/10 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          عرض تفاصيل المنتج داخل {contextLabel}
        </summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            سعر خاص داخل {contextLabel}
            <Input placeholder={formatReferenceCurrency(discountedPrice)} className="h-10" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            عنوان قصير للعميل
            <Input defaultValue={item.name} className="h-10" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground lg:col-span-2">
            وصف المنتج داخل العرض
            <textarea
              defaultValue={item.description}
              className="min-h-[82px] rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
      </details>
    </div>
  );
}
