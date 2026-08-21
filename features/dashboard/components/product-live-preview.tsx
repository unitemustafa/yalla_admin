"use client";

import { useMemo, useState } from "react";
import { Check, ChefHat, ImagePlus, Plus, Sparkles, Store, X } from "lucide-react";

import { DashboardImage } from "../dashboard-image";
import { CurrencyText } from "../primitives";
import { cn } from "@/lib/utils";
import {
  discountLabel,
  firstValidPreviewVariant,
  formatPriceAmount,
  isPreviewColorAttribute,
  matchingPreviewVariant,
  oldPriceFromDiscount,
  previewAttributeChoices,
  previewAttributeKey,
  previewMarketName,
  previewOptionIsActive,
  previewOptionKey,
  previewVariantMatchesSelection,
  previewVariantUsesOnlyActiveOptions,
  selectedPreviewAdditions,
  selectedPreviewOptionId,
  validPreviewPrice,
} from "../products/preview/domain";
import type {
  PreviewAttributeChoice,
  ProductLivePreviewProps,
  ProductLivePreviewVariant,
} from "../products/preview/types";

function AppPreviewPriceHeader({
  discount,
  oldPrice,
  price,
}: {
  discount: string;
  oldPrice: string;
  price: string;
}) {
  const priceParts = price.startsWith("EGP ") ? price.split(/\s+/) : ["", price];
  const currency = priceParts[0] ?? "";
  const amount = priceParts.slice(1).join(" ") || price;

  return (
    <div className="w-full rounded-lg border border-white/10 bg-[#2A2A2A] p-2 shadow-sm">
      <div className="flex items-center gap-2">
        {discount ? (
          <span
            className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[#FFA000] px-3 text-xs font-black text-black shadow-[0_6px_12px_rgba(255,160,0,0.22)]"
            data-testid="preview-discount"
          >
            {discount}
          </span>
        ) : null}
        <div className="flex min-h-11 flex-1 items-center justify-start gap-2 rounded-lg bg-[#0B6B4F]/20 px-3 py-2">
          <span className="min-w-0 truncate text-xl font-black" data-testid="preview-price">
            <span className="currency-text">{currency}</span>{" "}
            <span className="text-white">{amount}</span>
          </span>
          {oldPrice ? (
            <CurrencyText className="min-w-0 truncate text-sm font-bold text-white/45 line-through">
              {oldPrice}
            </CurrencyText>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AppPreviewVariants({
  fields,
  onSelect,
  selectedVariant,
}: {
  fields: PreviewAttributeChoice[];
  onSelect: (previewAttributeKeyValue: string, previewOptionKeyValue: string) => void;
  selectedVariant: ProductLivePreviewVariant | null;
}) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-5">
      {fields.map(({ attribute, options }) => (
        <div key={previewAttributeKey(attribute)}>
          <div className="mb-2 text-right text-xl font-black leading-6 text-white">
            {attribute.name}
          </div>
          <div
            className={cn(
              "grid gap-2",
              options.length <= 2
                ? "grid-cols-2"
                : options.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-4",
            )}
          >
            {options.map((option) => {
              const currentAttributeKey = previewAttributeKey(attribute);
              const currentOptionKey = previewOptionKey(option);
              const selected = selectedPreviewOptionId(selectedVariant, attribute) === currentOptionKey;
              const isColor = isPreviewColorAttribute(attribute.name);
              const active = previewOptionIsActive(option);

              return (
                <button
                  key={currentOptionKey}
                  aria-pressed={selected}
                  className={cn(
                    "flex h-10 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-black transition",
                    selected
                      ? "border-[#0B6B4F] bg-[#0B6B4F] text-white"
                      : "border-white/10 bg-[#2A2A2A] text-white/85 hover:border-white/30 hover:bg-white/10",
                    !active && "cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-[#2A2A2A]",
                  )}
                  data-testid={`preview-option-${currentAttributeKey}-${currentOptionKey}`}
                  disabled={!active}
                  onClick={() => onSelect(currentAttributeKey, currentOptionKey)}
                  type="button"
                >
                  {isColor ? (
                    <span
                      className="size-5 shrink-0 rounded-md border border-white/30 shadow-inner"
                      style={{ backgroundColor: option.colorHex ?? "#94a3b8" }}
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{option.value}</span>
                  {selected ? <Check className="size-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductLivePreview({
  additions,
  attributes,
  description,
  discount,
  imageSrc,
  isAvailable,
  isPopular,
  markets,
  name,
  previewSource,
  selectedAdditionIds,
  selectedMarketId,
  variantRows,
}: ProductLivePreviewProps) {
  const validVariants = useMemo(
    () =>
      variantRows.filter(
        (variant) => validPreviewPrice(variant.price) && previewVariantUsesOnlyActiveOptions(variant, attributes),
      ),
    [attributes, variantRows],
  );
  const [previewSelection, setPreviewSelection] = useState<Record<string, string>>({});
  const [additionSheetOpen, setAdditionSheetOpen] = useState(false);
  const [previewAdditionIds, setPreviewAdditionIds] = useState<string[]>([]);
  const firstValidVariant = useMemo(
    () => firstValidPreviewVariant(validVariants),
    [validVariants],
  );

  const previewSelectionComplete =
    attributes.length > 0 &&
    attributes.every((attribute) => Boolean(previewSelection[previewAttributeKey(attribute)]));
  const selectedVariant = attributes.length
    ? previewSelectionComplete
      ? matchingPreviewVariant(validVariants, previewSelection)
      : null
    : firstValidVariant;
  const matchingPreviewVariants = attributes.length && Object.keys(previewSelection).length
    ? validVariants.filter((variant) => previewVariantMatchesSelection(variant, previewSelection))
    : validVariants;
  const priceSource = previewSelectionComplete
    ? selectedVariant
      ? [selectedVariant]
      : []
    : matchingPreviewVariants;
  const validPreviewPrices = priceSource.map((variant) => Number(variant.price));
  const uniquePrices = Array.from(new Set(validPreviewPrices));
  const minPrice = validPreviewPrices.length ? Math.min(...validPreviewPrices) : null;
  const maxPrice = validPreviewPrices.length ? Math.max(...validPreviewPrices) : null;
  const currentPrice = selectedVariant?.price.trim() ?? "";
  const unavailableSelection = previewSelectionComplete && validVariants.length > 0 && !selectedVariant;
  const currentPriceText = currentPrice
    ? `${formatPriceAmount(Number(currentPrice))} EGP`
    : unavailableSelection
      ? "هذا الاختيار غير متاح"
    : uniquePrices.length === 0
      ? "أدخل سعر المنتج"
      : uniquePrices.length === 1
        ? `${formatPriceAmount(uniquePrices[0])} EGP`
        : `من ${formatPriceAmount(minPrice ?? 0)} إلى ${formatPriceAmount(maxPrice ?? 0)} EGP`;
  const oldPrice = currentPrice ? oldPriceFromDiscount(currentPrice, discount) : "";
  const currentDiscount = currentPrice ? discountLabel(discount) : "";
  const currentMarketName = previewMarketName(markets, selectedMarketId);
  const visibleAdditions = selectedPreviewAdditions(additions, selectedAdditionIds);
  const previewSelectedAdditions = visibleAdditions.filter((addition) =>
    previewAdditionIds.includes(addition.id),
  );
  const variantFields = previewAttributeChoices(attributes);
  const statusText = isAvailable ? "متاح" : "غير متاح";
  const statusPillClass = isAvailable
    ? "bg-emerald-500/15 text-emerald-400"
    : "bg-[#EF4444]/15 text-[#EF4444]";
  const productTitle = name.trim() || "منتج جديد";
  const productDescription = description.trim() || "لم يتم إدخال وصف للمنتج.";
  function selectPreviewOption(attributeId: string, optionId: string) {
    const nextSelection = { ...previewSelection, [attributeId]: optionId };
    setPreviewSelection(nextSelection);
  }

  function togglePreviewAddition(additionId: string) {
    setPreviewAdditionIds((current) =>
      current.includes(additionId)
        ? current.filter((id) => id !== additionId)
        : [...current, additionId],
    );
  }

  return (
    <section
      className="h-full rounded-lg border bg-card p-4 shadow-sm"
      data-testid="product-live-preview"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ChefHat className="size-4" />
          </span>
          معاينة مباشرة
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-bold",
            previewSource === "api"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100",
          )}
        >
          {previewSource === "api" ? "بيانات محفوظة من API" : "بيانات غير محفوظة"}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-[#1A1A1A] p-2 text-white shadow-xl">
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#1A1A1A]">
          <div className="rounded-b-lg bg-[#2A2A2A] px-4 pb-4 pt-4">
            <div className="flex h-[226px] items-center justify-center">
              {imageSrc ? (
                <DashboardImage
                  alt={productTitle}
                  placeholderType="product"
                  className="h-full w-full bg-transparent"
                  height={226}
                  imageClassName="object-contain"
                  sizes="360px"
                  src={imageSrc}
                  unoptimized={imageSrc.startsWith("blob:")}
                  width={360}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-lg bg-white/5"
                  data-testid="preview-image-placeholder"
                >
                  <ImagePlus className="size-10 text-white/45" />
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <AppPreviewPriceHeader
              discount={currentDiscount}
              oldPrice={oldPrice ? `EGP ${oldPrice}` : ""}
              price={currentPriceText}
            />

            <h2 className="mt-4 min-w-0 text-right text-[23px] font-black leading-tight" data-testid="preview-name">
              {productTitle}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
              <span className={cn("rounded-lg px-2.5 py-2 text-xs font-black", statusPillClass)}>
                {statusText}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-white/10 bg-[#2A2A2A] px-2.5 py-2 text-xs font-black">
                <Store className="size-3.5 shrink-0 text-[#0B6B4F]" />
                <span className="truncate">{currentMarketName}</span>
              </span>
              {isPopular ? (
                <span className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-[#FFA000]/25 bg-[#FFA000]/15 px-2.5 py-2 text-xs font-black text-[#FFA000]">
                  <Sparkles className="size-3.5 shrink-0" />
                  <span className="truncate">منتج شائع</span>
                </span>
              ) : null}
            </div>

            <AppPreviewVariants
              fields={variantFields}
              onSelect={selectPreviewOption}
              selectedVariant={selectedVariant}
            />

            <div className="mt-5 rounded-lg border border-white/10 bg-[#2A2A2A] p-3">
              <h3 className="text-right text-base font-black">الوصف</h3>
              <p className="mt-2 text-right text-sm font-semibold leading-6 text-white/55" data-testid="preview-description">
                {productDescription}
              </p>
            </div>

            {visibleAdditions.length ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-[#2A2A2A] p-3">
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm font-black transition hover:bg-white/10"
                  onClick={() => setAdditionSheetOpen(true)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="size-4 text-[#0B6B4F]" />
                    الإضافات
                  </span>
                  <span className="text-white/55">
                    {previewSelectedAdditions.length
                      ? `${previewSelectedAdditions.length} محددة`
                      : "اختيار"}
                  </span>
                </button>
                {previewSelectedAdditions.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previewSelectedAdditions.map((addition) => (
                      <span
                        key={addition.id}
                        className="rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1 text-xs font-bold text-white/85"
                      >
                        {addition.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {additionSheetOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-foreground/30 backdrop-blur-[1px]">
          <div className="w-full rounded-t-2xl border border-white/10 bg-[#1A1A1A] p-4 text-white shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/35" />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">الإضافات</h3>
              <button
                aria-label="إغلاق"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/70"
                onClick={() => setAdditionSheetOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid max-h-[45vh] gap-2 overflow-y-auto">
              {visibleAdditions.map((addition) => {
                const selected = previewAdditionIds.includes(addition.id);
                return (
                  <button
                    key={addition.id}
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition",
                      selected
                        ? "border-[#0B6B4F] bg-[#0B6B4F]/20"
                        : "border-white/10 bg-[#2A2A2A]",
                    )}
                    onClick={() => togglePreviewAddition(addition.id)}
                    type="button"
                  >
                    <span className="min-w-0 truncate text-right font-bold">{addition.name}</span>
                    <span className="flex items-center gap-2">
                      <CurrencyText className="text-xs font-black text-[#0B6B4F]">
                        {addition.price ? `EGP ${addition.price}` : "EGP 0"}
                      </CurrencyText>
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded border",
                          selected ? "border-[#0B6B4F] bg-[#0B6B4F]" : "border-white/20",
                        )}
                      >
                        {selected ? <Check className="size-3.5 text-white" /> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              className="mt-4 h-11 w-full rounded-lg bg-[#0B6B4F] text-sm font-black text-white"
              onClick={() => setAdditionSheetOpen(false)}
              type="button"
            >
              موافق
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
