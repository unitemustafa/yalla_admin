"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  createDefaultDateRange,
  dateRangeError,
  formatDateParam,
} from "./date-range";
import { getDashboardOverview } from "./request";
import type { DashboardOverview, DateRange } from "./types";

export function useOverview() {
  const { apiFetch } = useAuth();
  const [range, setRange] = useState<DateRange>(() => createDefaultDateRange());
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didLoadInitialData = useRef(false);

  const loadDashboard = useCallback(
    async (selectedRange: DateRange) => {
      const rangeError = dateRangeError(selectedRange);
      if (rangeError) {
        setError(rangeError);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const overview = await getDashboardOverview(
          apiFetch,
          formatDateParam(selectedRange.from),
          formatDateParam(selectedRange.to),
        );
        setDashboardData(overview);
      } catch (reason) {
        setDashboardData(null);
        const message =
          reason instanceof Error
            ? reason.message
            : "تعذر تحميل بيانات لوحة التحكم";

        setError(
          message.includes("جلسة") || message.includes("401")
            ? "انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى"
            : message || "تعذر تحميل بيانات لوحة التحكم",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    if (didLoadInitialData.current) return;
    didLoadInitialData.current = true;
    void loadDashboard(range);
  }, [loadDashboard, range]);

  return {
    range,
    setRange,
    dashboardData,
    loading,
    error,
    refresh: () => void loadDashboard(range),
  };
}
