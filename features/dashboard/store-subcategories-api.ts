import { deletionResult, type ApiFetch } from "./admin-api";
import { apiListData } from "./shared/api-data";

export type StoreSubcategory = {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  image: string | null;
  is_active: boolean;
  market_count: number;
  product_count: number;
  sort_order?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function firstError(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return firstError(value[0]);
  const record = asRecord(value);
  if (record) {
    for (const entry of Object.values(record)) {
      const message = firstError(entry);
      if (message) return message;
    }
  }
  return "";
}

export function normalizeStoreSubcategory(value: unknown): StoreSubcategory | null {
  const record = asRecord(value);
  const id = Number(record?.id);
  if (!record || !Number.isFinite(id)) return null;
  return {
    id,
    name_ar: String(record.name_ar ?? "").trim(),
    name_en: String(record.name_en ?? "").trim(),
    description_ar: String(record.description_ar ?? "").trim(),
    description_en: String(record.description_en ?? "").trim(),
    image: typeof record.image === "string" && record.image ? record.image : null,
    is_active: record.is_active !== false,
    market_count: Number(record.market_count) || 0,
    product_count: Number(record.product_count) || 0,
    ...(Number.isFinite(Number(record.sort_order)) ? { sort_order: Number(record.sort_order) } : {}),
  };
}

async function parse(response: Response, fallback: string) {
  const data = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw new Error(firstError(data) || fallback);
  return data;
}

export async function loadStoreSubcategories(apiFetch: ApiFetch) {
  const data = await parse(
    await apiFetch("catalog/store-subcategories/"),
    "تعذر تحميل أقسام المنتجات.",
  );
  return apiListData<unknown>(data)
    .map(normalizeStoreSubcategory)
    .filter((item): item is StoreSubcategory => item !== null);
}

export async function saveStoreSubcategory(
  apiFetch: ApiFetch,
  payload: {
    id?: number;
    name_ar: string;
    name_en: string;
    description_ar: string;
    description_en: string;
    is_active: boolean;
    image?: File | null;
  },
) {
  const path = payload.id
    ? `catalog/store-subcategories/${payload.id}/`
    : "catalog/store-subcategories/";
  const method = payload.id ? "PATCH" : "POST";
  let body: BodyInit;
  let headers: HeadersInit | undefined;
  if (payload.image) {
    const form = new FormData();
    form.set("name_ar", payload.name_ar);
    form.set("name_en", payload.name_en);
    form.set("description_ar", payload.description_ar);
    form.set("description_en", payload.description_en);
    form.set("is_active", String(payload.is_active));
    form.set("image", payload.image);
    body = form;
  } else {
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify({
      name_ar: payload.name_ar,
      name_en: payload.name_en,
      description_ar: payload.description_ar,
      description_en: payload.description_en,
      is_active: payload.is_active,
    });
  }
  const data = await parse(
    await apiFetch(path, { method, headers, body }),
    "تعذر حفظ قسم المنتجات.",
  );
  const item = normalizeStoreSubcategory(data);
  if (!item) throw new Error("استجابة قسم المنتجات غير صالحة.");
  return item;
}

export async function deleteStoreSubcategory(apiFetch: ApiFetch, id: number) {
  const data = await parse(
    await apiFetch(`catalog/store-subcategories/${id}/`, { method: "DELETE" }),
    "تعذر حذف قسم المنتجات.",
  );
  return deletionResult(data);
}

export async function saveMarketSubcategories(
  apiFetch: ApiFetch,
  marketId: string,
  subcategoryIds: number[],
) {
  let data: unknown;
  try {
    data = await parse(
      await apiFetch(`home/markets/${encodeURIComponent(marketId)}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subcategory_ids: subcategoryIds }),
      }),
      "تعذر حفظ أقسام المحل.",
    );
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "";
    if (message.includes("Move products to another subcategory")) {
      throw new Error("انقل منتجات القسم إلى قسم آخر قبل إزالته من المحل.");
    }
    if (message.includes("Only active store subcategories")) {
      throw new Error("يمكن ربط الأقسام النشطة فقط بالمحل.");
    }
    throw reason;
  }
  const record = asRecord(data);
  const values = Array.isArray(record?.subcategories) ? record.subcategories : [];
  return values
    .map(normalizeStoreSubcategory)
    .filter((item): item is StoreSubcategory => item !== null);
}
