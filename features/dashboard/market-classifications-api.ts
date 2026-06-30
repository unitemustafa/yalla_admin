import { apiResponseData, firstApiError } from "./users/api-users";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type MarketClassification = {
  id: number;
  name: string;
};

export type MarketClassificationPayload = {
  name: string;
};

const endpoint = "home/market-classifications/";

function errorMessage(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
}

function normalizeMarketClassification(
  value: unknown,
): MarketClassification | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (!Number.isFinite(id) || !name) return null;

  return { id, name };
}

function listFromResponse(value: unknown) {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: unknown[] }).results;
  }
  return [];
}

async function checkedData(response: Response, fallback: string) {
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(errorMessage(data, fallback));
  }
  return data;
}

function requestBody(payload: MarketClassificationPayload) {
  return JSON.stringify({ name: payload.name.trim() });
}

export async function loadMarketClassifications(apiFetch: ApiFetch) {
  const data = await checkedData(
    await apiFetch(endpoint),
    "تعذر تحميل تصنيفات المحلات.",
  );

  return listFromResponse(data)
    .map(normalizeMarketClassification)
    .filter((item): item is MarketClassification => item !== null);
}

export async function createMarketClassification(
  apiFetch: ApiFetch,
  payload: MarketClassificationPayload,
) {
  const data = await checkedData(
    await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody(payload),
    }),
    "تعذر حفظ التصنيف.",
  );
  const classification = normalizeMarketClassification(data);

  if (!classification) {
    throw new Error("استجابة التصنيف غير مكتملة.");
  }

  return classification;
}

export async function updateMarketClassification(
  apiFetch: ApiFetch,
  id: number,
  payload: MarketClassificationPayload,
) {
  const data = await checkedData(
    await apiFetch(`${endpoint}${encodeURIComponent(id)}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: requestBody(payload),
    }),
    "تعذر حفظ التصنيف.",
  );
  const classification = normalizeMarketClassification(data);

  if (!classification) {
    throw new Error("استجابة التصنيف غير مكتملة.");
  }

  return classification;
}

export async function deleteMarketClassification(
  apiFetch: ApiFetch,
  id: number,
) {
  const response = await apiFetch(`${endpoint}${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });

  if (response.ok || response.status === 204) return;

  const data = await apiResponseData(response);
  throw new Error(errorMessage(data, "تعذر حذف التصنيف."));
}
