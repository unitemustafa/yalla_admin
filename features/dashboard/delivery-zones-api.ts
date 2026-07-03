import type { DeliveryZone } from "./delivery-pricing";
import { apiResponseData, firstApiError } from "./users/api-users";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type DeliveryAreaResponse = {
  id: number | string;
  service_city_id?: number | string | null;
  service_city?: number | string | { id?: number | string; name?: string | null; name_ar?: string | null } | null;
  service_city_name?: string | null;
  name: string;
  delivery_price: string | number;
  pricing_type: DeliveryZone["pricingType"];
  base_price: string | number;
  included_km: string | number;
  price_per_extra_km: string | number;
  min_order_amount: string | number;
  max_distance_km: string | number;
  estimated_delivery_minutes: number;
  status: DeliveryZone["status"];
  notes?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function numberValue(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDeliveryAreaResponse(value: unknown): value is DeliveryAreaResponse {
  if (!value || typeof value !== "object") return false;
  const area = value as Partial<DeliveryAreaResponse>;
  return area.id !== undefined && typeof area.name === "string";
}

function deliveryZoneFromResponse(area: DeliveryAreaResponse): DeliveryZone {
  const cityObject =
    area.service_city && typeof area.service_city === "object" ? area.service_city : null;
  const cityId = area.service_city_id ?? cityObject?.id ?? "";

  return {
    id: String(area.id),
    cityId: String(cityId),
    cityName: area.service_city_name ?? cityObject?.name_ar ?? cityObject?.name ?? "",
    name: area.name,
    pricingType: area.pricing_type ?? "fixed",
    fixedDeliveryPrice: numberValue(area.delivery_price),
    basePrice: numberValue(area.base_price),
    includedKm: numberValue(area.included_km),
    pricePerExtraKm: numberValue(area.price_per_extra_km),
    minOrderAmount: numberValue(area.min_order_amount),
    maxDistanceKm: numberValue(area.max_distance_km),
    estimatedDeliveryMinutes: numberValue(area.estimated_delivery_minutes),
    status: area.status ?? "active",
    notes: area.notes ?? "",
    createdAt: area.createdAt ?? area.created_at ?? null,
    updatedAt: area.updatedAt ?? area.updated_at ?? null,
  };
}

function payloadFromDeliveryZone(zone: DeliveryZone) {
  return {
    service_city_id: Number(zone.cityId),
    name: zone.name,
    delivery_price: zone.fixedDeliveryPrice,
    pricing_type: zone.pricingType,
    base_price: zone.basePrice,
    included_km: zone.includedKm,
    price_per_extra_km: zone.pricePerExtraKm,
    min_order_amount: zone.minOrderAmount,
    max_distance_km: zone.maxDistanceKm,
    estimated_delivery_minutes: zone.estimatedDeliveryMinutes,
    status: zone.status,
    notes: zone.notes,
  };
}

async function checkedData(response: Response, fallback: string) {
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(firstApiError(data) ?? fallback);
  }
  return data;
}

export async function loadDeliveryZones(apiFetch: ApiFetch) {
  const data = await checkedData(
    await apiFetch("locations/delivery-areas/"),
    "تعذر تحميل مناطق التوصيل.",
  );
  if (!Array.isArray(data)) {
    throw new Error("استجابة مناطق التوصيل غير مكتملة.");
  }
  return data.filter(isDeliveryAreaResponse).map(deliveryZoneFromResponse);
}

export async function saveDeliveryZone(apiFetch: ApiFetch, zone: DeliveryZone) {
  const isExisting = /^\d+$/.test(zone.id);
  const data = await checkedData(
    await apiFetch(
      isExisting
        ? `locations/delivery-areas/${encodeURIComponent(zone.id)}/`
        : "locations/delivery-areas/",
      {
        method: isExisting ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDeliveryZone(zone)),
      },
    ),
    isExisting ? "تعذر تحديث منطقة التوصيل." : "تعذر إضافة منطقة التوصيل.",
  );
  if (!isDeliveryAreaResponse(data)) {
    throw new Error("تم الحفظ لكن استجابة الباك غير مكتملة.");
  }
  return deliveryZoneFromResponse(data);
}

export async function deleteDeliveryZone(apiFetch: ApiFetch, zoneId: string) {
  const response = await apiFetch(
    `locations/delivery-areas/${encodeURIComponent(zoneId)}/`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  await checkedData(response, "تعذر حذف منطقة التوصيل.");
}
