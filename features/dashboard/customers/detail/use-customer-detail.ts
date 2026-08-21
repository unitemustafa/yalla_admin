"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../../snackbar";
import { dashboardUserFromBackend } from "../../users/api-users";
import type { DashboardUser } from "../../users/types";
import { fetchCustomer, updateCustomerActivation } from "../api";
import { recentOrdersFromBackend } from "./domain";
import type { CustomerRecentOrder } from "./types";

export function useCustomerDetail(userId: string) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [orders, setOrders] = useState<CustomerRecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activationPending, setActivationPending] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCustomer(apiFetch, userId);
      setUser(dashboardUserFromBackend(data));
      setOrders(recentOrdersFromBackend(data.recent_orders));
    } catch (loadError) {
      setUser(null);
      setOrders([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل بيانات المستخدم من الباك.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser();
    }, 0);

    const refreshWhenDashboardRegainsFocus = () => {
      void loadUser();
    };
    const refreshWhenDocumentBecomesVisible = () => {
      if (document.visibilityState === "visible") {
        void loadUser();
      }
    };

    window.addEventListener("focus", refreshWhenDashboardRegainsFocus);
    document.addEventListener(
      "visibilitychange",
      refreshWhenDocumentBecomesVisible,
    );

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshWhenDashboardRegainsFocus);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenDocumentBecomesVisible,
      );
    };
  }, [loadUser]);

  async function handleActivationChange(checked: boolean) {
    if (!user || activationPending) return;

    setActivationPending(true);
    try {
      const data = await updateCustomerActivation(apiFetch, userId, checked);
      if (Array.isArray(data.recent_orders) && "customer_stats" in data) {
        setUser(dashboardUserFromBackend(data));
        setOrders(recentOrdersFromBackend(data.recent_orders));
      } else {
        await loadUser();
      }
      showSnackbar({
        message: checked
          ? `تم تفعيل العميل ${user.name}.`
          : `تم تعطيل العميل ${user.name}.`,
        tone: checked ? "success" : "danger",
      });
    } catch (activationError) {
      showSnackbar({
        message:
          activationError instanceof Error
            ? activationError.message
            : "تعذر تحديث حالة المستخدم.",
        tone: "danger",
      });
    } finally {
      setActivationPending(false);
    }
  }

  return {
    activationPending,
    error,
    handleActivationChange,
    loading,
    loadUser,
    orders,
    user,
  };
}
