"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { loadServiceCities } from "./api";
import type { ServiceCity } from "./types";

export function useServiceCities({ activeOnly = false, archived = false } = {}) {
  const { apiFetch } = useAuth();
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCities(await loadServiceCities(apiFetch, { activeOnly, archived }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل المدن.");
    } finally {
      setLoading(false);
    }
  }, [activeOnly, apiFetch, archived]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  return { cities, setCities, loading, error, reload };
}
