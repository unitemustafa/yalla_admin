"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { dashboardOrdersChangedEvent, notifyDashboardOrdersChanged } from "../order-display";
import { useDashboardNotifications } from "../notifications-context";
import { useSnackbar } from "../snackbar";
import { apiResponseData } from "../users/api-users";
import { isRecord } from "../orders/api";
import {
  apiRecordList,
  blockerOrders,
  localizedApiError,
  numberAt,
  orderId,
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
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const requestInFlightRef = useRef<Promise<void> | null>(null);
  const phaseRef = useRef<BlockerPhase>("idle");

  const currentOrder = orders[0] ?? null;
  const currentOrderId = orderId(currentOrder);
  const shouldRun = status === "authenticated" && user?.role === "admin";
  const actionBusy = phase === "approving" || phase === "rejecting";
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
    setConfirmReject(false);
  }, []);

  const fetchOrderDetail = useCallback(async (targetOrderId: string) => {
    const response = await apiFetch(`orders/${encodeURIComponent(targetOrderId)}/`);
    const data = await apiResponseData(response);
    if (!response.ok) throw new Error(localizedApiError(data, "تعذر تحميل تفاصيل الطلب."));
    if (!isRecord(data) || !Array.isArray(data.market_sections)) throw new Error("تفاصيل الطلب غير مكتملة.");
    return data;
  }, [apiFetch]);

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
    if (!shouldRun || (!ignoreBusy && actionBusy)) return;
    if (requestInFlightRef.current) {
      if (!ignoreBusy) return;
      await requestInFlightRef.current;
    }
    const request = (async () => {
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
        if (nextBlocked && nextOrders.length && !Array.isArray(nextOrders[0].market_sections)) {
          try {
            nextOrders[0] = await fetchOrderDetail(orderId(nextOrders[0]));
          } catch (reason) {
            nextOrders = [];
            detailsError = reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.";
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
      }
    })();
    requestInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (requestInFlightRef.current === request) requestInFlightRef.current = null;
    }
  }, [actionBusy, apiFetch, blocked, fetchOrderDetail, fetchPendingOrderDetails, resetActionState, shouldRun]);

  useEffect(() => {
    if (!shouldRun) return;
    const handleOrdersChanged = () => void loadBlocker({ silent: true });
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

  const approveCurrentOrder = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setPhase("approving");
    setError(null);
    setConfirmReject(false);
    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/approve/`, { method: "POST" });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر قبول الطلب."));
      showSnackbar({ message: "تم قبول الطلب.", tone: "success" });
      await loadBlocker({ silent: true, ignoreBusy: true });
      notifyDashboardOrdersChanged(currentOrderId);
      void refreshUnreadCount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر قبول الطلب.");
      setPhase("blocked");
    }
  }, [apiFetch, currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  const rejectCurrentOrder = useCallback(async () => {
    if (!currentOrderId) return setError("تعذر تحديد الطلب الحالي.");
    setPhase("rejecting");
    setError(null);
    try {
      const response = await apiFetch(`admin/orders/${currentOrderId}/reject/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejection_reason: hiddenRejectionReason }) });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(localizedApiError(data, "تعذر رفض الطلب."));
      showSnackbar({ message: "تم رفض الطلب.", tone: "success" });
      await loadBlocker({ silent: true, ignoreBusy: true });
      notifyDashboardOrdersChanged(currentOrderId);
      void refreshUnreadCount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر رفض الطلب.");
      setPhase("blocked");
    }
  }, [apiFetch, currentOrderId, loadBlocker, refreshUnreadCount, showSnackbar]);

  return {
    approveCurrentOrder, canUseMainActions: phase === "blocked" && Boolean(currentOrderId),
    confirmReject, currentOrder, error,
    loadBlocker, loading: ["checking", "approving", "rejecting"].includes(phase),
    modalActive, pendingLabel: pendingCount > 0 ? pendingCount : orders.length,
    phase, rejectCurrentOrder, setConfirmReject, shouldRun,
  };
}
