import type { AddonRow, CategoryRow, ItemRow, ProductVariant } from "./data";
import { firstApiError } from "./users/api-users";
import { resolveMediaUrl } from "@/lib/media-url";

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
    under_preparation: "قيد التحضير",
    preparing: "قيد التحضير",
    ready: "جاهز",
    on_the_way: "في الطريق",
    delivered: "مكتمل",
    completed: "مكتمل",
    cancelled: "ملغي",
    canceled: "ملغي",
    rejected: "مرفوض",
  };

  labels.confirmed = "مؤكد";
  labels.picked_up = "تم الاستلام";
  labels.failed_delivery = "تعذر التوصيل";

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
  return resolveMediaUrl(
    text(record, ["image", "image_url", "thumbnail", "thumbnail_url", "avatar_url"], fallbackImage),
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

export function productRowFromApi(record: BackendRecord, index: number): ItemRow {
  const category =
    nestedName(record.category) ||
    nestedName(record.product_category) ||
    nestedName(record.classification) ||
    text(record, ["category_name", "product_category_name"], "غير مصنف");
  const market =
    record.market && typeof record.market === "object"
      ? (record.market as BackendRecord)
      : null;
  const marketId = text(record, ["market_id"], text(market ?? {}, ["id"]));
  const shopName =
    nestedName(market) ||
    nestedName(record.shop) ||
    text(record, ["market_name", "shop_name"], "");
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
  const variants = productVariants(record);
  const displayPrice = getProductDisplayPrice(record);
  const displayPriceLabel = formatProductPrice(record);

  return {
    index: String(index + 1),
    id: id(record, index),
    code: text(record, ["code", "sku"], id(record, index)),
    image: image(record),
    name: text(record, ["name", "name_ar", "name_en", "title"], `منتج #${index + 1}`),
    description: text(record, ["description", "details"], ""),
    category,
    subcategory: text(record, ["subcategory", "subcategory_name"], category),
    marketId,
    shopName,
    calories: text(record, ["stock", "quantity", "calories"], ""),
    regionSlugs: rawRegionSlugs.map(String).filter(Boolean),
    regionNames: rawRegionNames.map(String).filter(Boolean),
    price: displayPriceLabel,
    displayPrice,
    displayPriceLabel,
    variants,
    featured: bool(record, ["is_featured", "featured"], false) ? "نعم" : "لا",
    active: bool(record, ["is_active", "active", "available", "status"], true),
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
