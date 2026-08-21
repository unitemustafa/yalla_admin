"use client";

import { Field, Input, SelectBox } from "../primitives";
import { SingleProductPanel } from "./single-product-panel";
import type { CreateOfferFormController } from "./use-create-offer-form";

function PercentInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 ps-10"
      />
      <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">%</span>
    </div>
  );
}

export function OfferKindSettings({ form }: { form: CreateOfferFormController }) {
  const { state } = form;
  if (state.selectedType === "فلاش") {
    return (
      <div className="grid gap-4">
        <Field label="نسبة خصم الفلاش *">
          <PercentInput
            value={state.flashDiscountPercent}
            onChange={(flashDiscountPercent) => form.patchState({ flashDiscountPercent })}
          />
        </Field>
        <SingleProductPanel
          title="منتجات الفلاش"
          description="اختار المنتج اللي هينطبق عليه خصم الفلاش، والمدة بتتحدد من الجدولة."
          selectedItemId={state.flashProductIds[0] ?? ""}
          onSelectItem={(itemId) => form.patchState({ flashProductIds: itemId ? [itemId] : [] })}
          selectedVariantId={state.flashVariantId}
          onSelectVariant={(flashVariantId) => form.patchState({ flashVariantId })}
          quantity={state.flashQuantity}
          onChangeQuantity={(flashQuantity) => form.patchState({ flashQuantity })}
          badgeTone="yellow"
          discountPercent={form.flashDiscountRate}
          contextLabel="الفلاش"
        />
      </div>
    );
  }
  if (state.selectedType === "توصيل") {
    return (
      <div className="grid gap-4">
        <Field label="نوع عرض التوصيل">
          <SelectBox className="h-10">توصيل مجاني</SelectBox>
        </Field>
        <SingleProductPanel
          title="منتجات التوصيل"
          description="اختار المنتج اللي هيظهر عليه التوصيل المجاني، ويمكن اختيار منتج واحد فقط."
          selectedItemId={state.deliveryProductId}
          onSelectItem={(deliveryProductId) => form.patchState({ deliveryProductId })}
          selectedVariantId={state.deliveryVariantId}
          onSelectVariant={(deliveryVariantId) => form.patchState({ deliveryVariantId })}
          quantity={state.deliveryQuantity}
          onChangeQuantity={(deliveryQuantity) => form.patchState({ deliveryQuantity })}
          badgeTone="green"
          contextLabel="عرض التوصيل"
        />
      </div>
    );
  }
  if (state.selectedType === "إعلان") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="أولوية الظهور">
            <Input
              type="number"
              min="0"
              value={state.announcementPriority}
              onChange={(event) => form.patchState({ announcementPriority: event.target.value })}
              className="h-10"
            />
          </Field>
          <Field label="مدة العرض (ثانية)">
            <Input
              type="number"
              min="1"
              value={state.announcementDisplaySeconds}
              onChange={(event) => form.patchState({ announcementDisplaySeconds: event.target.value })}
              className="h-10"
            />
          </Field>
        </div>
        <Field label="الرابط الخارجي (HTTPS) *">
          <Input
            dir="rtl"
            type="url"
            className="h-10 text-right"
            placeholder="https://example.com/campaign"
            value={state.announcementUrl}
            onChange={(event) => form.patchState({ announcementUrl: event.target.value })}
          />
        </Field>
        <Field label="نص زر الإعلان">
          <Input
            className="h-10"
            value={state.announcementCtaLabel}
            onChange={(event) => form.patchState({ announcementCtaLabel: event.target.value })}
            placeholder="تسوق الآن"
          />
        </Field>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <Field label="نسبة الخصم *">
        <PercentInput
          value={state.discountPercent}
          onChange={(discountPercent) => form.patchState({ discountPercent })}
        />
      </Field>
      <SingleProductPanel
        title="منتجات الخصم"
        description="اختار المنتج اللي هينطبق عليه الخصم، ويمكن اختيار منتج واحد فقط."
        selectedItemId={state.discountProductId}
        onSelectItem={(discountProductId) => form.patchState({ discountProductId })}
        selectedVariantId={state.discountVariantId}
        onSelectVariant={(discountVariantId) => form.patchState({ discountVariantId })}
        quantity={state.discountQuantity}
        onChangeQuantity={(discountQuantity) => form.patchState({ discountQuantity })}
        badgeTone="red"
        discountPercent={form.discountRate}
        contextLabel="الخصم"
      />
    </div>
  );
}
