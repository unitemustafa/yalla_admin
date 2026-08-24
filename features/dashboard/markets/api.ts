import { deletionResult, type ApiFetch } from "../admin-api";
import { loadMarketTypes } from "../market-types-api";
import {
  listFromResponse,
  marketErrorMessage,
  normalizeClassification,
} from "./domain";
import type { Classification, Market, MarketPayload } from "./types";

async function responseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export async function loadMarketsPageData(apiFetch: ApiFetch, archived: boolean) {
  const [marketsResponse, classificationsResponse, marketTypes] = await Promise.all([
    apiFetch(`home/markets/${archived ? "?archived=true" : ""}`),
    apiFetch("home/market-classifications/"),
    loadMarketTypes(apiFetch),
  ]);
  const [marketsData, classificationsData] = await Promise.all([
    responseJson(marketsResponse),
    responseJson(classificationsResponse),
  ]);
  if (!marketsResponse.ok) throw new Error(marketErrorMessage(marketsData, "تعذر تحميل المحلات."));
  if (!classificationsResponse.ok) throw new Error(marketErrorMessage(classificationsData, "تعذر تحميل التصنيفات."));
  return {
    markets: listFromResponse(marketsData) as Market[],
    classifications: listFromResponse(classificationsData)
      .map(normalizeClassification)
      .filter((item): item is Classification => item !== null),
    marketTypes,
  };
}

function marketFormData(payload: MarketPayload, imageFile: File | null, coverFile: File | null) {
  const formData = new FormData();
  formData.set("classification_id", String(payload.classification_id));
  formData.set("name", payload.name);
  formData.set("description", payload.description);
  if (payload.delivery_time_min_minutes !== null) {
    formData.set("delivery_time_min_minutes", String(payload.delivery_time_min_minutes));
  }
  if (payload.delivery_time_max_minutes !== null) {
    formData.set("delivery_time_max_minutes", String(payload.delivery_time_max_minutes));
  }
  formData.set("is_popular", String(payload.is_popular));
  formData.set("scope", payload.scope);
  formData.set("send_notification", String(payload.send_notification));
  payload.service_city_ids.forEach((id) => formData.append("service_city_ids", String(id)));
  payload.market_type_ids.forEach((id) => formData.append("market_type_ids", String(id)));
  if (imageFile) formData.set("image", imageFile);
  if (coverFile) formData.set("cover_image", coverFile);
  return formData;
}

export async function saveMarket(
  apiFetch: ApiFetch,
  market: Market | undefined,
  payload: MarketPayload,
  imageFile: File | null,
  coverFile: File | null,
) {
  const response = await apiFetch(market ? `home/markets/${market.id}/` : "home/markets/", {
    method: market ? "PATCH" : "POST",
    ...(imageFile || coverFile
      ? { body: marketFormData(payload, imageFile, coverFile) }
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  });
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(marketErrorMessage(data, "تعذر حفظ المحل."));
  }
  return data as Market;
}

export async function deleteMarket(apiFetch: ApiFetch, marketId: number) {
  const response = await apiFetch(`home/markets/${marketId}/`, { method: "DELETE" });
  const data = await responseJson(response);
  if (!response.ok) throw new Error(marketErrorMessage(data, "تعذر حذف المحل."));
  return deletionResult(data);
}

export async function restoreMarket(apiFetch: ApiFetch, marketId: number) {
  const response = await apiFetch(`home/markets/${marketId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restore: true }),
  });
  const data = await responseJson(response);
  if (!response.ok) throw new Error(marketErrorMessage(data, "تعذر استعادة المحل."));
}

export async function setMarketActive(apiFetch: ApiFetch, market: Market, active: boolean) {
  const response = await apiFetch(`home/markets/${market.id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: active ? "active" : "inactive" }),
  });
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(marketErrorMessage(data, "تعذر تحديث حالة المحل."));
  }
  return data as Market;
}
