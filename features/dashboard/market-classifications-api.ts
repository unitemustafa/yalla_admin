import { apiResponseData, firstApiError } from "./users/api-users";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type MarketClassification = {
  id: number;
  name: string;
  description: string;
  image: string | null;
  classification_type: MarketClassificationType;
  is_active: boolean;
};

export type MarketClassificationType = "normal" | "featured" | "popular";

export type MarketClassificationPayload = {
  name: string;
  description?: string;
  classification_type: MarketClassificationType;
  is_active?: boolean;
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
  const description =
    typeof record.description === "string" ? record.description.trim() : "";
  const image =
    typeof record.image === "string" && record.image.trim()
      ? record.image.trim()
      : null;
  const rawType = record.classification_type;
  const classification_type =
    rawType === "popular" || rawType === "featured" || rawType === "normal"
      ? rawType
      : "normal";

  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    description,
    image,
    classification_type,
    is_active: record.is_active !== false,
  };
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
  return JSON.stringify({
    name: payload.name.trim(),
    description: payload.description?.trim() ?? "",
    classification_type: payload.classification_type,
    ...(payload.is_active === undefined ? {} : { is_active: payload.is_active }),
  });
}

function requestInit(
  method: "POST" | "PATCH",
  payload: MarketClassificationPayload,
  imageFile?: File | null,
): RequestInit {
  if (!imageFile) {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: requestBody(payload),
    };
  }

  const formData = new FormData();
  formData.set("name", payload.name.trim());
  formData.set("description", payload.description?.trim() ?? "");
  formData.set("classification_type", payload.classification_type);
  if (payload.is_active !== undefined) {
    formData.set("is_active", String(payload.is_active));
  }
  formData.set("image", imageFile);

  return { method, body: formData };
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
  imageFile?: File | null,
) {
  const createPayload: MarketClassificationPayload = {
    ...payload,
    is_active: payload.is_active ?? true,
  };
  const data = await checkedData(
    await apiFetch(endpoint, requestInit("POST", createPayload, imageFile)),
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
  imageFile?: File | null,
) {
  const data = await checkedData(
    await apiFetch(
      `${endpoint}${encodeURIComponent(id)}/`,
      requestInit("PATCH", payload, imageFile),
    ),
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
