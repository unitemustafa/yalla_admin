"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/auth";
import { apiResponseData } from "../../users/api-users";
import { dashboardOrdersChangedEvent } from "../../order-display";
import { orderApiError } from "../api";
import { ordersPageSize } from "../constants";
import { orderMetrics, type OrderDeliveryFilter } from "../list-domain";
import { ordersListPath, parseOrdersPage } from "./orders-page-data";
import type { BackendOrder, BackendOrderStatus } from "../types";

export function useOrdersList() {
  const { apiFetch } = useAuth();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(0);
  const [metrics, setMetrics] = useState(orderMetrics([]));
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
        const path = ordersListPath({ page: currentPage, status: nextStatus, search, deliveryType });
        const response = await apiFetch(path, { signal: controller.signal });
        const data = await apiResponseData(response);
        if (!response.ok) {
          if (response.status === 404 && currentPage > 1) { setCurrentPage(1); return; }
          throw new Error(orderApiError(data, "تعذر تحميل الطلبات."));
        }
        if (controller.signal.aborted) return;
        const page = parseOrdersPage(data);
        setOrders(page.orders);
        setCount(page.count);
        setMetrics(page.metrics);
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
    [apiFetch, currentPage, deliveryType, search],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(status), 0);
    return () => {
      window.clearTimeout(timer);
      loadControllerRef.current?.abort();
    };
  }, [loadOrders, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleOrdersChanged = () => void loadOrders(status);
    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    return () => window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
  }, [loadOrders, status]);

  const totalPages = Math.max(1, Math.ceil(count / ordersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ordersPageSize;

  return {
    deliveryType,
    error,
    loadOrders,
    loading,
    metrics,
    pageStartIndex,
    pagedOrders: orders,
    query,
    safeCurrentPage,
    setCurrentPage,
    setDeliveryType,
    setQuery,
    setStatus,
    status,
    totalPages,
    visibleOrdersCount: count,
  };
}
