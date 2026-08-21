"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/auth";
import { apiListData } from "../../shared/api-data";
import {
  apiResponseData,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../../users/api-users";
import { dashboardOrdersChangedEvent } from "../../order-display";
import { orderApiError } from "../api";
import { ordersPageSize } from "../constants";
import { filterOrders, orderMetrics, type OrderDeliveryFilter } from "../list-domain";
import type { BackendOrder, BackendOrderStatus } from "../types";

export function useOrdersList() {
  const { apiFetch } = useAuth();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [representatives, setRepresentatives] = useState<BackendDashboardUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BackendOrderStatus>("all");
  const [deliveryType, setDeliveryType] = useState<OrderDeliveryFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  const loadOrders = useCallback(
    async (nextStatus: "all" | BackendOrderStatus) => {
      loadControllerRef.current?.abort();
      const controller = new AbortController();
      loadControllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const path = nextStatus === "all"
          ? "orders/"
          : `orders/?status=${encodeURIComponent(nextStatus)}`;
        const response = await apiFetch(path, { signal: controller.signal });
        const data = await apiResponseData(response);
        if (!response.ok) throw new Error(orderApiError(data, "تعذر تحميل الطلبات."));
        if (controller.signal.aborted) return;
        setOrders(apiListData<BackendOrder>(data));
        try {
          const representativesResponse = await apiFetch("auth/representatives/", {
            signal: controller.signal,
          });
          const representativesData = await apiResponseData(representativesResponse);
          if (representativesResponse.ok && !controller.signal.aborted) {
            setRepresentatives(
              Array.isArray(representativesData)
                ? representativesData.filter(isBackendDashboardUser)
                : [],
            );
          }
        } catch (reason) {
          if (isAbortError(reason)) return;
          setRepresentatives([]);
        }
      } catch (reason) {
        if (isAbortError(reason)) return;
        setError(reason instanceof Error ? reason.message : "تعذر تحميل الطلبات.");
      } finally {
        if (loadControllerRef.current === controller) {
          loadControllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders("all"), 0);
    return () => {
      window.clearTimeout(timer);
      loadControllerRef.current?.abort();
    };
  }, [loadOrders]);

  useEffect(() => {
    const handleOrdersChanged = () => void loadOrders(status);
    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    return () => window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
  }, [loadOrders, status]);

  const visibleOrders = useMemo(
    () => filterOrders(orders, representatives, query, status, deliveryType),
    [deliveryType, orders, query, representatives, status],
  );
  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ordersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ordersPageSize;
  const pagedOrders = visibleOrders.slice(pageStartIndex, pageStartIndex + ordersPageSize);

  return {
    deliveryType,
    error,
    loadOrders,
    loading,
    metrics: orderMetrics(orders),
    pageStartIndex,
    pagedOrders,
    query,
    safeCurrentPage,
    setCurrentPage,
    setDeliveryType,
    setQuery,
    setStatus,
    status,
    totalPages,
    visibleOrdersCount: visibleOrders.length,
  };
}
