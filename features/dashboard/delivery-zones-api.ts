import type { DeliveryZone } from "./delivery-pricing";
import type { AreaBoundaryGeoJson } from "./cities-api";
import { apiResponseData, firstApiError } from "./users/api-users";

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
  boundary_geojson?: AreaBoundaryGeoJson | null;
  boundary_source?: "osm" | "h3" | "manual" | null;
  source_reference?: string | null;
  h3_resolution?: number | null;
  h3_cells?: string[] | null;
  is_active?: boolean | null;
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
    boundarySource: area.boundary_source ?? "manual",
    sourceReference: area.source_reference ?? "",
    h3Resolution:
      typeof area.h3_resolution === "number" ? area.h3_resolution : null,
    h3Cells: Array.isArray(area.h3_cells) ? area.h3_cells : [],
    status: area.is_active === false ? "inactive" : "active",
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
    boundary_source: zone.boundarySource,
    source_reference: zone.sourceReference,
    h3_resolution: zone.h3Resolution,
    h3_cells: zone.h3Cells,
    is_active: zone.status === "active",
  };
}

export type PlaceSearchResult = {
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  boundaryGeojson: AreaBoundaryGeoJson | null;
  boundaryBbox: number[] | null;
  sourceReference: string;
};

type PlaceSearchResponse = {
  display_name?: unknown;
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  boundary_geojson?: AreaBoundaryGeoJson | null;
  boundary_bbox?: unknown;
  source_reference?: unknown;
};

export async function searchDeliveryPlaces(apiFetch: ApiFetch, query: string) {
  const data = await checkedData(
    await apiFetch(`locations/place-search/?q=${encodeURIComponent(query.trim())}`),
    "تعذر البحث عن المكان الآن.",
  );
  if (!Array.isArray(data)) {
    throw new Error("استجابة البحث عن المكان غير مكتملة.");
  }
  return data.flatMap((value): PlaceSearchResult[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as PlaceSearchResponse;
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const displayName =
      typeof item.display_name === "string" ? item.display_name.trim() : "";
    if (!displayName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return [];
    }
    return [{
      displayName,
      name: typeof item.name === "string" ? item.name.trim() : "",
      latitude,
      longitude,
      boundaryGeojson: item.boundary_geojson ?? null,
      boundaryBbox: Array.isArray(item.boundary_bbox)
        ? item.boundary_bbox.map(Number)
        : null,
      sourceReference:
        typeof item.source_reference === "string" ? item.source_reference : "",
    }];
  });
}

async function checkedData(response: Response, fallback: string) {
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(firstApiError(data) ?? fallback);
  }
  return data;
}

export async function loadDeliveryZones(apiFetch: ApiFetch, serviceCityId?: string) {
  const query = serviceCityId
    ? `?service_city_id=${encodeURIComponent(serviceCityId)}`
    : "";
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
  if (response.status === 204) return;
  await checkedData(response, "تعذر حذف منطقة التوصيل.");
}
