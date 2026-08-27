"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { isAbortError } from "@/lib/auth";
import { dashboardOrdersChangedEvent, getDeliveryDestination, notifyDashboardOrdersChanged } from "../../order-display";
import { useSnackbar } from "../../snackbar";
import {
  apiResponseData,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../../users/api-users";
import { apiOrderData, orderApiError, representativeOptionsFromResponse } from "../api";
import {
  assignedRepresentativeId,
  customerName,
  orderLocationCoordinates,
  orderMapUrl,
  orderNumber,
} from "../formatters";
import {
  canMoveOrderToStatus,
  isAssignmentEligible,
  isReassignmentEligible,
  representativeMap,
} from "../status-domain";
import type { BackendOrder, BackendOrderStatus, RepresentativeOption } from "../types";

function orderCopyText(order: BackendOrder) {
  const coordinates = orderLocationCoordinates(order);
  return [
    orderNumber(order),
    customerName(order),
    order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`,
    getDeliveryDestination(order),
    ...(coordinates
      ? [
          `${coordinates.latitude},${coordinates.longitude}`,
          orderMapUrl(order) ?? "",
        ]
      : []),
  ].join("\n");
}

export function useOrderDetail(orderId: string) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deliveryPriceDraft, setDeliveryPriceDraft] = useState("");
  const [savingDeliveryPrice, setSavingDeliveryPrice] = useState(false);
  const [representativeUser, setRepresentativeUser] = useState<BackendDashboardUser | null>(null);
  const [representativeOptions, setRepresentativeOptions] = useState<RepresentativeOption[]>([]);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  const [representativesLoading, setRepresentativesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderControllerRef = useRef<AbortController | null>(null);

  const loadOrder = useCallback(async () => {
    orderControllerRef.current?.abort();
    const controller = new AbortController();
    orderControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`orders/${encodeURIComponent(orderId)}/`, {
        signal: controller.signal,
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر تحميل تفاصيل الطلب."));
      const nextOrder = apiOrderData(data);
      if (!nextOrder) throw new Error("تعذر قراءة تفاصيل الطلب من استجابة الباك.");
      if (controller.signal.aborted) return;
      setOrder(nextOrder);
      setDeliveryPriceDraft(nextOrder.delivery_price ?? "");
      setRepresentativeOptions([]);
      setSelectedRepresentativeId("");
      const representativeId = assignedRepresentativeId(nextOrder);
      if (representativeId && !nextOrder.assigned_representative?.name) {
        try {
          const representativeResponse = await apiFetch(
            `auth/users/${encodeURIComponent(String(representativeId))}/`,
            { signal: controller.signal },
          );
          const representativeData = await apiResponseData(representativeResponse);
          if (!controller.signal.aborted) {
            setRepresentativeUser(
              representativeResponse.ok &&
                isBackendDashboardUser(representativeData) &&
                representativeData.role === "representative"
                ? representativeData
                : null,
            );
          }
        } catch (reason) {
          if (isAbortError(reason)) return;
          setRepresentativeUser(null);
        }
      } else {
        setRepresentativeUser(null);
      }
    } catch (reason) {
      if (isAbortError(reason)) return;
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.");
    } finally {
      if (orderControllerRef.current === controller) {
        orderControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [apiFetch, orderId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrder(), 0);
    return () => {
      window.clearTimeout(timer);
      orderControllerRef.current?.abort();
    };
  }, [loadOrder]);

  useEffect(() => {
    function handleOrdersChanged(event: Event) {
      const detail = (event as CustomEvent<{ orderId?: string | number }>).detail;
      if (!detail?.orderId || String(detail.orderId) === String(orderId)) void loadOrder();
    }
    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    return () => window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
  }, [loadOrder, orderId]);

  async function updateStatus(nextStatus: BackendOrderStatus) {
    if (!order || order.status === nextStatus) return;
    if (!canMoveOrderToStatus(order, nextStatus)) {
      return showSnackbar({ message: "هذه الحركة غير متاحة لهذا الطلب الآن.", tone: "danger" });
    }
    setSavingStatus(true);
    try {
      const response = await apiFetch(`orders/${order.id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر تحديث حالة الطلب."));
      const nextOrder = apiOrderData(data);
      if (nextOrder) setOrder(nextOrder);
      else await loadOrder();
      notifyDashboardOrdersChanged(order.id);
      showSnackbar({ message: "تم تحديث حالة الطلب.", tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحديث حالة الطلب.", tone: "danger" });
    } finally {
      setSavingStatus(false);
    }
  }

  async function unassignRepresentative() {
    if (!order || !isReassignmentEligible(order)) return;
    setSavingAssignment(true);
    try {
      const response = await apiFetch(`orders/${order.id}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: null }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر إلغاء إسناد الطلب."));
      await loadOrder();
      showSnackbar({ message: "تم إلغاء إسناد الطيار.", tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إلغاء الإسناد.", tone: "danger" });
    } finally {
      setSavingAssignment(false);
    }
  }

  async function loadRepresentativeOptions(targetOrder = order) {
    if (!targetOrder || (!isAssignmentEligible(targetOrder) && !isReassignmentEligible(targetOrder))) return;
    setRepresentativesLoading(true);
    try {
      const response = await apiFetch(`admin/orders/${targetOrder.id}/service-city-representatives/`);
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر تحميل الطيارين المتاحين."));
      const options = representativeOptionsFromResponse(data);
      setRepresentativeOptions(options);
      if (!options.length) showSnackbar({ message: "لا يوجد طيارين متاحين لهذا الطلب حاليًا.", tone: "danger" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحميل الطيارين المتاحين.", tone: "danger" });
    } finally {
      setRepresentativesLoading(false);
    }
  }

  async function assignSelectedRepresentative() {
    if (!order || !selectedRepresentativeId || (!isAssignmentEligible(order) && !isReassignmentEligible(order))) return;
    setSavingAssignment(true);
    try {
      const numericId = Number(selectedRepresentativeId);
      const response = await apiFetch(`orders/${order.id}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: Number.isFinite(numericId) ? numericId : selectedRepresentativeId }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر إسناد الطلب للطيار."));
      await loadOrder();
      showSnackbar({ message: "تم إسناد الطلب للطيار.", tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إسناد الطلب للطيار.", tone: "danger" });
    } finally {
      setSavingAssignment(false);
    }
  }

  async function updateDeliveryPrice(action: "save" | "request_approval") {
    if (!order || savingDeliveryPrice) return;
    const parsedPrice = Number(deliveryPriceDraft);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return showSnackbar({ message: "سعر التوصيل يجب أن يكون رقمًا غير سالب.", tone: "danger" });
    }
    setSavingDeliveryPrice(true);
    try {
      const response = await apiFetch(`orders/${order.id}/delivery-price/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_price: parsedPrice.toFixed(2), action }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(orderApiError(data, "تعذر حفظ سعر التوصيل."));
      await loadOrder();
      notifyDashboardOrdersChanged(order.id);
      showSnackbar({ message: action === "request_approval" ? "تم إرسال سعر التوصيل للعميل للموافقة." : "تم حفظ سعر التوصيل واعتماده وتحديث الإجمالي.", tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر حفظ سعر التوصيل.", tone: "danger" });
    } finally {
      setSavingDeliveryPrice(false);
    }
  }

  async function copyOrder() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(orderCopyText(order));
      showSnackbar({ message: `تم نسخ بيانات الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ بيانات الطلب.", tone: "danger" });
    }
  }

  async function copyLocation() {
    if (!order) return;
    const mapUrl = orderMapUrl(order);
    if (!mapUrl) return showSnackbar({ message: "لا توجد إحداثيات محفوظة لهذا الطلب.", tone: "danger" });
    try {
      await navigator.clipboard.writeText(mapUrl);
      showSnackbar({ message: "تم نسخ رابط موقع الطلب." });
    } catch {
      showSnackbar({ message: "تعذر نسخ رابط الموقع.", tone: "danger" });
    }
  }

  const representatives = useMemo(() => representativeMap(representativeUser), [representativeUser]);
  return {
    assignSelectedRepresentative, copyLocation, copyOrder, deliveryPriceDraft, error,
    loadOrder, loadRepresentativeOptions, loading, order, representatives,
    representativeOptions, representativesLoading, savingAssignment, savingDeliveryPrice,
    savingStatus, selectedRepresentativeId, setDeliveryPriceDraft,
    setSelectedRepresentativeId, unassignRepresentative, updateDeliveryPrice, updateStatus,
  };
}
