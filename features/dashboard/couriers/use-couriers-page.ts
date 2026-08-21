"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/auth-provider";
import type { ServiceCity } from "../cities/types";
import { useSnackbar } from "../snackbar";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import {
  assignOrder,
  changeCourierPassword,
  loadCouriersPageData,
  refreshCouriers,
  setCourierAvailability,
} from "./api";
import {
  assignmentOrdersForCourier,
  courierStatusPollMs,
  couriersPageSize,
  filterAssignmentOrders,
  filterCouriers,
  isAssignmentEligible,
  isReassignmentEligible,
} from "./domain";
import type { AdminOrder } from "./types";

export function useCouriersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const searchParams = useSearchParams();
  const focusedCourier = searchParams.get("courier")?.trim() ?? "";
  const [couriers, setCouriers] = useState<BackendDashboardUser[]>([]);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<BackendDashboardUser | null>(null);
  const [passwordCourier, setPasswordCourier] = useState<BackendDashboardUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const statusRefreshInFlightRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadCouriersPageData(apiFetch);
      setCouriers(data.couriers);
      setOrders(data.orders);
      setCities(data.cities);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات المندوبين.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refreshCourierStatuses = useCallback(async () => {
    if (statusRefreshInFlightRef.current) return;
    statusRefreshInFlightRef.current = true;
    try {
      const data = await refreshCouriers(apiFetch);
      if (data) setCouriers(data);
    } finally {
      statusRefreshInFlightRef.current = false;
    }
  }, [apiFetch]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshCourierStatuses().catch(() => undefined);
    };
    const pollTimer = window.setInterval(refreshWhenVisible, courierStatusPollMs);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshCourierStatuses]);

  const assignmentOrders = useMemo(() => assignmentOrdersForCourier(orders, assigning), [assigning, orders]);
  const filteredReadyOrders = useMemo(
    () => filterAssignmentOrders(assignmentOrders, assigning, orderSearch),
    [assigning, assignmentOrders, orderSearch],
  );
  const filteredCouriers = useMemo(
    () => filterCouriers(couriers, areaFilter, focusedCourier),
    [areaFilter, couriers, focusedCourier],
  );
  const totalPages = Math.max(1, Math.ceil(filteredCouriers.length / couriersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * couriersPageSize;
  const pagedCouriers = filteredCouriers.slice(pageStartIndex, pageStartIndex + couriersPageSize);
  const assignableCount = orders.filter(isAssignmentEligible).length + orders.filter(isReassignmentEligible).length;

  function closeAssignment() {
    setAssigning(null);
    setSelectedOrder("");
    setOrderSearch("");
  }

  async function assign() {
    if (!assigning || !selectedOrder) return;
    setBusy(`assign-${assigning.id}`);
    try {
      await assignOrder(apiFetch, selectedOrder, assigning.id);
      showSnackbar({ message: `تم إسناد الطلب للمندوب ${fullNameFromBackendUser(assigning)}.`, tone: "success" });
      closeAssignment();
      await load();
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إسناد الطلب.", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  async function confirmPassword(password: string) {
    if (!passwordCourier) return;
    setBusy(`password-${passwordCourier.id}`);
    try {
      await changeCourierPassword(apiFetch, passwordCourier.id, password);
      showSnackbar({ message: "تم تغيير كلمة المرور.", tone: "success" });
      setPasswordCourier(null);
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تغيير كلمة المرور.", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  async function handleAvailabilityChange(courier: BackendDashboardUser, checked: boolean) {
    if (!courier.courier_profile?.service_city || busy !== null) return;
    setBusy(`availability-${courier.id}`);
    try {
      const saved = await setCourierAvailability(apiFetch, courier.id, checked);
      setCouriers((rows) => rows.map((row) => row.id === courier.id ? saved : row));
      showSnackbar({ message: checked ? "تم جعل المندوب متاحًا." : "تم جعل المندوب غير متاح.", tone: checked ? "success" : "danger" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحديث توفر المندوب.", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  return {
    couriers,
    cities,
    orders,
    loading,
    error,
    load,
    focusedCourier,
    filteredCouriers,
    pagedCouriers,
    pageStartIndex,
    currentPage: safeCurrentPage,
    setCurrentPage,
    totalPages,
    areaFilter,
    setAreaFilter,
    assigning,
    setAssigning,
    passwordCourier,
    setPasswordCourier,
    selectedOrder,
    setSelectedOrder,
    orderSearch,
    setOrderSearch,
    filteredReadyOrders,
    assignableCount,
    busy,
    closeAssignment,
    assign,
    confirmPassword,
    handleAvailabilityChange,
  };
}
