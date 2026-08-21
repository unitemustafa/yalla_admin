import type { PolygonGeoJson } from "../cities/types";
import { deletionResult } from "../admin-api";
import { apiResponseData, firstApiError } from "../users/api-users";
import type { DeliveryZone } from "./types";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type DeliveryAreaResponse = {
  id: number | string;
  service_city_id?: number | string | null;
  service_city?: number | string | { id?: number | string; name?: string | null; name_ar?: string | null } | null;
  service_city_name?: string | null;
  name: string;
  delivery_price: string | number;
  eta_min_minutes?: number | null;
  eta_max_minutes?: number | null;
  boundary_geojson?: PolygonGeoJson | null;
  is_active?: boolean | null;
  archived_at?: string | null;
  deletion_mode?: "delete" | "archive" | null;
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
    fixedDeliveryPrice: numberValue(area.delivery_price),
    etaMinMinutes:
      typeof area.eta_min_minutes === "number" ? area.eta_min_minutes : null,
    etaMaxMinutes:
      typeof area.eta_max_minutes === "number" ? area.eta_max_minutes : null,
    boundaryGeojson: area.boundary_geojson ?? null,
    status: area.is_active === false ? "inactive" : "active",
    archivedAt: area.archived_at ?? null,
    deletionMode: area.deletion_mode === "archive" ? "archive" : "delete",
    createdAt: area.createdAt ?? area.created_at ?? null,
    updatedAt: area.updatedAt ?? area.updated_at ?? null,
  };
}

function payloadFromDeliveryZone(zone: DeliveryZone) {
  return {
    service_city_id: Number(zone.cityId),
    name: zone.name,
    delivery_price: zone.fixedDeliveryPrice,
    eta_min_minutes: zone.etaMinMinutes,
    eta_max_minutes: zone.etaMaxMinutes,
    boundary_geojson: zone.boundaryGeojson,
    is_active: zone.status === "active",
  };
}

async function checkedData(response: Response, fallback: string) {
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(firstApiError(data) ?? fallback);
  }
  return data;
}

export async function loadDeliveryZones(
  apiFetch: ApiFetch,
  serviceCityId?: string,
  archived = false,
) {
  const params = new URLSearchParams();
  if (serviceCityId) params.set("service_city_id", serviceCityId);
  if (archived) params.set("archived", "true");
  const query = params.size ? `?${params.toString()}` : "";
  const data = await checkedData(
    await apiFetch(`locations/delivery-areas/${query}`),
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
  if (response.status === 204) return deletionResult(null);
  const data = await checkedData(response, "تعذر حذف منطقة التوصيل.");
  return deletionResult(data);
}

export async function restoreDeliveryZone(apiFetch: ApiFetch, zoneId: string) {
  const data = await checkedData(
    await apiFetch(
      `locations/delivery-areas/${encodeURIComponent(zoneId)}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      },
    ),
    "تعذر استعادة منطقة التوصيل.",
  );
  if (!isDeliveryAreaResponse(data)) {
    throw new Error("تمت الاستعادة لكن استجابة الباك غير مكتملة.");
  }
  return deliveryZoneFromResponse(data);
}
