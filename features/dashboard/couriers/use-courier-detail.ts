"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/auth";
import type { BackendDashboardUser } from "../users/api-users";
import { loadCourierDetailData, refreshCourier } from "./api";
import { courierStatusPollMs } from "./domain";
import type { CourierOrder, CourierOrderSummary } from "./types";

export function useCourierDetail(courierId: string) {
  const { apiFetch } = useAuth();
  const [courier, setCourier] = useState<BackendDashboardUser | null>(null);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [count, setCount] = useState(0);
  const [activeOrders, setActiveOrders] = useState<CourierOrder[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<CourierOrder[]>([]);
  const [summary, setSummary] = useState<CourierOrderSummary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRefreshInFlightRef = useRef(false);
  const loadControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await loadCourierDetailData(apiFetch, courierId, currentPage, search, controller.signal);
      if (controller.signal.aborted) return;
      setCourier(data.courier);
      setOrders(data.orders);
      setCount(data.count);
      setActiveOrders(data.activeOrders);
      setDeliveredOrders(data.latestDelivered);
      setSummary(data.summary);
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطيار.");
    } finally {
      if (loadControllerRef.current === controller) {
        loadControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [apiFetch, courierId, currentPage, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); loadControllerRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const refreshStatus = useCallback(async () => {
    if (statusRefreshInFlightRef.current) return;
    statusRefreshInFlightRef.current = true;
    try {
      const data = await refreshCourier(apiFetch, courierId);
      if (data) {
        setCourier(data);
        setError(null);
      }
    } finally {
      statusRefreshInFlightRef.current = false;
    }
  }, [apiFetch, courierId]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshStatus().catch(() => undefined);
    };
    const pollTimer = window.setInterval(refreshWhenVisible, courierStatusPollMs);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshStatus]);


  return {
    courier,
    orders,
    activeOrders,
    deliveredOrders,
    deliveredTotal: Number(summary?.delivered_total ?? 0),
    totalCount: summary?.total ?? count,
    deliveredCount: summary?.delivered ?? deliveredOrders.length,
    activeCount: summary?.active ?? activeOrders.length,
    visibleOrders: orders,
    filteredCount: count,
    currentPage,
    totalPages: Math.max(1, Math.ceil(count / 25)),
    setCurrentPage,
    query,
    setQuery: (value: string) => { setQuery(value); setCurrentPage(1); },
    loading,
    error,
    load,
  };
}
