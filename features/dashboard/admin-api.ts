import type { AddonRow, CategoryRow, ItemRow, ProductVariant } from "./data";
import { firstApiError } from "./users/api-users";
import { normalizeImageSrc } from "@/lib/media-url";

export const adminApiPaths = {
  products: "catalog/products/",
  productAdditions: "catalog/product-additions/",
  additionClassifications: "catalog/addition-classifications/",
  productCategories: "catalog/product-categories/",
  categoryAttributes: "catalog/category-attributes/",
  categoryOptions: "catalog/category-options/",
  categoryClassifications: "catalog/category-classifications/",
  markets: "home/markets/",
  marketClassifications: "home/market-classifications/",
  users: "auth/users/",
  offers: "offers/",
  dashboardOverview: "dashboard/overview/",
} as const;

export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type BackendRecord = Record<string, unknown>;

export type ProductLike = {
  variants?: unknown;
};

export type NormalizedProductVariant = BackendRecord & {
  id?: number | string | null;
  price?: string | number | null;
  sku?: string | null;
  attribute_values?: unknown[];
  selections?: unknown[];
};

export type NormalizedProductAttributeOption = {
  id?: number | null;
  client_id?: string;
  value: string;
  sort_order?: number;
};

export type NormalizedProductAttribute = {
  id?: number | null;
  client_id?: string;
  name: string;
  sort_order?: number;
  options: NormalizedProductAttributeOption[];
};

export type NormalizedProductImage = {
  id: number;
  image: string | null;
  url: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type NormalizedProduct = {
  id: number;
  name: string;
  description: string;
  marketId: number | null;
  market: BackendRecord | null;
  categoryId: number | null;
  category: BackendRecord | null;
  theme: "clothing" | "consumer" | "other";
  isPopular: boolean;
  image: string | null;
  images: NormalizedProductImage[];
  discount: string | number;
  isAvailable: boolean;
  additions: number[];
  attributes: NormalizedProductAttribute[];
  variants: NormalizedProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type ProductAttributeValuePayload = {
  id?: number;
  attribute_id: number;
  option_id: number;
};

export type ProductVariantSelectionPayload =
  | {
      attribute_id: number;
      option_id: number;
    }
  | {
      attribute_client_id: string;
      option_client_id: string;
    };

export type ProductVariantPayload = {
  id?: number;
  price: string;
  sku?: string;
  selections: ProductVariantSelectionPayload[];
};

export type ProductWritePayload = {
  market_id?: number;
  theme?: "clothing" | "consumer" | "other";
  is_popular?: boolean;
  is_available?: boolean;
  name?: string;
  description?: string;
  discount?: string;
  additions?: number[];
  attributes?: NormalizedProductAttribute[];
  attribute_values?: ProductAttributeValuePayload[];
  variants?: ProductVariantPayload[];
};

export type ProductNotificationDispatchResult = {
  dispatchId: number | null;
  requestId: string;
  status: string;
  recipientCount: number;
  notificationCount: number;
  sentAt: string;
};

export type NormalizedProductCategory = {
  id: number;
  classificationId: number | null;
  classification: BackendRecord | null;
  name: string;
  type: string;
  description: string;
  image: string | null;
};

export type CategoryClassification = {
  id: number;
  name: string;
};

export type ProductCategoryWritePayload = {
  classification_id: number;
  name: string;
  type: string;
  description: string;
};

export class AdminApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.data = data;
  }
}

export type DashboardOverview = {
  range?: {
    from?: string;
    to?: string;
    timezone?: string;
  };
  currency?: string;
  revenue?: {
    total?: string | number | null;
    percentage?: string | number | null;
  };
  orders?: {
    total?: string | number | null;
    completed?: string | number | null;
    incomplete?: string | number | null;
    completion_rate?: string | number | null;
  };
  customers?: {
    new?: string | number | null;
    returning?: string | number | null;
    return_rate?: string | number | null;
  };
  top_products?: BackendRecord[];
  active_orders?: BackendRecord[];
  top_shops?: BackendRecord[];
};

export type ShopRow = {
  id: string;
  name: string;
  category: string;
  branch: string;
  products: string;
  active: boolean;
  scope?: "general" | "service_city";
  serviceCityIds?: string[];
  serviceCityNames?: string[];
};

const fallbackImage = "/default-user-avatar.svg";

export function apiErrorMessage(data: unknown, fallback: string) {
  return firstApiError(data) ?? fallback;
}

export async function readApiData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export function safeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatMoney(value: unknown, currency = "EGP") {
  const amount = safeNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currency || "EGP"} ${amount}`;
}

export function formatPercent(value: unknown) {
  const percentage = safeNumber(value);
  const decimals = Number.isInteger(percentage) ? 0 : 1;

  return `${percentage.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function translateOrderStatus(status: unknown) {
  if (typeof status !== "string" || !status.trim()) return "غير معروف";

  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    assigned: "تم الإسناد",
    picked_up: "تم الاستلام",
    delivered: "تم التسليم",
    failed_delivery: "تعذر التوصيل",
    cancelled: "ملغي",
  };

  return labels[status.trim().toLowerCase()] ?? status;
}

function isDashboardOverview(value: unknown): value is DashboardOverview {
  return Boolean(value && typeof value === "object");
}

export function apiList(value: unknown): BackendRecord[] {
  const list =
    Array.isArray(value)
      ? value
      : value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)
        ? (value as { results: unknown[] }).results
        : [];

  return list.filter(
    (item): item is BackendRecord => Boolean(item && typeof item === "object"),
  );
}

function backendRecord(value: unknown): BackendRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as BackendRecord)
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

export function normalizeIds(values: unknown) {
  return (Array.isArray(values) ? values : [])
    .map((value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim() !== "") return Number(value);
      const record = backendRecord(value);
      if (record && "id" in record) return Number(record.id);
      return Number.NaN;
    })
    .filter((id) => Number.isFinite(id));
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

function productTheme(value: unknown): "clothing" | "consumer" | "other" {
  return value === "clothing" || value === "consumer" || value === "other"
    ? value
    : "other";
}

function normalizeProductAttributeOption(raw: unknown): NormalizedProductAttributeOption | null {
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
  const variants = Array.isArray(record.variants)
    ? record.variants
        .map((variant) => backendRecord(variant))
        .filter((variant): variant is BackendRecord => Boolean(variant))
        .map((variant) => ({
          ...variant,
          id: nullableNumber(variant.id) ?? (typeof variant.id === "string" ? variant.id : null),
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

export function normalizeProductCategory(raw: unknown): NormalizedProductCategory {
  const record = backendRecord(raw) ?? {};
  const classification = backendRecord(record.classification);

  return {
    id: Number(record.id),
    classificationId: nullableNumber(record.classification_id ?? classification?.id),
    classification,
    name: typeof record.name === "string" ? record.name : "",
    type: typeof record.type === "string" ? record.type : "",
    description: typeof record.description === "string" ? record.description : "",
    image: typeof record.image === "string" && record.image.trim() ? record.image : null,
  };
}

function assertReadableProductCategory(
  category: NormalizedProductCategory,
  fallback: string,
) {
  if (!Number.isFinite(category.id)) {
    throw new AdminApiError(fallback, 200, category);
  }

  return category;
}

function normalizeCategoryClassification(raw: unknown): CategoryClassification | null {
  const record = backendRecord(raw);
  const id = nullableNumber(record?.id);

  if (!record || id === null) return null;

  return {
    id,
    name:
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : `تصنيف #${id}`,
  };
}

function assertReadableProduct(product: NormalizedProduct, fallback: string) {
  if (!Number.isFinite(product.id)) {
    throw new AdminApiError(fallback, 200, product);
  }

  return product;
}

function assertSaleReadyProduct(
  product: NormalizedProduct,
  payload: ProductWritePayload,
) {
  if (payload.is_available === true && product.variants.length === 0) {
    throw new AdminApiError(
      "حفظ الخادم المنتج دون سعر أو متغير صالح. راجع البيانات وحاول مرة أخرى.",
      200,
      { variants: ["يجب إضافة سعر أو متغير صالح قبل إتاحة المنتج للبيع."] },
    );
  }

  return product;
}

async function parseAdminResponse(
  response: Response,
  fallback: string,
): Promise<unknown> {
  const data = await readApiData(response);

  if (!response.ok) {
    throw new AdminApiError(apiErrorMessage(data, fallback), response.status, data);
  }

  return data;
}

function productPayloadFormData(
  payload: ProductWritePayload,
  imageFiles: readonly File[],
  primaryImageIndex?: number,
) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "additions") {
      normalizeIds(value).forEach((id) => {
        formData.append("additions", String(id));
      });
      return;
    }
    if (Array.isArray(value)) {
      formData.set(key, JSON.stringify(value));
      return;
    }
    formData.set(key, typeof value === "boolean" ? String(value) : String(value ?? ""));
  });
  imageFiles.forEach((file) => formData.append("images", file));
  if (primaryImageIndex !== undefined) {
    formData.set("primary_image_index", String(primaryImageIndex));
  }

  return formData;
}

function productRequestInit(
  method: "POST" | "PATCH",
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
): RequestInit {
  if (imageFiles.length) {
    return {
      method,
      body: productPayloadFormData(payload, imageFiles, primaryImageIndex),
    };
  }

  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function productCategoryPayloadFormData(
  payload: ProductCategoryWritePayload,
  imageFile: File,
) {
  const formData = new FormData();

  formData.append("classification_id", String(Number(payload.classification_id)));
  formData.append("name", payload.name);
  formData.append("type", payload.type);
  formData.append("description", payload.description);
  formData.append("image", imageFile);

  return formData;
}

function productCategoryRequestInit(
  method: "POST" | "PATCH",
  payload: ProductCategoryWritePayload,
  imageFile?: File | null,
): RequestInit {
  if (imageFile) {
    return {
      method,
      body: productCategoryPayloadFormData(payload, imageFile),
    };
  }

  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function text(record: BackendRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function bool(record: BackendRecord, keys: string[], fallback = true) {
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

function id(record: BackendRecord, index: number) {
  return text(record, ["id", "_id", "uuid", "slug"], String(index + 1));
}

function image(record: BackendRecord) {
  return normalizeImageSrc(
    text(record, ["image", "image_url", "thumbnail", "thumbnail_url", "avatar_url"], fallbackImage),
    fallbackImage,
  );
}

function price(record: BackendRecord) {
  const value = text(record, ["price", "amount"], "0");
  return /\bEGP\b/i.test(value) ? value : `${value} EGP`;
}

function productVariants(product: ProductLike): ProductVariant[] {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  return variants
    .filter((variant): variant is BackendRecord => Boolean(variant && typeof variant === "object"))
    .map((variant) => ({
      id: safeNumber(variant.id),
      price: typeof variant.price === "number" || typeof variant.price === "string" ? variant.price : "",
      sku: typeof variant.sku === "string" ? variant.sku : null,
      attribute_values: Array.isArray(variant.attribute_values) ? variant.attribute_values : [],
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

export function getProductDisplayPrice(product: ProductLike): number {
  const prices = productVariantPrices(product);
  if (prices.length === 0) return 0;
  return Math.min(...prices);
}

export function formatProductPrice(product: ProductLike): string {
  const prices = productVariantPrices(product);

  if (prices.length === 0) return "بدون سعر";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) return formatMoney(min);

  return `${formatMoney(min)} - ${formatMoney(max)}`;
}

function nestedName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return text(value as BackendRecord, ["name", "name_ar", "name_en", "title"]);
  }
  return "";
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
      ? "عام"
      : marketScope === "service_city"
        ? text(market ?? {}, ["branch"], "مدينة خدمة")
        : text(market ?? {}, ["scope"], "");
  const rawRegionNames =
    Array.isArray(record.region_names)
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
  const rawRegionSlugs =
    Array.isArray(record.region_slugs)
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
    id: Number.isFinite(product.id) ? String(product.id) : id(record, index),
    code: text(record, ["code", "sku"], id(record, index)),
    image: normalizeImageSrc(primaryProductImageUrl(product), fallbackImage),
    name: product.name || text(record, ["name", "name_ar", "name_en", "title"], `منتج #${index + 1}`),
    description: product.description || text(record, ["description", "details"], ""),
    category,
    subcategory: text(record, ["subcategory", "subcategory_name"], category),
    marketId,
    shopName,
    scopeLabel,
    calories: text(record, ["stock", "quantity", "calories"], ""),
    regionSlugs: rawRegionSlugs.map(String).filter(Boolean),
    regionNames: rawRegionNames.map(String).filter(Boolean),
    price: displayPriceLabel,
    displayPrice,
    displayPriceLabel,
    variants,
    featured: product.isPopular || bool(record, ["is_featured", "featured"], false) ? "نعم" : "لا",
    active: product.isAvailable,
    visibilityMode: marketScope === "service_city" ? "regions" : "general",
  };
}

export function categoryRowFromApi(record: BackendRecord, index: number): CategoryRow {
  const classification =
    nestedName(record.classification) ||
    text(record, ["classification_name", "section", "category_classification_name"], "غير مصنف");

  return {
    index: id(record, index),
    image: image(record),
    name: text(record, ["name", "name_ar", "name_en"], `فئة #${index + 1}`),
    nameAr: text(record, ["name_ar"], ""),
    type: text(record, ["type"], ""),
    sections: [classification].filter(Boolean),
    active: bool(record, ["is_active", "active", "status"], true),
    featured: text(record, ["type"]).includes("مميزة") ? "نعم" : "لا",
    total: text(record, ["products_count", "total", "count"], "0"),
  };
}

export function addonRowFromApi(record: BackendRecord, index: number): AddonRow {
  const nameAr = text(record, ["name_ar", "name"], `إضافة #${index + 1}`);

  return {
    index: String(index + 1),
    id: id(record, index),
    image: image(record),
    name: text(record, ["name_en", "name"], nameAr),
    nameAr,
    price: price(record),
    category:
      nestedName(record.classification) ||
      text(record, ["classification_name", "category"], "غير مصنف"),
    active: record.is_active !== false,
  };
}

export function shopRowFromApi(record: BackendRecord, index: number): ShopRow {
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities.filter((city): city is BackendRecord =>
        Boolean(city && typeof city === "object"),
      )
    : [];
  const serviceCityIds = serviceCities
    .map((city) => text(city, ["id"]))
    .filter(Boolean);
  const serviceCityNames = serviceCities
    .map((city) => nestedName(city))
    .filter(Boolean);
  const scope = record.scope === "service_city" ? "service_city" : "general";
  const branch =
    serviceCityNames.length > 0
      ? serviceCityNames.join("، ")
      : scope === "general"
        ? "عام"
        : text(record, ["branch", "branch_name", "area_name"], "كل الفروع");

  return {
    id: id(record, index),
    name: text(record, ["name", "name_ar", "name_en"], `محل #${index + 1}`),
    category:
      nestedName(record.classification) ||
      text(record, ["classification_name", "category"], "غير مصنف"),
    branch,
    products: text(record, ["products_count", "total_products", "products"], "0"),
    active: bool(record, ["is_active", "active", "status"], true),
    scope,
    serviceCityIds,
    serviceCityNames,
  };
}

export async function fetchAdminRows<T>(
  apiFetch: ApiFetch,
  path: string,
  mapper: (record: BackendRecord, index: number) => T,
) {
  const response = await apiFetch(path);
  const data = await readApiData(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "تعذر تحميل البيانات من الباك."));
  }

  return apiList(data).map(mapper);
}

export async function listProducts(apiFetch: ApiFetch) {
  const response = await apiFetch(adminApiPaths.products);
  const data = await parseAdminResponse(response, "تعذر تحميل المنتجات");

  return apiList(data).map((record) => normalizeProduct(record));
}

export async function getProduct(apiFetch: ApiFetch, productId: string | number) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/`,
  );
  const data = await parseAdminResponse(
    response,
    response.status === 404 ? "تعذر العثور على المنتج" : "تعذر تحميل بيانات المنتج",
  );

  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج");
}

export async function createProduct(
  apiFetch: ApiFetch,
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
) {
  const response = await apiFetch(
    adminApiPaths.products,
    productRequestInit("POST", payload, imageFiles, primaryImageIndex),
  );
  const data = await parseAdminResponse(response, "تعذر حفظ المنتج");

  return assertSaleReadyProduct(
    assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج"),
    payload,
  );
}

export async function updateProduct(
  apiFetch: ApiFetch,
  productId: string | number,
  payload: ProductWritePayload,
  imageFiles: readonly File[] = [],
  primaryImageIndex?: number,
) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/`,
    productRequestInit("PATCH", payload, imageFiles, primaryImageIndex),
  );
  const data = await parseAdminResponse(response, "تعذر حفظ المنتج");

  return assertSaleReadyProduct(
    assertReadableProduct(normalizeProduct(data), "تعذر قراءة بيانات المنتج"),
    payload,
  );
}

export async function sendProductNotification(
  apiFetch: ApiFetch,
  productId: string | number,
  requestId: string,
): Promise<ProductNotificationDispatchResult> {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/send-notification/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    },
  );
  const data = await parseAdminResponse(response, "تعذر إرسال إشعار المنتج");
  const record = backendRecord(data) ?? {};

  return {
    dispatchId: nullableNumber(record.dispatch_id),
    requestId: typeof record.request_id === "string" ? record.request_id : requestId,
    status: typeof record.status === "string" ? record.status : "",
    recipientCount: safeNumber(record.recipient_count),
    notificationCount: safeNumber(record.notification_count),
    sentAt: typeof record.sent_at === "string" ? record.sent_at : "",
  };
}

export async function uploadProductImages(
  apiFetch: ApiFetch,
  productId: string | number,
  files: readonly File[],
  primaryImageIndex?: number,
) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (primaryImageIndex !== undefined) {
    formData.set("primary_image_index", String(primaryImageIndex));
  }
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/images/`,
    { method: "POST", body: formData },
  );
  const data = await parseAdminResponse(response, "تعذر رفع صور المنتج");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function deleteProductImage(
  apiFetch: ApiFetch,
  productId: string | number,
  imageId: number,
) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/images/${encodeURIComponent(String(imageId))}/`,
    { method: "DELETE" },
  );
  await parseAdminResponse(response, "تعذر حذف صورة المنتج");
}

export async function setPrimaryProductImage(
  apiFetch: ApiFetch,
  productId: string | number,
  imageId: number,
) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/images/${encodeURIComponent(String(imageId))}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    },
  );
  const data = await parseAdminResponse(response, "تعذر تعيين الصورة الرئيسية");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function reorderProductImages(
  apiFetch: ApiFetch,
  productId: string | number,
  imageIds: readonly number[],
) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/images/reorder/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_ids: imageIds }),
    },
  );
  const data = await parseAdminResponse(response, "تعذر ترتيب صور المنتج");
  return assertReadableProduct(normalizeProduct(data), "تعذر قراءة صور المنتج");
}

export async function deleteProduct(
  apiFetch: ApiFetch,
  productId: string | number,
) {
  const response = await apiFetch(
    `${adminApiPaths.products}${encodeURIComponent(String(productId))}/`,
    { method: "DELETE" },
  );
  await parseAdminResponse(response, "تعذر حذف المنتج");
}

export async function toggleProductAvailability(
  apiFetch: ApiFetch,
  productId: string | number,
  isAvailable: boolean,
) {
  return updateProduct(apiFetch, productId, {
    is_available: isAvailable,
  });
}

export async function listProductCategories(apiFetch: ApiFetch) {
  const response = await apiFetch(adminApiPaths.productCategories);
  const data = await parseAdminResponse(response, "تعذر تحميل الفئات");

  return apiList(data).map((record) => normalizeProductCategory(record));
}

export async function getProductCategory(
  apiFetch: ApiFetch,
  categoryId: string | number,
) {
  const response = await apiFetch(
    `${adminApiPaths.productCategories}${encodeURIComponent(String(categoryId))}/`,
  );
  const data = await parseAdminResponse(
    response,
    response.status === 404 ? "تعذر العثور على الفئة" : "تعذر تحميل بيانات الفئة",
  );

  return assertReadableProductCategory(
    normalizeProductCategory(data),
    "تعذر قراءة بيانات الفئة",
  );
}

export async function createProductCategory(
  apiFetch: ApiFetch,
  payload: ProductCategoryWritePayload,
  imageFile?: File | null,
) {
  const response = await apiFetch(
    adminApiPaths.productCategories,
    productCategoryRequestInit("POST", payload, imageFile),
  );
  const data = await parseAdminResponse(response, "تعذر حفظ الفئة");

  return assertReadableProductCategory(
    normalizeProductCategory(data),
    "تعذر قراءة بيانات الفئة",
  );
}

export async function updateProductCategory(
  apiFetch: ApiFetch,
  categoryId: string | number,
  payload: ProductCategoryWritePayload,
  imageFile?: File | null,
) {
  const response = await apiFetch(
    `${adminApiPaths.productCategories}${encodeURIComponent(String(categoryId))}/`,
    productCategoryRequestInit("PATCH", payload, imageFile),
  );
  const data = await parseAdminResponse(response, "تعذر حفظ الفئة");

  return assertReadableProductCategory(
    normalizeProductCategory(data),
    "تعذر قراءة بيانات الفئة",
  );
}

export async function deleteProductCategory(
  apiFetch: ApiFetch,
  categoryId: string | number,
) {
  const response = await apiFetch(
    `${adminApiPaths.productCategories}${encodeURIComponent(String(categoryId))}/`,
    { method: "DELETE" },
  );
  await parseAdminResponse(response, "تعذر حذف الفئة");
}

export async function listCategoryClassifications(apiFetch: ApiFetch) {
  const response = await apiFetch(adminApiPaths.categoryClassifications);
  const data = await parseAdminResponse(response, "تعذر تحميل تصنيفات الفئات");

  return apiList(data)
    .map(normalizeCategoryClassification)
    .filter((classification): classification is CategoryClassification =>
      Boolean(classification),
    );
}

export async function getDashboardOverview(
  apiFetch: ApiFetch,
  from: string,
  to: string,
) {
  const params = new URLSearchParams({ from, to });
  const response = await apiFetch(
    `${adminApiPaths.dashboardOverview}?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const data = await readApiData(response);

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى"
        : "تعذر تحميل بيانات لوحة التحكم";

    throw new Error(apiErrorMessage(data, fallback));
  }

  if (!isDashboardOverview(data)) {
    throw new Error("تعذر تحميل بيانات لوحة التحكم");
  }

  return data;
}

export async function sendAdminJson(
  apiFetch: ApiFetch,
  path: string,
  init: RequestInit & { body?: BodyInit | null },
) {
  const response = await apiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await readApiData(response);

  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "تعذر حفظ البيانات في الباك."));
  }

  return data;
}
