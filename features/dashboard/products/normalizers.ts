import { normalizeImageSrc } from "@/lib/media-url";

import type { ShopRow } from "../admin-api";
import { formatMoney, safeNumber } from "../shared/money";
import type {
  ItemRow,
  NormalizedProduct,
  NormalizedProductAttribute,
  NormalizedProductAttributeOption,
  NormalizedProductImage,
  ProductTheme,
  ProductRecord,
  ProductVariant,
} from "./types";

const fallbackImage = "/default-user-avatar.svg";

type ProductLike = {
  variants?: unknown;
};

function backendRecord(value: unknown): ProductRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ProductRecord)
    : null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(record: ProductRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function bool(record: ProductRecord, keys: string[], fallback = true) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["active", "true", "1", "yes"].includes(normalized)) return true;
      if (["inactive", "false", "0", "no"].includes(normalized)) return false;
    }
  }
  return fallback;
}

function recordId(record: ProductRecord, index: number) {
  return text(record, ["id", "_id", "uuid", "slug"], String(index + 1));
}

function nestedName(value: unknown) {
  if (typeof value === "string") return value;
  const record = backendRecord(value);
  return record ? text(record, ["name", "name_ar", "name_en", "title"]) : "";
}

function nestedNames(values: unknown[]) {
  return values.map(nestedName).filter(Boolean).join("، ");
}

function normalizeAdditionId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const record = backendRecord(value);
  return record ? nullableNumber(record.id) : null;
}

function normalizeProductImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "[object object]") {
    return null;
  }
  return normalizeImageSrc(trimmed);
}

function normalizeProductImageRecord(value: unknown): NormalizedProductImage | null {
  const record = backendRecord(value);
  const imageId = nullableNumber(record?.id);
  if (!record || imageId === null) return null;

  return {
    id: imageId,
    image: normalizeProductImageUrl(record.image),
    url: normalizeProductImageUrl(record.url),
    isPrimary: record.is_primary === true || record.isPrimary === true,
    sortOrder: nullableNumber(record.sort_order ?? record.sortOrder) ?? 0,
  };
}

function productTheme(value: unknown): ProductTheme {
  return value === "clothing" || value === "consumer" || value === "other"
    ? value
    : "other";
}

function normalizeProductAttributeOption(
  raw: unknown,
): NormalizedProductAttributeOption | null {
  const record = backendRecord(raw);
  if (!record) return null;
  const idValue = nullableNumber(record.id);
  const value = typeof record.value === "string" ? record.value.trim() : "";
  if (!value) return null;

  return {
    ...(idValue === null ? {} : { id: idValue }),
    client_id: typeof record.client_id === "string" ? record.client_id : undefined,
    value,
    sort_order: nullableNumber(record.sort_order) ?? 0,
  };
}

function normalizeProductAttribute(raw: unknown): NormalizedProductAttribute | null {
  const record = backendRecord(raw);
  if (!record) return null;
  const idValue = nullableNumber(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  return {
    ...(idValue === null ? {} : { id: idValue }),
    client_id: typeof record.client_id === "string" ? record.client_id : undefined,
    name,
    sort_order: nullableNumber(record.sort_order) ?? 0,
    options: Array.isArray(record.options)
      ? record.options
          .map(normalizeProductAttributeOption)
          .filter((option): option is NormalizedProductAttributeOption => Boolean(option))
      : [],
  };
}

export function normalizeProduct(raw: unknown): NormalizedProduct {
  const record = backendRecord(raw) ?? {};
  const market = backendRecord(record.market);
  const category = backendRecord(record.category);
  const subcategory = backendRecord(record.subcategory);
  const subcategories = Array.isArray(record.subcategories)
    ? record.subcategories
        .map(backendRecord)
        .filter((item): item is ProductRecord => item !== null)
    : subcategory ? [subcategory] : [];
  const subcategoryIds = subcategories
    .map((item) => nullableNumber(item.id))
    .filter((id): id is number => id !== null);
  const primarySubcategoryId = nullableNumber(
    record.subcategory_id ?? record.subcategoryId ?? subcategory?.id,
  );
  const orderedSubcategoryIds = [
    ...(primarySubcategoryId === null ? [] : [primarySubcategoryId]),
    ...subcategoryIds.filter((id) => id !== primarySubcategoryId),
  ];
  const variants = Array.isArray(record.variants)
    ? record.variants
        .map((variant) => backendRecord(variant))
        .filter((variant): variant is ProductRecord => Boolean(variant))
        .map((variant) => ({
          ...variant,
          id:
            nullableNumber(variant.id) ??
            (typeof variant.id === "string" ? variant.id : null),
          price:
            typeof variant.price === "number" || typeof variant.price === "string"
              ? variant.price
              : "",
          sku: typeof variant.sku === "string" ? variant.sku : null,
          attribute_values: Array.isArray(variant.attribute_values)
            ? variant.attribute_values
            : [],
        }))
    : [];

  return {
    id: Number(record.id),
    name: typeof record.name === "string" ? record.name : "",
    description: typeof record.description === "string" ? record.description : "",
    marketId: nullableNumber(record.market_id ?? record.marketId ?? market?.id),
    market,
    categoryId: nullableNumber(record.category_id ?? record.categoryId ?? category?.id),
    category,
    subcategoryId: primarySubcategoryId,
    subcategory,
    subcategoryIds: orderedSubcategoryIds,
    subcategories,
    theme: productTheme(record.theme),
    isPopular:
      typeof record.is_popular === "boolean"
        ? record.is_popular
        : typeof record.isPopular === "boolean"
          ? record.isPopular
          : false,
    image: normalizeProductImageUrl(record.image),
    images: Array.isArray(record.images)
      ? record.images
          .map(normalizeProductImageRecord)
          .filter((image): image is NormalizedProductImage => Boolean(image))
          .sort((first, second) => first.sortOrder - second.sortOrder || first.id - second.id)
      : [],
    discount:
      typeof record.discount === "number" || typeof record.discount === "string"
        ? record.discount
        : "0.00",
    isAvailable:
      typeof record.is_available === "boolean"
        ? record.is_available
        : typeof record.isAvailable === "boolean"
          ? record.isAvailable
          : Boolean(record.is_available),
    archivedAt:
      typeof record.archived_at === "string"
        ? record.archived_at
        : typeof record.archivedAt === "string"
          ? record.archivedAt
          : null,
    deletionMode: "archive",
    additions: Array.isArray(record.additions)
      ? record.additions
          .map(normalizeAdditionId)
          .filter((additionId): additionId is number => additionId !== null)
      : [],
    attributes: Array.isArray(record.attributes)
      ? record.attributes
          .map(normalizeProductAttribute)
          .filter((attribute): attribute is NormalizedProductAttribute => Boolean(attribute))
      : [],
    variants,
    createdAt:
      typeof record.created_at === "string"
        ? record.created_at
        : typeof record.createdAt === "string"
          ? record.createdAt
          : "",
    updatedAt:
      typeof record.updated_at === "string"
        ? record.updated_at
        : typeof record.updatedAt === "string"
          ? record.updatedAt
          : "",
  };
}

export function primaryProductImageUrl(product: NormalizedProduct) {
  if (product.image) return product.image;
  const primary = product.images.find((image) => image.isPrimary);
  const first = product.images[0];
  return primary?.url ?? primary?.image ?? first?.url ?? first?.image ?? null;
}

function productVariants(product: ProductLike): ProductVariant[] {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  return variants
    .filter((variant): variant is ProductRecord => Boolean(backendRecord(variant)))
    .map((variant) => ({
      id: safeNumber(variant.id),
      price:
        typeof variant.price === "number" || typeof variant.price === "string"
          ? variant.price
          : "",
      sku: typeof variant.sku === "string" ? variant.sku : null,
      attribute_values: Array.isArray(variant.attribute_values)
        ? variant.attribute_values
        : [],
    }));
}

function productVariantPrices(product: ProductLike) {
  return productVariants(product)
    .map((variant) => {
      if (typeof variant.price === "string" && !variant.price.trim()) return Number.NaN;
      return Number(variant.price);
    })
    .filter((variantPrice) => Number.isFinite(variantPrice) && variantPrice >= 0);
}

function getProductDisplayPrice(product: ProductLike) {
  const prices = productVariantPrices(product);
  return prices.length === 0 ? 0 : Math.min(...prices);
}

function formatProductPrice(product: ProductLike) {
  const prices = productVariantPrices(product);
  if (prices.length === 0) return "بدون سعر";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`;
}

export function productRowFromApi(value: unknown, index: number): ItemRow {
  const record = backendRecord(value) ?? {};
  const product = normalizeProduct(record);
  const themeLabel =
    product.theme === "clothing"
      ? "ملابس"
      : product.theme === "consumer"
        ? "استهلاكي"
        : "أخرى";
  const category =
    nestedNames(product.subcategories) ||
    nestedName(product.subcategory) ||
    nestedName(product.category) ||
    themeLabel ||
    nestedName(record.product_category) ||
    nestedName(record.classification) ||
    text(record, ["category_name", "product_category_name"], "غير مصنف");
  const market = product.market;
  const marketId = product.marketId === null ? "" : String(product.marketId);
  const shopName =
    nestedName(market) ||
    nestedName(record.shop) ||
    text(record, ["market_name", "shop_name"], "");
  const marketScope = typeof market?.scope === "string" ? market.scope : "";
  const scopeLabel =
    marketScope === "general"
      ? "جاهز للشحن"
      : marketScope === "service_city"
        ? text(market ?? {}, ["branch"], "مدينة خدمة")
        : text(market ?? {}, ["scope"], "");
  const rawRegionNames = Array.isArray(record.region_names)
    ? record.region_names
    : Array.isArray(record.city_names)
      ? record.city_names
      : Array.isArray(record.service_city_names)
        ? record.service_city_names
        : Array.isArray(market?.city_names)
          ? market.city_names
          : Array.isArray(market?.service_city_names)
            ? market.service_city_names
            : [];
  const rawRegionSlugs = Array.isArray(record.region_slugs)
    ? record.region_slugs
    : Array.isArray(record.city_slugs)
      ? record.city_slugs
      : Array.isArray(record.service_city_slugs)
        ? record.service_city_slugs
        : Array.isArray(market?.city_slugs)
          ? market.city_slugs
          : Array.isArray(market?.service_city_slugs)
            ? market.service_city_slugs
            : [];
  const variants = productVariants(product);
  const displayPrice = getProductDisplayPrice(product);
  const displayPriceLabel = formatProductPrice(product);

  return {
    index: String(index + 1),
    id: Number.isFinite(product.id) ? String(product.id) : recordId(record, index),
    code: text(record, ["code", "sku"], recordId(record, index)),
    image: normalizeImageSrc(primaryProductImageUrl(product), fallbackImage),
    name:
      product.name ||
      text(record, ["name", "name_ar", "name_en", "title"], `منتج #${index + 1}`),
    description: product.description || text(record, ["description", "details"], ""),
    category,
    subcategory:
      nestedNames(product.subcategories) ||
      nestedName(product.subcategory) ||
      text(record, ["subcategory_name"], category),
    marketId,
    shopName,
    scopeLabel,
    calories: text(record, ["stock", "quantity", "calories"], ""),
    regionSlugs: rawRegionSlugs.map(String).filter(Boolean),
    regionNames: rawRegionNames.map(String).filter(Boolean),
    price: displayPriceLabel,
    displayPrice,
    displayPriceLabel,
    discountPercent: Number(product.discount) || 0,
    variants,
    featured:
      product.isPopular || bool(record, ["is_featured", "featured"], false)
        ? "نعم"
        : "لا",
    active: product.isAvailable,
    archived: product.archivedAt !== null,
    deletionMode: product.deletionMode,
    visibilityMode: marketScope === "service_city" ? "regions" : "general",
  };
}

export function normalizeItemRow(row: ItemRow, market?: ShopRow): ItemRow {
  const priceLabel = formatItemPrice(row.displayPriceLabel ?? row.price);
  const isCityMarket = market?.scope === "service_city";
  const marketCityNames = market?.serviceCityNames ?? [];

  return {
    ...row,
    code: row.code ?? row.id,
    shopName: market?.name ?? row.shopName ?? "",
    price: priceLabel,
    displayPriceLabel: priceLabel,
    visibilityMode: market
      ? isCityMarket
        ? "regions"
        : "general"
      : row.visibilityMode ?? "general",
    regionSlugs: market?.serviceCityIds ?? row.regionSlugs ?? [],
    regionNames: marketCityNames.length ? marketCityNames : row.regionNames ?? [],
    scopeLabel: market
      ? isCityMarket
        ? marketCityNames.join("، ") || "مدينة خدمة"
        : "جاهز للشحن"
      : row.scopeLabel,
  };
}

export function formatItemPrice(price: string) {
  return price.replace(/\s*جنيه/g, " EGP");
}
