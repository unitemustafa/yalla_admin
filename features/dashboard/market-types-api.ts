import type { ApiFetch } from "./admin-api";

export type MarketType = {
  id: number;
  classification_id: number;
  name_ar: string;
  name_en: string;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  market_count: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const response = record(value);
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function firstError(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return firstError(value[0]);
  const response = record(value);
  if (response) {
    for (const entry of Object.values(response)) {
      const message = firstError(entry);
      if (message) return message;
    }
  }
  return "";
}

export function normalizeMarketType(value: unknown): MarketType | null {
  const item = record(value);
  const id = Number(item?.id);
  const classificationId = Number(item?.classification_id);
  if (!item || !Number.isFinite(id) || !Number.isFinite(classificationId)) {
    return null;
  }
  return {
    id,
    classification_id: classificationId,
    name_ar: String(item.name_ar ?? "").trim(),
    name_en: String(item.name_en ?? "").trim(),
    image:
      typeof item.image === "string" && item.image.trim() ? item.image : null,
    sort_order: Number(item.sort_order) || 0,
    is_active: item.is_active !== false,
    market_count: Number(item.market_count) || 0,
  };
}

async function parse(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(firstError(data) || fallback);
  return data;
}

export async function loadMarketTypes(apiFetch: ApiFetch) {
  const data = await parse(
    await apiFetch("home/market-types/"),
    "تعذر تحميل الفئات الثانوية للمحلات.",
  );
  return list(data)
    .map(normalizeMarketType)
    .filter((item): item is MarketType => item !== null);
}

export async function saveMarketType(
  apiFetch: ApiFetch,
  payload: {
    id?: number;
    classification_id: number;
    name_ar: string;
    name_en: string;
    sort_order: number;
    is_active: boolean;
    image?: File | null;
  },
) {
  const path = payload.id
    ? `home/market-types/${payload.id}/`
    : "home/market-types/";
  const method = payload.id ? "PATCH" : "POST";
  let body: BodyInit;
  let headers: HeadersInit | undefined;

  if (payload.image) {
    const form = new FormData();
    form.set("classification_id", String(payload.classification_id));
    form.set("name_ar", payload.name_ar);
    form.set("name_en", payload.name_en);
    form.set("sort_order", String(payload.sort_order));
    form.set("is_active", String(payload.is_active));
    form.set("image", payload.image);
    body = form;
  } else {
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify({
      classification_id: payload.classification_id,
      name_ar: payload.name_ar,
      name_en: payload.name_en,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
    });
  }

  const data = await parse(
    await apiFetch(path, { method, headers, body }),
    "تعذر حفظ الفئة الثانوية للمحل.",
  );
  const item = normalizeMarketType(data);
  if (!item) throw new Error("استجابة الفئة الثانوية للمحل غير صالحة.");
  return item;
}

export async function deleteMarketType(apiFetch: ApiFetch, id: number) {
  await parse(
    await apiFetch(`home/market-types/${id}/`, { method: "DELETE" }),
    "تعذر حذف الفئة الثانوية للمحل.",
  );
}
