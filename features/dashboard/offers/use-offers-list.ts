"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  adminApiPaths,
  apiErrorMessage,
  apiList,
  deletionResult,
  readApiData,
  sendAdminJson,
} from "../admin-api";
import { useServiceCities } from "../cities/use-service-cities";
import { asRecord } from "../shared/api-data";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { offerCardFromApi, type OfferCard } from "./domain";
import {
  allOffersFilterValue,
  filterOffers,
  offerCityOptions,
  offerListStats,
  translateOfferErrorMessage,
} from "./list-domain";

function asBackendRecord(value: unknown) {
  return asRecord(value) ?? {};
}

export function useOffersList(initialArchived = false) {
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const { cities } = useServiceCities();
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfferCard | null>(null);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(allOffersFilterValue);
  const [cityFilter, setCityFilter] = useState(allOffersFilterValue);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const pendingDeletionIds = useRef<Set<string>>(new Set());
  const pendingDispatchIds = useRef<Map<string, string>>(new Map());
  const filteredOffers = useMemo(
    () => filterOffers(offers, search, typeFilter, cityFilter),
    [cityFilter, offers, search, typeFilter],
  );
  const cityOptions = useMemo(() => offerCityOptions(cities), [cities]);
  const stats = useMemo(() => offerListStats(offers), [offers]);

  useEffect(() => {
    const updateCountdown = () => setNow(Date.now());
    const timeoutId = window.setTimeout(updateCountdown, 0);
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `${adminApiPaths.offers}${initialArchived ? "?archived=true" : ""}`,
      );
      const data = await readApiData(response);
      if (!response.ok) throw new Error(apiErrorMessage(data, "تعذر تحميل العروض من الباك."));
      setOffers(apiList(data)
        .map(offerCardFromApi)
        .filter((offer) => !pendingDeletionIds.current.has(offer.id)));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "تعذر تحميل العروض.";
      setError(message);
      showSnackbar({ message, tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, initialArchived, showSnackbar]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  async function toggleStatus(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) return;
    const nextStatus = offer.backendStatus === "active" ? "inactive" : "active";
    try {
      const data = await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offerId)}/`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      const updated = offerCardFromApi(asBackendRecord(data));
      setOffers((current) => current.map((item) => item.id === offerId ? updated : item));
      showSnackbar({ message: "تم تحديث حالة العرض.", tone: "success" });
    } catch (caught) {
      showSnackbar({
        message: caught instanceof Error ? caught.message : "تعذر تحديث العرض.",
        tone: "danger",
      });
    }
  }

  async function sendNotification(offer: OfferCard) {
    if (!offer.canSendNotification || sendingIds.has(offer.id)) return;
    if (!window.confirm("سيتم إرسال إشعار جديد للعملاء المستهدفين بهذا العرض. الإشعارات السابقة ستظل محفوظة.")) return;
    const requestId = pendingDispatchIds.current.get(offer.id) ?? crypto.randomUUID();
    pendingDispatchIds.current.set(offer.id, requestId);
    setSendingIds((current) => new Set(current).add(offer.id));
    try {
      const data = asBackendRecord(await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/send-notification/`,
        { method: "POST", body: JSON.stringify({ request_id: requestId }) },
      ));
      pendingDispatchIds.current.delete(offer.id);
      const count = Number(data.notification_count ?? data.recipient_count ?? 0);
      setOffers((current) => current.map((item) => item.id === offer.id ? {
        ...item,
        lastNotificationSentAt: typeof data.sent_at === "string" ? data.sent_at : item.lastNotificationSentAt,
        notificationSendCount: item.notificationSendCount + 1,
      } : item));
      showSnackbar({ message: `تم إرسال الإشعار إلى ${count} عميل.`, tone: "success" });
    } catch (caught) {
      showSnackbar({
        message: caught instanceof Error ? caught.message : "تعذر إرسال الإشعار.",
        tone: "danger",
      });
    } finally {
      setSendingIds((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    }
  }

  function edit(offer: OfferCard) {
    showSnackbar({ message: `تم فتح تعديل ${offer.title}.` });
    router.push(`/offers/create?edit=${offer.id}`);
  }

  function toggleExpanded(offerId: string) {
    setExpandedIds((current) => ({ ...current, [offerId]: !current[offerId] }));
  }

  function remove(offer: OfferCard) {
    const index = offers.findIndex((item) => item.id === offer.id);
    setDeleteTarget(null);
    queueUndoableDelete({
      message: `تمت إزالة العرض ${offer.title} من القائمة مؤقتًا.`,
      onDelete: () => {
        pendingDeletionIds.current.add(offer.id);
        setOffers((current) => current.filter((item) => item.id !== offer.id));
      },
      onUndo: () => {
        pendingDeletionIds.current.delete(offer.id);
        setOffers((current) => {
          if (current.some((item) => item.id === offer.id)) return current;
          const next = [...current];
          next.splice(Math.max(0, index), 0, offer);
          return next;
        });
      },
      onCommit: async () => deletionResult(await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/`,
        { method: "DELETE" },
      )),
      onCommitSuccess: (value) => {
        const result = deletionResult(value);
        pendingDeletionIds.current.delete(offer.id);
        showSnackbar({
          message: result.action === "archived"
            ? result.detail ?? `تمت أرشفة العرض ${offer.title}.`
            : `تم حذف العرض ${offer.title} نهائيًا.`,
          tone: result.action === "archived" ? "success" : "danger",
        });
      },
      onCommitError: (caught) => showSnackbar({
        message: caught instanceof Error
          ? translateOfferErrorMessage(caught.message)
          : "تعذر حذف العرض.",
        tone: "danger",
      }),
    });
  }

  async function restore(offer: OfferCard) {
    const previous = offers;
    setOffers((current) => current.filter((item) => item.id !== offer.id));
    try {
      await sendAdminJson(
        apiFetch,
        `${adminApiPaths.offers}${encodeURIComponent(offer.id)}/`,
        { method: "PATCH", body: JSON.stringify({ restore: true }) },
      );
      showSnackbar({ message: `تمت استعادة العرض ${offer.title}.`, tone: "success" });
    } catch (caught) {
      setOffers(previous);
      showSnackbar({
        message: caught instanceof Error ? caught.message : "تعذر استعادة العرض.",
        tone: "danger",
      });
    }
  }

  return {
    offers,
    filteredOffers,
    loading,
    error,
    deleteTarget,
    sendingIds,
    now,
    search,
    typeFilter,
    cityFilter,
    expandedIds,
    showArchived: initialArchived,
    cityOptions,
    stats,
    setDeleteTarget,
    setSearch,
    setTypeFilter,
    setCityFilter,
    reload,
    toggleStatus,
    sendNotification,
    edit,
    toggleExpanded,
    remove,
    restore,
  };
}

export type OffersListController = ReturnType<typeof useOffersList>;
