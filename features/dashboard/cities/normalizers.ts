import type {
  CityBoundaryGeoJson,
  DeliveryArea,
  PolygonGeoJson,
  ServiceCity,
} from "./types";

type ServiceCityResponse = {
  id?: number | string;
  name?: string | null;
  name_ar?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  boundary_geojson?: CityBoundaryGeoJson | null;
  boundary_bbox?: number[] | null;
  delivery_price?: string | number | null;
  is_active?: boolean | null;
  archived_at?: string | null;
  deletion_mode?: "delete" | "archive" | null;
  delivery_area_count?: number | null;
  market_count?: number | null;
  offer_count?: number | null;
};

type DeliveryAreaResponse = {
  id?: number | string;
  service_city_id?: number | string | null;
  service_city?: { id?: number | string | null } | number | string | null;
  name?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  boundary_geojson?: PolygonGeoJson | null;
  boundary_bbox?: number[] | null;
  delivery_price?: string | number | null;
  eta_min_minutes?: number | null;
  eta_max_minutes?: number | null;
  is_active?: boolean | null;
};

export function firstCityApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstCityApiError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstCityApiError(item);
      if (message) return message;
    }
  }
  return null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberText(value: unknown, fallback: string) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function nullableNumberText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = numberText(value, "");
  return normalized || null;
}

function countValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function cityFromResponse(
  value: unknown,
  preferArabicName = false,
): ServiceCity | null {
  if (!value || typeof value !== "object") return null;
  const city = value as ServiceCityResponse;
  const id = Number(city.id);
  const name = preferArabicName
    ? textValue(city.name_ar) || textValue(city.name)
    : textValue(city.name) || textValue(city.name_ar);
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    center_latitude: nullableNumberText(city.center_latitude),
    center_longitude: nullableNumberText(city.center_longitude),
    radius_km: nullableNumberText(city.radius_km),
    boundary_geojson: city.boundary_geojson ?? null,
    boundary_bbox: Array.isArray(city.boundary_bbox) ? city.boundary_bbox : null,
    delivery_price: numberText(city.delivery_price, "0.00"),
    is_active: city.is_active !== false,
    archivedAt: typeof city.archived_at === "string" ? city.archived_at : null,
    deletionMode: city.deletion_mode === "archive" ? "archive" : "delete",
    delivery_area_count: countValue(city.delivery_area_count),
    market_count: countValue(city.market_count),
    offer_count: countValue(city.offer_count),
  };
}

export function deliveryAreaFromResponse(value: unknown): DeliveryArea | null {
  if (!value || typeof value !== "object") return null;
  const area = value as DeliveryAreaResponse;
  const id = Number(area.id);
  const cityId =
    area.service_city && typeof area.service_city === "object"
      ? Number(area.service_city.id)
      : Number(area.service_city_id ?? area.service_city);
  const name = textValue(area.name);
  const deliveryPrice = nullableNumberText(area.delivery_price);
  if (!Number.isFinite(id) || !Number.isFinite(cityId) || !name || deliveryPrice === null) {
    return null;
  }
  return {
    id,
    service_city_id: cityId,
    name,
    center_latitude: nullableNumberText(area.center_latitude),
    center_longitude: nullableNumberText(area.center_longitude),
    radius_km: nullableNumberText(area.radius_km),
    boundary_geojson: area.boundary_geojson ?? null,
    boundary_bbox: Array.isArray(area.boundary_bbox) ? area.boundary_bbox : null,
    delivery_price: deliveryPrice,
    eta_min_minutes: typeof area.eta_min_minutes === "number" ? area.eta_min_minutes : null,
    eta_max_minutes: typeof area.eta_max_minutes === "number" ? area.eta_max_minutes : null,
    is_active: area.is_active !== false,
  };
}
