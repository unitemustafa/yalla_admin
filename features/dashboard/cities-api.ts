"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";

export type ServiceCityCoverage = {
  id?: number;
  center_latitude: string;
  center_longitude: string;
  radius_km: string;
  is_active: boolean;
};

export type ServiceCity = {
  id: number;
  name: string;
  name_ar: string;
  slug: string;
  is_active: boolean;
  coverages: ServiceCityCoverage[];
  market_count: number;
  offer_count: number;
  created_at: string;
  updated_at: string;
};

export type ServiceCityPayload = {
  name: string;
  center_latitude: string;
  center_longitude: string;
  radius_km: string;
  is_active: boolean;
};

export type DeliveryArea = {
  id: number;
  service_city_id: number;
  name: string;
  center_latitude: string | null;
  center_longitude: string | null;
  radius_km: string | null;
  delivery_price: string;
  is_active: boolean;
};

export type DeliveryAreaPayload = {
  service_city_id: number;
  name: string;
  center_latitude: string | null;
  center_longitude: string | null;
  radius_km: string | null;
  delivery_price: string;
  is_active: boolean;
};

function firstError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstError(item);
      if (message) return message;
    }
  }
  return null;
}

async function responseJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

type ServiceCityResponse = {
  id?: number | string;
  name?: string | null;
  name_ar?: string | null;
  slug?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  is_active?: boolean | null;
  coverages?: ServiceCityCoverage[] | null;
  market_count?: number | null;
  offer_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DeliveryAreaResponse = {
  id?: number | string;
  service_city_id?: number | string | null;
  service_city?: { id?: number | string | null } | number | string | null;
  name?: string | null;
  center_latitude?: string | number | null;
  center_longitude?: string | number | null;
  radius_km?: string | number | null;
  delivery_price?: string | number | null;
  is_active?: boolean | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeNumberText(value: unknown, fallback: string) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function responseList(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as { results?: unknown; data?: unknown };
    if (Array.isArray(record.results)) return record.results;
    if (Array.isArray(record.data)) return record.data;
    if (record.data && typeof record.data === "object") {
      const nested = record.data as { results?: unknown };
      if (Array.isArray(nested.results)) return nested.results;
    }
  }
  return [];
}

function cityFromResponse(value: unknown): ServiceCity | null {
  if (!value || typeof value !== "object") return null;
  const city = value as ServiceCityResponse;
  const id = Number(city.id);
  const name = normalizeText(city.name).trim();
  if (!Number.isFinite(id) || !name) return null;

  const active = city.is_active !== false;
  const coverages =
    Array.isArray(city.coverages) && city.coverages.length
      ? city.coverages
      : [
          {
            center_latitude: normalizeNumberText(city.center_latitude, "30.0444000"),
            center_longitude: normalizeNumberText(city.center_longitude, "31.2357000"),
            radius_km: normalizeNumberText(city.radius_km, "25.00"),
            is_active: active,
          },
        ];

  return {
    id,
    name,
    name_ar: normalizeText(city.name_ar).trim() || name,
    slug: normalizeText(city.slug).trim() || String(id),
    is_active: active,
    coverages,
    market_count: normalizeCount(city.market_count),
    offer_count: normalizeCount(city.offer_count),
    created_at: normalizeText(city.created_at),
    updated_at: normalizeText(city.updated_at),
  };
}

function deliveryAreaFromResponse(value: unknown): DeliveryArea | null {
  if (!value || typeof value !== "object") return null;
  const area = value as DeliveryAreaResponse;
  const id = Number(area.id);
  const cityId =
    area.service_city && typeof area.service_city === "object"
      ? Number(area.service_city.id)
      : Number(area.service_city_id ?? area.service_city);
  const name = normalizeText(area.name).trim();
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
    delivery_price: deliveryPrice,
    is_active: area.is_active !== false,
  };
}

export function useServiceCities({ activeOnly = false } = {}) {
  const { apiFetch } = useAuth();
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("locations/service-cities/");
      const data = await responseJson(response);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(firstError(data) ?? "تعذر تحميل المدن من الخادم.");
      }
      const nextCities = data
        .map(cityFromResponse)
        .filter((city): city is ServiceCity => Boolean(city));
      setCities(activeOnly ? nextCities.filter((city) => city.is_active) : nextCities);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل المدن.");
    } finally {
      setLoading(false);
    }
  }, [activeOnly, apiFetch]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  return { cities, setCities, loading, error, reload };
}

export async function saveServiceCity(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  payload: ServiceCityPayload,
  cityId?: number,
) {
  const response = await apiFetch(
    cityId
      ? `locations/service-cities/${cityId}/`
      : "locations/service-cities/",
    {
      method: cityId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(firstError(data) ?? "تعذر حفظ المدينة.");
  }
  const city = cityFromResponse(data);
  if (!city) {
    throw new Error("تم الحفظ لكن استجابة الباك غير مكتملة.");
  }
  return city;
}

export async function deleteServiceCity(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityId: number,
) {
  const response = await apiFetch(`locations/service-cities/${cityId}/`, {
    method: "DELETE",
  });
  if (response.ok) return;
  const data = await responseJson(response);
  throw new Error(firstError(data) ?? "تعذر حذف المدينة.");
}

export async function loadDeliveryAreas(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  cityId: number,
) {
  const response = await apiFetch(
    `locations/delivery-areas/?service_city_id=${encodeURIComponent(cityId)}`,
  );
  const data = await responseJson(response);
  if (!response.ok) {
    throw new Error(firstError(data) ?? "تعذر تحميل مناطق التوصيل.");
  }
  return responseList(data)
    .map(deliveryAreaFromResponse)
    .filter((area): area is DeliveryArea => Boolean(area));
}

export async function saveDeliveryArea(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  payload: DeliveryAreaPayload,
  areaId?: number,
) {
  const response = await apiFetch(
    areaId
      ? `locations/delivery-areas/${areaId}/`
      : "locations/delivery-areas/",
    {
      method: areaId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = await responseJson(response);
  if (!response.ok || !data || typeof data !== "object") {
    throw new Error(firstError(data) ?? "تعذر حفظ منطقة التوصيل.");
  }
  const area = deliveryAreaFromResponse(data);
  if (!area) {
    throw new Error("تم الحفظ لكن استجابة منطقة التوصيل غير مكتملة.");
  }
  return area;
}

export async function deleteDeliveryArea(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  areaId: number,
) {
  const response = await apiFetch(`locations/delivery-areas/${areaId}/`, {
    method: "DELETE",
  });
  if (response.ok) return;
  const data = await responseJson(response);
  throw new Error(firstError(data) ?? "تعذر حذف منطقة التوصيل.");
}
