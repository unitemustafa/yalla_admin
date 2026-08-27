"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  getDeliveryDestination,
  getDeliveryTypeLabel,
  getOrderMarketsSummary,
  getOrderScopeLabel,
} from "../order-display";
import type { BackendDashboardUser } from "../users/api-users";
import { loadCourierDetailData, refreshCourier } from "./api";
import {
  courierCustomerName,
  courierOrderNumber,
  courierStatusPollMs,
} from "./domain";
import { isActiveAssignedOrder } from "./order-rules";
import type { CourierOrder } from "./types";

export function useCourierDetail(courierId: string) {
  const { apiFetch } = useAuth();
  const [courier, setCourier] = useState<BackendDashboardUser | null>(null);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRefreshInFlightRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadCourierDetailData(apiFetch, courierId);
      setCourier(data.courier);
      setOrders(data.orders);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطيار.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, courierId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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

  const activeOrders = useMemo(() => orders.filter(isActiveAssignedOrder), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((order) => order.status === "delivered"), [orders]);
  const deliveredTotal = useMemo(() => deliveredOrders.reduce((sum, order) => sum + Number(order.total_price ?? 0), 0), [deliveredOrders]);
  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar-EG");
    if (!normalized) return orders;
    return orders.filter((order) => [
      order.id,
      courierOrderNumber(order),
      courierCustomerName(order),
      order.customer?.phone,
      getOrderScopeLabel(order),
      getOrderMarketsSummary(order),
      getDeliveryDestination(order),
      getDeliveryTypeLabel(order),
    ].join(" ").toLocaleLowerCase("ar-EG").includes(normalized));
  }, [orders, query]);

  return {
    courier,
    orders,
    activeOrders,
    deliveredOrders,
    deliveredTotal,
    visibleOrders,
    query,
    setQuery,
    loading,
    error,
    load,
  };
}
