import {
  normalizeStoreSubcategory,
  type StoreSubcategory,
} from "../../store-subcategories-api";
import type {
  NormalizedProduct,
  NormalizedProductAttribute,
  ProductTheme,
  ProductRecord,
  ProductVariantPayload,
  ProductWritePayload,
} from "../types";
import type {
  AttributeDraft,
  CatalogMarket,
  OptionDraft,
  ProductAdditionChoice,
  ProductFormValues,
  VariantDraft,
} from "./types";

const themeTemplates: Record<ProductTheme, AttributeDraft[]> = {
  clothing: [
    { clientId: createId("attr-color"), name: "اللون", options: [] },
    { clientId: createId("attr-size"), name: "المقاس", options: [] },
    { clientId: createId("attr-type"), name: "النوع", options: [] },
  ],
  consumer: [
    { clientId: createId("attr-weight"), name: "الوزن", options: [] },
    { clientId: createId("attr-quantity"), name: "الكمية", options: [] },
  ],
  other: [],
};

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

export function cloneTemplate(theme: ProductTheme) {
  return themeTemplates[theme].map((attribute) => ({
    clientId: createId(attribute.clientId),
    name: attribute.name,
    options: attribute.options.map((option) => ({
      clientId: createId(option.clientId),
      colorHex: colorHexForOption(attribute.name, option.value),
      isActive: true,
      value: option.value,
    })),
  }));
}

export function isColorAttributeName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes("لون") ||
    normalized.includes("ط§ظ„ظ„ظˆظ†") ||
    normalized.includes("color")
  );
}

export function colorHexForOption(attributeName: string, value: string) {
  if (!isColorAttributeName(attributeName)) return undefined;
  const palette: Record<string, string> = {
    "أسود": "#111827",
    "ط£ط³ظˆط¯": "#111827",
    "أحمر": "#dc2626",
    "ط£ط­ظ…ط±": "#dc2626",
    "أخضر": "#16a34a",
    "ط£ط®ط¶ط±": "#16a34a",
    "أبيض": "#f8fafc",
    "ط£ط¨ظٹط¶": "#f8fafc",
    "كريمي": "#f5e6c8",
    "ظƒط±ظٹظ…ظٹ": "#f5e6c8",
    "أزرق": "#2563eb",
    "ط£ط²ط±ظ‚": "#2563eb",
  };
  return palette[value.trim().toLowerCase()] ?? "#94a3b8";
}

export function colorInputValue(value: string | undefined) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#94a3b8";
}

export function emptyVariant(): VariantDraft {
  return {
    tempId: createId("variant"),
    price: "",
    sku: "",
    selections: {},
  };
}

function asRecord(value: unknown): ProductRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ProductRecord)
    : null;
}

function textValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numericId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function optionIsActive(option: OptionDraft) {
  return option.isActive !== false;
}

export function formatApiErrors(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) return value.flatMap(formatApiErrors);
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).flatMap(([key, entry]) =>
    formatApiErrors(entry).map((message) =>
      key === "detail" ? message : `${key}: ${message}`,
    ),
  );
}

export function normalizeMarket(record: ProductRecord): CatalogMarket {
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities.map((city) => textValue(asRecord(city)?.name)).filter(Boolean)
    : [];
  const subcategories = Array.isArray(record.subcategories)
    ? record.subcategories
        .map(normalizeStoreSubcategory)
        .filter((item): item is StoreSubcategory => item !== null)
        .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    : [];
  return {
    id: textValue(record.id),
    name: textValue(record.name, `محل #${textValue(record.id)}`),
    branch: textValue(record.branch),
    status: textValue(record.status, "active"),
    scope: textValue(record.scope, "service_city"),
    serviceCities,
    subcategories,
  };
}

export function additionFromRecord(record: ProductRecord): ProductAdditionChoice {
  const nameAr = textValue(record.name_ar);
  const name =
    nameAr ||
    textValue(record.name, textValue(record.name_en, `إضافة #${textValue(record.id)}`));
  const classification = asRecord(record.classification);
  return {
    classification: textValue(
      record.classification_name,
      textValue(classification?.name, "غير مصنف"),
    ),
    id: textValue(record.id),
    name,
    price: textValue(record.price),
  };
}

export function attributeFromProduct(
  attribute: NormalizedProductAttribute,
): AttributeDraft {
  const attrClientId = attribute.client_id || `attr-${attribute.id ?? createId("loaded")}`;
  return {
    ...(attribute.id === undefined || attribute.id === null ? {} : { id: attribute.id }),
    clientId: attrClientId,
    name: attribute.name,
    options: attribute.options.map((option) => ({
      ...(option.id === undefined || option.id === null ? {} : { id: option.id }),
      clientId: option.client_id || `opt-${option.id ?? createId("loaded")}`,
      colorHex: colorHexForOption(attribute.name, option.value),
      isActive: true,
      value: option.value,
    })),
  };
}

export function variantFromProductVariant(
  value: unknown,
  attributes: AttributeDraft[],
): VariantDraft {
  const record = asRecord(value) ?? {};
  const id = numericId(record.id);
  const selections: Record<string, string> = {};
  const attributeValues = Array.isArray(record.attribute_values)
    ? record.attribute_values
    : [];
  attributeValues.forEach((entry) => {
    const item = asRecord(entry);
    if (!item) return;
    const attrId = numericId(item.product_attribute_id ?? item.attribute_id);
    const optionId = numericId(item.product_attribute_option_id ?? item.option_id);
    const attribute = attributes.find((candidate) => candidate.id === attrId);
    const option = attribute?.options.find((candidate) => candidate.id === optionId);
    if (attribute && option) selections[attribute.clientId] = option.clientId;
  });
  return {
    tempId: createId("variant"),
    ...(id === null ? {} : { id }),
    price: textValue(record.price),
    sku: textValue(record.sku),
    selections,
  };
}

export function productMarketChoice(product: NormalizedProduct): CatalogMarket | null {
  if (product.marketId === null) return null;
  return {
    id: String(product.marketId),
    name: textValue(product.market?.name, `محل #${product.marketId}`),
    branch: textValue(product.market?.branch),
    status: textValue(product.market?.status, "inactive"),
    scope: textValue(product.market?.scope, "service_city"),
    serviceCities: [],
    subcategories: [],
  };
}

export function selectionKeyFromSelections(
  selections: Record<string, string>,
  attributes: AttributeDraft[],
) {
  return attributes
    .map((attribute) => `${attribute.clientId}:${selections[attribute.clientId] ?? ""}`)
    .join("|");
}

export function selectionKey(variant: VariantDraft, attributes: AttributeDraft[]) {
  return selectionKeyFromSelections(variant.selections, attributes);
}

export function variantCombinations(attributes: AttributeDraft[]) {
  if (!attributes.length) return [];
  return attributes.reduce<Record<string, string>[]>((combinations, attribute) => {
    const optionIds = attribute.options.filter(optionIsActive).map((option) => option.clientId);
    if (!optionIds.length) return [];
    return combinations.flatMap((combination) =>
      optionIds.map((optionId) => ({
        ...combination,
        [attribute.clientId]: optionId,
      })),
    );
  }, [{}]);
}

function validPrice(value: string) {
  const trimmed = value.trim();
  return /^\d+(\.\d{1,2})?$/.test(trimmed) && Number(trimmed) >= 0;
}

export function validateProductForm(values: ProductFormValues) {
  if (!values.name.trim()) return "اسم المنتج مطلوب";
  if (!values.selectedMarketId) return "اختر المحل";
  if (!values.selectedSubcategoryId) return "اختر الفئة الداخلية";
  const discountValue = Number(values.discount);
  if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue >= 100) {
    return "الخصم غير صالح";
  }
  const cleanAttributes = values.attributes.filter((attribute) => attribute.name.trim());
  if (!cleanAttributes.length) {
    const priced = values.variantRows.filter((variant) => variant.price.trim());
    if (!values.isAvailable && priced.length === 0) return null;
    if (priced.length !== 1) return "أدخل السعر الأساسي فقط";
    return validPrice(priced[0].price) ? null : "سعر المنتج غير صالح";
  }
  if (!values.isAvailable && values.variantRows.every((variant) => !variant.price.trim())) {
    return null;
  }
  const seen = new Map<string, number>();
  for (const [index, variant] of values.variantRows.entries()) {
    if (!variant.price.trim() || !validPrice(variant.price)) {
      return `سعر المتغير رقم ${index + 1} غير صالح`;
    }
    for (const attribute of cleanAttributes) {
      const selectedOptionId = variant.selections[attribute.clientId];
      if (!selectedOptionId) {
        return `المتغير رقم ${index + 1} ينقصه اختيار ${attribute.name}`;
      }
      const selectedOption = attribute.options.find(
        (option) => option.clientId === selectedOptionId,
      );
      if (!selectedOption || !optionIsActive(selectedOption)) {
        return `اختيار ${attribute.name} في المتغير رقم ${index + 1} غير متاح`;
      }
    }
    const key = selectionKey(variant, cleanAttributes);
    if (seen.has(key)) {
      return `المتغير رقم ${index + 1} يكرر تركيبة المتغير رقم ${seen.get(key)}`;
    }
    seen.set(key, index + 1);
  }
  return null;
}

function attributePayload(attributes: AttributeDraft[]) {
  return attributes
    .filter((attribute) => attribute.name.trim())
    .map((attribute, index) => ({
      ...(attribute.id === undefined ? {} : { id: attribute.id }),
      client_id: attribute.clientId,
      name: attribute.name.trim(),
      sort_order: index,
      options: attribute.options
        .filter((option) => option.value.trim())
        .map((option, optionIndex) => ({
          ...(option.id === undefined ? {} : { id: option.id }),
          client_id: option.clientId,
          value: option.value.trim(),
          sort_order: optionIndex,
        })),
    }));
}

function variantPayloads(
  attributes: AttributeDraft[],
  variantRows: VariantDraft[],
  isAvailable: boolean,
): ProductVariantPayload[] {
  const activeAttributes = attributes.filter((attribute) => attribute.name.trim());
  const sourceRows = activeAttributes.length
    ? variantRows.filter((variant) => isAvailable || variant.price.trim())
    : variantRows.filter((variant) => variant.price.trim()).slice(0, 1);
  return sourceRows.map((variant) => ({
    ...(variant.id !== undefined ? { id: variant.id } : {}),
    price: Number(variant.price).toFixed(2),
    selections: activeAttributes.map((attribute) => ({
      attribute_client_id: attribute.clientId,
      option_client_id: variant.selections[attribute.clientId],
    })),
  }));
}

export function buildProductPayload(
  values: ProductFormValues,
  options: { includeVariants: boolean },
): ProductWritePayload {
  return {
    market_id: Number(values.selectedMarketId),
    subcategory_id: Number(values.selectedSubcategoryId),
    theme: values.theme,
    is_popular: values.isPopular,
    is_available: values.isAvailable,
    name: values.name.trim(),
    description: values.description.trim(),
    discount: Number(values.discount || 0).toFixed(2),
    additions: values.selectedAdditionIds.filter(Number.isFinite),
    ...(options.includeVariants
      ? {
          attributes: attributePayload(values.attributes),
          variants: variantPayloads(
            values.attributes,
            values.variantRows,
            values.isAvailable,
          ),
        }
      : {}),
  };
}
