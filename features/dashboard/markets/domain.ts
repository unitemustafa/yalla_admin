import type { ServiceCity } from "../cities/types";
import type { MarketType } from "../market-types-api";
import type {
  Classification,
  Market,
  MarketDraft,
  MarketPayload,
  MarketServiceCity,
} from "./types";

export function marketErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return marketErrorMessage(value[0], fallback);
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = marketErrorMessage(item, "");
      if (message) return message;
    }
  }
  return fallback;
}

function uniqueNumbers(values: unknown[]) {
  const ids: number[] = [];
  for (const value of values) {
    const id = Number(value);
    if (Number.isFinite(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function listFromResponse(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as { results?: unknown; data?: unknown };
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.data)) return record.data;
    if (record.data && typeof record.data === "object") {
      const data = record.data as { results?: unknown };
      if (Array.isArray(data.results)) return data.results;
    }
  }
  return [];
}

export function classificationTypeLabel(value: string | undefined) {
  if (value === "popular") return "شائعة";
  if (value === "featured") return "مميزة";
  return "عادية";
}

export function classificationLabel(market: Market) {
  if (!market.classification) return "بدون تصنيف";
  return `${market.classification.name} — ${classificationTypeLabel(market.classification.classification_type)}`;
}

export function normalizeClassification(value: unknown): Classification | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const classification_type =
    record.classification_type === "popular" ||
    record.classification_type === "featured" ||
    record.classification_type === "normal"
      ? record.classification_type
      : "normal";
  return Number.isFinite(id) && name ? { id, name, classification_type } : null;
}

export function missingMarketCreatePrerequisite(
  classifications: Classification[],
  marketTypes: MarketType[],
): "classification" | "market-type" | null {
  if (!classifications.length) return "classification";
  const classificationIds = new Set(classifications.map((item) => item.id));
  return marketTypes.some(
    (item) => item.is_active && classificationIds.has(item.classification_id),
  ) ? null : "market-type";
}

export function serviceCityName(city: Pick<ServiceCity, "id" | "name"> | MarketServiceCity) {
  return city.name || `مدينة رقم ${city.id}`;
}

export function marketServiceCityIds(market: Market): number[] {
  const values: unknown[] = [];
  if (Array.isArray(market.service_city_ids)) values.push(...market.service_city_ids);
  if (Array.isArray(market.service_cities)) {
    for (const city of market.service_cities) values.push(city.id);
  }
  return uniqueNumbers(values);
}

export function marketCityNames(market: Market, serviceCities: ServiceCity[]) {
  const names = new Map<number, string>();
  for (const city of serviceCities) names.set(city.id, serviceCityName(city));
  if (Array.isArray(market.service_cities)) {
    for (const city of market.service_cities) {
      const id = Number(city.id);
      if (Number.isFinite(id)) names.set(id, serviceCityName(city));
    }
  }
  return marketServiceCityIds(market).map((id) => names.get(id) || `مدينة رقم ${id}`);
}

export function createMarketDraft(
  market: Market | undefined,
  classifications: Classification[],
  marketTypes: MarketType[] = [],
): MarketDraft {
  const scope = market?.scope === "service_city" ? "service_city" : "general";
  const defaultClassification = classifications.find((classification) =>
    marketTypes.some((item) => item.is_active && item.classification_id === classification.id),
  ) ?? classifications[0];
  return {
    name: market?.name ?? "",
    description: market?.description ?? "",
    isPopular: market?.is_popular ?? false,
    sendStoreNotification: false,
    classificationId: String(market?.classification?.id ?? defaultClassification?.id ?? ""),
    showInGeneral: scope === "general",
    showInServiceCities: scope === "service_city",
    selectedServiceCityIds: scope === "service_city" && market ? marketServiceCityIds(market).slice(0, 1) : [],
    deliveryTimeMin: market?.delivery_time_min_minutes?.toString() ?? "",
    deliveryTimeMax: market?.delivery_time_max_minutes?.toString() ?? "",
    selectedMarketTypeIds: (market?.market_types ?? []).map((item) => item.id),
  };
}

export function validateMarketDraft(
  draft: MarketDraft,
  { editing, hasImage, hasCover }: { editing: boolean; hasImage: boolean; hasCover: boolean },
) {
  if (!draft.name.trim()) return "اسم المحل مطلوب";
  if (!draft.classificationId) return "الفئة الأساسية للمحل مطلوبة.";
  if (!draft.selectedMarketTypeIds.length) return "اختر فئة ثانوية واحدة على الأقل للمحل.";
  const deliveryTimeMin = Number(draft.deliveryTimeMin);
  const deliveryTimeMax = Number(draft.deliveryTimeMax);
  if (!editing && (!hasImage || !hasCover)) return "صورة شعار المحل وصورة الغلاف مطلوبتان.";
  if (!editing && (!Number.isFinite(deliveryTimeMin) || deliveryTimeMin <= 0 || !Number.isFinite(deliveryTimeMax) || deliveryTimeMax < deliveryTimeMin)) {
    return "أدخل وقت توصيل صحيحًا، والحد الأقصى لا يقل عن الحد الأدنى.";
  }
  if (!draft.showInGeneral && !draft.showInServiceCities) return "اختر نطاق ظهور المحل";
  if (draft.showInGeneral && draft.showInServiceCities) return "اختر العام أو مدينة واحدة فقط.";
  if (draft.showInServiceCities && draft.selectedServiceCityIds.length === 0) return "اختر مدينة واحدة على الأقل";
  if (draft.selectedServiceCityIds.length > 1) return "يمكن اختيار مدينة واحدة فقط للمحل.";
  return null;
}

export function marketDraftCanSubmit(
  draft: MarketDraft,
  { editing, hasImage, hasCover }: { editing: boolean; hasImage: boolean; hasCover: boolean },
) {
  const deliveryTimeMin = Number(draft.deliveryTimeMin);
  const deliveryTimeMax = Number(draft.deliveryTimeMax);
  return Boolean(
    draft.name.trim() &&
    draft.classificationId &&
    draft.selectedMarketTypeIds.length &&
    (draft.showInGeneral || draft.showInServiceCities) &&
    (editing || (
      hasImage &&
      hasCover &&
      deliveryTimeMin > 0 &&
      deliveryTimeMax >= deliveryTimeMin
    )),
  );
}

export function marketPayload(draft: MarketDraft, editing: boolean): MarketPayload {
  return {
    classification_id: Number(draft.classificationId),
    name: draft.name.trim(),
    description: draft.description.trim(),
    delivery_time_min_minutes: draft.deliveryTimeMin ? Number(draft.deliveryTimeMin) : null,
    delivery_time_max_minutes: draft.deliveryTimeMax ? Number(draft.deliveryTimeMax) : null,
    is_popular: draft.isPopular,
    scope: draft.showInGeneral ? "general" : "service_city",
    delivery_area_ids: [],
    service_city_ids: draft.showInServiceCities ? uniqueNumbers(draft.selectedServiceCityIds) : [],
    market_type_ids: draft.selectedMarketTypeIds,
    send_notification: !editing && draft.sendStoreNotification,
  };
}

export function filterMarkets(markets: Market[], query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized
    ? markets.filter((market) => [market.name, classificationLabel(market)].some((item) => item.toLowerCase().includes(normalized)))
    : markets;
}
