import type {
  PreviewAttributeChoice,
  ProductLivePreviewAddition,
  ProductLivePreviewAttribute,
  ProductLivePreviewMarket,
  ProductLivePreviewOption,
  ProductLivePreviewVariant,
} from "./types";

function numberFromText(value: string) {
  return Number(value.replace(/[^\d.]/g, ""));
}

export function formatPriceAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function validPreviewPrice(value: string) {
  const trimmed = value.trim();
  return Boolean(trimmed && /^\d+(\.\d{1,2})?$/.test(trimmed) && Number.isFinite(Number(trimmed)));
}

export function isPreviewColorAttribute(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes("لون") ||
    normalized.includes("ط§ظ„ظ„ظˆظ†") ||
    normalized.includes("color")
  );
}

export function previewOptionIsActive(option: ProductLivePreviewOption) {
  return option.isActive !== false;
}

function discountPercent(value: string) {
  const percent = numberFromText(value);
  return Number.isFinite(percent) && percent > 0 && percent < 100 ? percent : 0;
}

export function oldPriceFromDiscount(price: string, discount: string) {
  const currentPrice = numberFromText(price);
  const percent = discountPercent(discount);
  return currentPrice && percent
    ? formatPriceAmount(currentPrice / (1 - percent / 100))
    : "";
}

export function discountLabel(discount: string) {
  const percent = discountPercent(discount);
  return percent ? `${formatPriceAmount(percent)}%` : "";
}

export function firstValidPreviewVariant(variants: ProductLivePreviewVariant[]) {
  return variants.find((variant) => validPreviewPrice(variant.price)) ?? null;
}

export function previewAttributeKey(attribute: ProductLivePreviewAttribute) {
  return attribute.id !== undefined
    ? `id:${attribute.id}`
    : `client:${attribute.clientId ?? ""}`;
}

export function previewOptionKey(option: ProductLivePreviewOption) {
  return option.id !== undefined ? `id:${option.id}` : `client:${option.clientId ?? ""}`;
}

function selectionAttributeKey(value: {
  attribute_id?: number;
  attributeId?: number;
  attributeClientId?: string;
}) {
  const id = value.attribute_id ?? value.attributeId;
  return id !== undefined ? `id:${id}` : `client:${value.attributeClientId ?? ""}`;
}

function selectionOptionKey(value: {
  option_id?: number;
  optionId?: number;
  optionClientId?: string;
}) {
  const id = value.option_id ?? value.optionId;
  return id !== undefined ? `id:${id}` : `client:${value.optionClientId ?? ""}`;
}

function variantSelections(variant: ProductLivePreviewVariant | null) {
  if (!variant) return [];
  return variant.selections?.length ? variant.selections : variant.attributeValues;
}

export function selectedPreviewOptionId(
  variant: ProductLivePreviewVariant | null,
  attribute: ProductLivePreviewAttribute,
) {
  const key = previewAttributeKey(attribute);
  const selection = variantSelections(variant).find(
    (value) => selectionAttributeKey(value) === key,
  );
  return selection ? selectionOptionKey(selection) : undefined;
}

export function previewMarketName(
  markets: ProductLivePreviewMarket[],
  selectedMarketId: string,
) {
  const market = markets.find((item) => item.id === selectedMarketId);
  if (!market) return "لم يتم اختيار المحل";
  return market.branch ? `${market.name} - ${market.branch}` : market.name;
}

export function selectedPreviewAdditions(
  additions: ProductLivePreviewAddition[],
  selectedAdditionIds: number[],
) {
  const selectedIds = new Set(selectedAdditionIds.map(String));
  return additions.filter((addition) => selectedIds.has(addition.id));
}

export function previewAttributeChoices(
  attributes: ProductLivePreviewAttribute[],
): PreviewAttributeChoice[] {
  return attributes
    .map((attribute) => ({ attribute, options: attribute.options }))
    .filter((item) => item.options.length > 0);
}

export function matchingPreviewVariant(
  variants: ProductLivePreviewVariant[],
  selection: Record<string, string>,
) {
  const entries = Object.entries(selection);
  return (
    variants.find((variant) =>
      entries.every(([attributeId, optionId]) =>
        variantSelections(variant).some(
          (value) =>
            selectionAttributeKey(value) === attributeId &&
            selectionOptionKey(value) === optionId,
        ),
      ),
    ) ?? null
  );
}

export function previewVariantMatchesSelection(
  variant: ProductLivePreviewVariant,
  selection: Record<string, string>,
) {
  return Object.entries(selection).every(([attributeId, optionId]) =>
    variantSelections(variant).some(
      (value) =>
        selectionAttributeKey(value) === attributeId && selectionOptionKey(value) === optionId,
    ),
  );
}

export function previewVariantUsesOnlyActiveOptions(
  variant: ProductLivePreviewVariant,
  attributes: ProductLivePreviewAttribute[],
) {
  return variantSelections(variant).every((selection) => {
    const attribute = attributes.find(
      (item) => previewAttributeKey(item) === selectionAttributeKey(selection),
    );
    const option = attribute?.options.find(
      (item) => previewOptionKey(item) === selectionOptionKey(selection),
    );
    return Boolean(option && previewOptionIsActive(option));
  });
}
