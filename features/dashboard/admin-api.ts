import { apiListData, asRecord, firstApiError } from "./shared/api-data";
import { safeNumber } from "./shared/money";

export { formatMoney } from "./shared/money";

export const adminApiPaths = {
  storeSubcategories: "catalog/store-subcategories/",
  markets: "home/markets/",
  marketClassifications: "home/market-classifications/",
  users: "auth/users/",
  offers: "offers/",
  homeCampaigns: "offers/home-campaigns/",
  products: "catalog/products/",
  productCategories: "catalog/product-categories/",
  dashboardOverview: "dashboard/overview/",
} as const;

export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type BackendRecord = Record<string, unknown>;

export type DeletionResult = {
  action: "deleted" | "archived";
  detail?: string;
};

export function deletionResult(value: unknown): DeletionResult {
  const record = asRecord(value);
  if (record?.action === "archived") {
    return {
      action: "archived",
      detail: typeof record.detail === "string" ? record.detail : undefined,
    };
  }
  return { action: "deleted" };
}

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

export function apiErrorMessage(data: unknown, fallback: string) {
  return firstApiError(data) ?? fallback;
}

export async function readApiData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
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

export function apiList(value: unknown): BackendRecord[] {
  return apiListData<unknown>(value).filter(
    (item): item is BackendRecord => asRecord(item) !== null,
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

function nestedName(value: unknown) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return record ? text(record, ["name", "name_ar", "name_en", "title"]) : "";
}

export function shopRowFromApi(record: BackendRecord, index: number): ShopRow {
  const serviceCities = Array.isArray(record.service_cities)
    ? record.service_cities.filter(
        (city): city is BackendRecord => asRecord(city) !== null,
      )
    : [];
  const serviceCityIds = serviceCities.map((city) => text(city, ["id"])).filter(Boolean);
  const serviceCityNames = serviceCities.map(nestedName).filter(Boolean);
  const scope = record.scope === "service_city" ? "service_city" : "general";
  const branch = serviceCityNames.length
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

export async function sendAdminJson(
  apiFetch: ApiFetch,
  path: string,
  init: RequestInit & { body?: BodyInit | null },
) {
  const response = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await readApiData(response);
  if (!response.ok) {
    throw new Error(apiErrorMessage(data, "تعذر حفظ البيانات في الباك."));
  }
  return data;
}
