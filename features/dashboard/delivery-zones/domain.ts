import type { PolygonGeoJson } from "../cities/types";
import type { DeliveryZone, DeliveryZoneStatus } from "./types";

export const deliveryListPageSize = 5;
export const allCitiesFilterValue = "all";

export const deliveryZoneStatusLabels: Record<DeliveryZoneStatus, string> = {
  active: "مفعلة",
  inactive: "غير مفعلة",
};

export type ZoneDraft = {
  cityId: string;
  name: string;
  fixedDeliveryPrice: string;
  etaMinMinutes: string;
  etaMaxMinutes: string;
  boundaryGeojson: PolygonGeoJson | null;
};

export type ZoneDraftErrors = Partial<Record<keyof ZoneDraft, string>>;

export function formatDeliveryCurrency(value: number) {
  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formattedValue} EGP`;
}

export function parseDeliveryNumber(value: string) {
  const numberValue = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function numberToDraftValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function createZoneDraft(zone?: DeliveryZone): ZoneDraft {
  return {
    cityId: zone?.cityId ?? "",
    name: zone?.name ?? "",
    fixedDeliveryPrice: numberToDraftValue(zone?.fixedDeliveryPrice ?? 0),
    etaMinMinutes: zone?.etaMinMinutes == null ? "" : String(zone.etaMinMinutes),
    etaMaxMinutes: zone?.etaMaxMinutes == null ? "" : String(zone.etaMaxMinutes),
    boundaryGeojson: zone?.boundaryGeojson ?? null,
  };
}

export function validateZoneDraft(draft: ZoneDraft) {
  const errors: ZoneDraftErrors = {};
  const fixedDeliveryPrice = parseDeliveryNumber(draft.fixedDeliveryPrice);
  const etaMin = Number(draft.etaMinMinutes);
  const etaMax = Number(draft.etaMaxMinutes);
  const boundaryPoints = draft.boundaryGeojson?.coordinates[0]?.length ?? 0;
  if (!draft.cityId) errors.cityId = "مدينة التوصيل مطلوبة.";
  if (!draft.name.trim()) errors.name = "اسم المنطقة مطلوب.";
  if (fixedDeliveryPrice < 0) errors.fixedDeliveryPrice = "السعر لا يكون أقل من صفر.";
  if (!Number.isInteger(etaMin) || etaMin <= 0) {
    errors.etaMinMinutes = "أدخل أقل مدة توصيل صحيحة بالدقائق.";
  }
  if (!Number.isInteger(etaMax) || etaMax < etaMin) {
    errors.etaMaxMinutes = "أقصى مدة يجب أن تساوي أو تتجاوز أقل مدة.";
  }
  if (boundaryPoints < 4) {
    errors.boundaryGeojson = "ارسم حدود منطقة التوصيل بثلاث نقاط على الأقل.";
  }
  return errors;
}

function createZoneId(name: string, timestamp: number) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]/gu, "");
  return `${normalizedName || "zone"}-${timestamp}`;
}

export function zoneFromDraft(
  draft: ZoneDraft,
  currentZone?: DeliveryZone,
  now = new Date(),
): DeliveryZone {
  const today = now.toISOString().slice(0, 10);
  return {
    id: currentZone?.id ?? createZoneId(draft.name, now.getTime()),
    cityId: draft.cityId,
    cityName: currentZone?.cityName ?? "",
    name: draft.name.trim(),
    fixedDeliveryPrice: parseDeliveryNumber(draft.fixedDeliveryPrice),
    etaMinMinutes: Number(draft.etaMinMinutes),
    etaMaxMinutes: Number(draft.etaMaxMinutes),
    boundaryGeojson: draft.boundaryGeojson,
    status: currentZone?.status ?? "active",
    createdAt: currentZone?.createdAt ?? today,
    updatedAt: today,
  };
}

export function filterDeliveryZones(zones: DeliveryZone[], query: string) {
  const normalizedSearch = query.trim().toLocaleLowerCase("ar-EG");
  if (!normalizedSearch) return zones;
  return zones.filter((zone) =>
    [zone.name, zone.cityName, deliveryZoneStatusLabels[zone.status]]
      .join(" ")
      .toLocaleLowerCase("ar-EG")
      .includes(normalizedSearch),
  );
}

export function deliveryZoneMetrics(zones: DeliveryZone[]) {
  const prices = zones.map((zone) => zone.fixedDeliveryPrice);
  return {
    count: zones.length,
    lowestPrice: prices.length ? Math.min(...prices) : 0,
    highestPrice: prices.length ? Math.max(...prices) : 0,
  };
}
