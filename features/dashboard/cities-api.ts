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
  name_ar: string;
  is_active: boolean;
  coverages: ServiceCityCoverage[];
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

export function useServiceCities({ activeOnly = false } = {}) {
  const { apiFetch } = useAuth();
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        activeOnly ? "locations/cities/" : "locations/service-cities/",
      );
      const data = await responseJson(response);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(firstError(data) ?? "تعذر تحميل المدن من الخادم.");
      }
      setCities(data as ServiceCity[]);
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
  return data as ServiceCity;
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
