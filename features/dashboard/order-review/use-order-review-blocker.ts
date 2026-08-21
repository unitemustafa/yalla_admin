"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { dashboardOrdersChangedEvent, getMarketCount, getOrderScopeLabel, isGeneralOrder, isMultiMarket, notifyDashboardOrdersChanged } from "../order-display";
import { useDashboardNotifications } from "../notifications-context";
import { useSnackbar } from "../snackbar";
import { apiResponseData } from "../users/api-users";
import { isRecord } from "../orders/api";
import {
  apiRecordList,
  blockerOrders,
  customerName,
  deliveryDetails,
  localizedApiError,
  marketName,
  numberAt,
  numericValue,
  orderId,
  orderLike,
  representativeListFromApprove,
  representativeListFromResponse,
  textAt,
} from "./domain";
import type { ApiRecord, BlockerPhase } from "./types";
import { useOrderReviewAlarm } from "./use-order-review-alarm";

const pollIntervalMs = 180_000;
const hiddenRejectionReason = "تم رفض الطلب من الإدارة";

export function useOrderReviewBlocker() {
  const { apiFetch, status, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { refreshUnreadCount } = useDashboardNotifications();
  const [phase, setPhase] = useState<BlockerPhase>("idle");
  const [blocked, setBlocked] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [orders, setOrders] = useState<ApiRecord[]>([]);
  const [representatives, setRepresentatives] = useState<ApiRecord[]>([]);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [representativesLoading, setRepresentativesLoading] = useState(false);
  const requestInFlightRef = useRef(false);
  const phaseRef = useRef<BlockerPhase>("idle");

  const currentOrder = orders[0] ?? null;
  const currentOrderId = orderId(currentOrder);
  const currentOrderIsGeneral = currentOrder ? isGeneralOrder(orderLike(currentOrder)) : false;
  const currentOrderNeedsRepresentative = Boolean(currentOrder);
  const shouldRun = status === "authenticated" && user?.role === "admin";
  const actionBusy = ["approving", "selecting_representative", "assigning", "rejecting"].includes(phase);
  const modalActive = blocked || actionBusy;

  useOrderReviewAlarm(modalActive);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!modalActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalActive]);

  const resetActionState = useCallback(() => {
    setRepresentatives([]);
    setSelectedRepresentativeId("");
    setConfirmReject(false);
    setRepresentativesLoading(false);
  }, []);

  const fetchPendingOrderDetails = useCallback(async () => {
    const response = await apiFetch("orders/?status=pending");
    const data = await apiResponseData(response);
    if (!response.ok) throw new Error(localizedApiError(data, "تعذر تحميل تفاصيل الطلبات المعلقة."));
    const list = apiRecordList(data);
    const pendingReview = list.filter((order) => {
      const reviewStatus = textAt(order, [["review_status"], ["reviewStatus"]], "").toLowerCase();
      return reviewStatus
        ? reviewStatus === "pending_review"
        : textAt(order, [["status"]], "").toLowerCase() === "pending";
    });
    return pendingReview.length ? pendingReview : list;
  }, [apiFetch]);

  const loadBlocker = useCallback(async ({ silent = false, ignoreBusy = false }: { silent?: boolean; ignoreBusy?: boolean } = {}) => {
    if (!shouldRun || requestInFlightRef.current || (!ignoreBusy && actionBusy)) return;
    requestInFlightRef.current = true;
    if (!silent && !blocked) setPhase("checking");
    try {
      const response = await apiFetch("admin/order-review/blocker/");
      const data = await apiResponseData(response);
      if (response.status === 401 || response.status === 403) {
        setBlocked(false);
        setPendingCount(0);
        setOrders([]);
        setError(null);
        setPhase("idle");
        resetActionState();
        return;
      }
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر فحص طلبات المراجعة."));
      if (!isRecord(data)) throw new Error("استجابة فحص طلبات المراجعة غير مكتملة.");
      const nextBlocked = Boolean(data.blocked);
      let nextOrders = blockerOrders(data);
      let detailsError: string | null = null;
      if (nextBlocked && !nextOrders.length) {
        try {
          nextOrders = await fetchPendingOrderDetails();
        } catch (reason) {
          detailsError = reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلبات المعلقة.";
        }
      }
      setBlocked(nextBlocked);
      setPendingCount(numberAt(data, [["pending_count"], ["pendingCount"]], nextOrders.length));
      setOrders(nextBlocked ? nextOrders : []);
      setError(detailsError);
      setPhase(nextBlocked ? "blocked" : "idle");
      resetActionState();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "تعذر فحص طلبات المراجعة.";
      if (blocked || phaseRef.current !== "idle") {
        setError(message);
        setPhase(blocked ? "blocked" : "error");
      } else {
        setError(null);
        setPhase("idle");
      }
    } finally {
      requestInFlightRef.current = false;
    }
  }, [actionBusy, apiFetch, blocked, fetchPendingOrderDetails, resetActionState, shouldRun]);

  useEffect(() => {
    if (!shouldRun) return;
    const handleOrdersChanged = () => void loadBlocker({ silent: true, ignoreBusy: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadBlocker({ silent: true });
    };
    const initialTimer = window.setTimeout(() => void loadBlocker({ silent: true }), 0);
    const timer = window.setInterval(() => void loadBlocker({ silent: true }), pollIntervalMs);
    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadBlocker, shouldRun]);

  useEffect(() => {
    if (shouldRun) return;
    const timer = window.setTimeout(() => {
      setBlocked(false);
      setPendingCount(0);
      setOrders([]);
      setError(null);
      setPhase("idle");
      resetActionState();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resetActionState, shouldRun]);

  const fetchRepresentatives = useCallback(async (targetOrderId: string) => {
    const response = await apiFetch(`admin/orders/${targetOrderId}/service-city-representatives/`);
    const data = await apiResponseData(response);
    if (!response.ok) throw new Error(localizedApiError(data, "تعذر تحميل مندوبين مدينة الخدمة."));
    return representativeListFromResponse(data);
  }, [apiFetch]);

  const approveCurrentOrder = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setPhase("approving");
    setError(null);
    setConfirmReject(false);
    setRepresentatives([]);
    setSelectedRepresentativeId("");
    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/approve/`, { method: "POST" });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر قبول الطلب."));
      notifyDashboardOrdersChanged(currentOrderId);
      const approved = representativeListFromApprove(data);
      let nextRepresentatives = approved.representatives;
      let representativesError: string | null = null;
      if (!approved.present) {
        try {
          nextRepresentatives = await fetchRepresentatives(currentOrderId);
        } catch (reason) {
          representativesError = reason instanceof Error ? reason.message : "تعذر تحميل مندوبين مدينة الخدمة.";
        }
      }
      setRepresentatives(nextRepresentatives);
      setError(representativesError);
      setPhase("selecting_representative");
      void refreshUnreadCount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر قبول الطلب.");
      setPhase("blocked");
    }
  }, [apiFetch, currentOrderId, fetchRepresentatives, refreshUnreadCount]);

  const refreshRepresentatives = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setRepresentativesLoading(true);
    setError(null);
    try {
      const next = await fetchRepresentatives(currentOrderId);
      setRepresentatives(next);
      if (!next.length) setError(currentOrderIsGeneral ? "لا يوجد مندوبين متاحين حاليًا." : "لا يوجد مندوبين متاحين لهذه المدينة حاليًا.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل مندوبين مدينة الخدمة.");
    } finally {
      setRepresentativesLoading(false);
    }
  }, [currentOrderId, currentOrderIsGeneral, fetchRepresentatives]);

  const assignRepresentative = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    if (!selectedRepresentativeId) return setError("اختر مندوبًا قبل إرسال الطلب.");
    setPhase("assigning");
    setError(null);
    try {
      const representativeId = numericValue(selectedRepresentativeId) ?? selectedRepresentativeId;
      const response = await apiFetch(`orders/${currentOrderId}/assignment/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ representative_id: representativeId }) });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر إسناد الطلب للمندوب."));
      showSnackbar({ message: "تم قبول الطلب وإرساله للمندوب.", tone: "success" });
      notifyDashboardOrdersChanged(currentOrderId);
      await Promise.all([loadBlocker({ silent: true, ignoreBusy: true }), refreshUnreadCount()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إسناد الطلب للمندوب.");
      setPhase("selecting_representative");
    }
  }, [apiFetch, currentOrderId, loadBlocker, refreshUnreadCount, selectedRepresentativeId, showSnackbar]);

  const saveApprovedOrder = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setError(null);
    showSnackbar({ message: "تم حفظ الطلب بدون إسناد مندوب.", tone: "success" });
    notifyDashboardOrdersChanged(currentOrderId);
    await Promise.all([loadBlocker({ silent: true, ignoreBusy: true }), refreshUnreadCount()]);
  }, [currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  const rejectCurrentOrder = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setPhase("rejecting");
    setError(null);
    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/reject/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejection_reason: hiddenRejectionReason }) });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر رفض الطلب."));
      showSnackbar({ message: "تم رفض الطلب.", tone: "success" });
      notifyDashboardOrdersChanged(currentOrderId);
      await Promise.all([loadBlocker({ silent: true, ignoreBusy: true }), refreshUnreadCount()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر رفض الطلب.");
      setPhase("blocked");
    }
  }, [apiFetch, currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  const orderSummary = useMemo(() => currentOrder ? {
    id: orderId(currentOrder), customer: customerName(currentOrder), market: marketName(currentOrder),
    scope: getOrderScopeLabel(orderLike(currentOrder)), marketCount: getMarketCount(orderLike(currentOrder)),
    marketMode: isMultiMarket(orderLike(currentOrder)) ? "متعدد المحلات" : "محل واحد",
    delivery: deliveryDetails(currentOrder),
  } : null, [currentOrder]);

  return {
    approveCurrentOrder, assignRepresentative, canUseMainActions: phase === "blocked" && Boolean(currentOrderId),
    confirmReject, currentOrder, currentOrderIsGeneral, currentOrderNeedsRepresentative, error,
    loadBlocker, loading: ["checking", "approving", "assigning", "rejecting"].includes(phase),
    modalActive, orderSummary, pendingLabel: pendingCount > 0 ? pendingCount : orders.length,
    phase, refreshRepresentatives, rejectCurrentOrder, representatives, representativesLoading,
    saveApprovedOrder, selectedRepresentativeId, setConfirmReject, setSelectedRepresentativeId, shouldRun,
  };
}
