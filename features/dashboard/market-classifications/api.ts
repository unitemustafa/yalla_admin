import { deletionResult, type ApiFetch } from "../admin-api";
import { apiResponseData, firstApiError } from "../users/api-users";
import {
  marketClassificationList,
  normalizeMarketClassification,
} from "./normalizers";
import type {
  MarketClassification,
  MarketClassificationPayload,
} from "./types";

const endpoint = "home/market-classifications/";

function errorMessage(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
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

  return marketClassificationList(data)
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

  const data = await apiResponseData(response);
  if (response.ok || response.status === 204) return deletionResult(data);
  throw new Error(errorMessage(data, "تعذر حذف التصنيف."));
}
