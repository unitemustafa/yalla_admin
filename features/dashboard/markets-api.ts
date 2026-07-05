type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type ServiceCity = {
  id: number;
  name: string;
  center_latitude?: string | null;
  center_longitude?: string | null;
  radius_km?: string | null;
  delivery_price?: string;
  is_active: boolean;
};

export type DeliveryArea = {
  id: number;
  service_city_id: number;
  name: string;
  center_latitude?: string | null;
  center_longitude?: string | null;
  radius_km?: string | null;
  delivery_price: string;
  is_active: boolean;
};

type ServiceCityResponse = {
  id?: number | string;
  name?: string | null;
  name_ar?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  delivery_price?: string | number | null;
  is_active?: boolean | null;
};

type DeliveryAreaResponse = {
  id?: number | string;
  service_city_id?: number | string | null;
  service_city?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
  name?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  delivery_price?: string | number | null;
  is_active?: boolean | null;
};

function listFromResponse(value: unknown) {
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

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function responseError(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return responseError(value[0], fallback);
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = responseError(item, "");
      if (message) return message;
    }
  }
  return fallback;
}

function serviceCityFromResponse(value: unknown): ServiceCity | null {
  if (!value || typeof value !== "object") return null;
  const city = value as ServiceCityResponse;
  const id = numberValue(city.id);
  const name = textValue(city.name_ar) || textValue(city.name);
  if (id === null || !name) return null;

  return {
    id,
    name,
    center_latitude: nullableText(city.center_latitude),
    center_longitude: nullableText(city.center_longitude),
    radius_km: nullableText(city.radius_km),
    ...(nullableText(city.delivery_price) ? { delivery_price: nullableText(city.delivery_price) ?? undefined } : {}),
    is_active: city.is_active !== false,
  };
}

function deliveryAreaFromResponse(value: unknown): DeliveryArea | null {
  if (!value || typeof value !== "object") return null;
  const area = value as DeliveryAreaResponse;
  const id = numberValue(area.id);
  const serviceCityId = numberValue(area.service_city_id ?? area.service_city?.id);
  const name = textValue(area.name);
  const deliveryPrice = nullableText(area.delivery_price);
  if (id === null || serviceCityId === null || !name || deliveryPrice === null) return null;

  return {
    id,
    service_city_id: serviceCityId,
    name,
    center_latitude: nullableText(area.center_latitude),
    center_longitude: nullableText(area.center_longitude),
    radius_km: nullableText(area.radius_km),
    delivery_price: deliveryPrice,
    is_active: area.is_active !== false,
  };
}

export async function loadServiceCities(apiFetch: ApiFetch) {
  const response = await apiFetch("locations/service-cities/");
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(responseError(data, "تعذر تحميل المدن."));
  }

  return listFromResponse(data)
    .map(serviceCityFromResponse)
    .filter((city): city is ServiceCity => Boolean(city));
}

export async function loadDeliveryAreasForCity(apiFetch: ApiFetch, cityId: number) {
  const response = await apiFetch(
    `locations/delivery-areas/?service_city_id=${encodeURIComponent(cityId)}`,
  );
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(responseError(data, "تعذر تحميل مناطق التوصيل."));
  }

  return listFromResponse(data)
    .map(deliveryAreaFromResponse)
    .filter((area): area is DeliveryArea => Boolean(area));
}
