"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import { dashboardUserFromBackend } from "../users/api-users";
import type { DashboardUser } from "../users/types";
import {
  createCustomer,
  fetchCustomers,
  updateCustomerActivation,
} from "./api";
import { filterCustomers } from "./domain";
import type { CustomerDraft, CustomerPageState } from "./types";

export function useCustomersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [customers, setCustomers] = useState<DashboardUser[]>([]);
  const [pageState, setPageState] =
    useState<CustomerPageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [activationUserId, setActivationUserId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    setPageState("loading");
    setLoadError(null);

    try {
      setCustomers(await fetchCustomers(apiFetch));
      setPageState("ready");
    } catch (error) {
      setCustomers([]);
      setPageState("error");
      setLoadError(
        error instanceof Error
          ? error.message
          : "تعذر تحميل المستخدمين من الباك.",
      );
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  async function handleCreateCustomer(draft: CustomerDraft) {
    const createdCustomer = await createCustomer(apiFetch, draft);
    setCustomers((currentCustomers) => [createdCustomer, ...currentCustomers]);
    setAddCustomerOpen(false);
    showSnackbar({
      message: `تم إضافة العميل ${createdCustomer.name}.`,
      tone: "success",
    });
  }

  async function handleActivationChange(userId: string, checked: boolean) {
    if (activationUserId) return;

    setActivationUserId(userId);
    try {
      const updatedCustomer = dashboardUserFromBackend(
        await updateCustomerActivation(apiFetch, userId, checked),
      );
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === userId ? updatedCustomer : customer,
        ),
      );
      showSnackbar({
        message: checked
          ? `تم تفعيل العميل ${updatedCustomer.name}.`
          : `تم تعطيل العميل ${updatedCustomer.name}.`,
        tone: checked ? "success" : "danger",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "تعذر تحديث حالة المستخدم.",
        tone: "danger",
      });
    } finally {
      setActivationUserId(null);
    }
  }

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, customerSearch),
    [customerSearch, customers],
  );

  return {
    activationUserId,
    addCustomerOpen,
    customerSearch,
    customers,
    filteredCustomers,
    handleActivationChange,
    handleCreateCustomer,
    loadCustomers,
    loadError,
    pageState,
    setAddCustomerOpen,
    setCustomerSearch,
  };
}
