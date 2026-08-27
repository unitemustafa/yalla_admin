"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { loadServiceCities } from "../cities/api";
import type { ServiceCity } from "../cities/types";
import type { MarketType } from "../market-types-api";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { deleteMarket, loadMarketsPageData, restoreMarket, setMarketActive } from "./api";
import { filterMarkets } from "./domain";
import type { Classification, Market } from "./types";

export function useMarketsPage(initialArchived: boolean) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [marketTypes, setMarketTypes] = useState<MarketType[]>([]);
  const [serviceCities, setServiceCities] = useState<ServiceCity[]>([]);
  const [serviceCitiesLoading, setServiceCitiesLoading] = useState(true);
  const [serviceCitiesError, setServiceCitiesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [serviceCityFilter, setServiceCityFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [dialogMarket, setDialogMarket] = useState<Market | null | undefined>();
  const [deleteCandidate, setDeleteCandidate] = useState<Market | null>(null);

  const loadServiceCityOptions = useCallback(async () => {
    setServiceCitiesLoading(true);
    setServiceCitiesError("");
    try {
      setServiceCities(await loadServiceCities(apiFetch, {
        preferArabicName: true,
        errorFallback: "تعذر تحميل المدن.",
      }));
    } catch (reason) {
      setServiceCitiesError(reason instanceof Error ? reason.message : "تعذر تحميل المدن.");
    } finally {
      setServiceCitiesLoading(false);
    }
  }, [apiFetch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadMarketsPageData(apiFetch, initialArchived);
      setMarkets(data.markets);
      setClassifications(data.classifications);
      setMarketTypes(data.marketTypes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل المحلات.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, initialArchived]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { void Promise.resolve().then(loadServiceCityOptions); }, [loadServiceCityOptions]);
  const filteredMarkets = useMemo(
    () => filterMarkets(markets, query, serviceCityFilter, classificationFilter),
    [classificationFilter, markets, query, serviceCityFilter],
  );

  function remove(market: Market) {
    const marketIndex = markets.findIndex((item) => item.id === market.id);
    setDeleteCandidate(null);
    queueUndoableDelete({
      message: `تمت إزالة ${market.name} من القائمة مؤقتًا.`,
      onDelete: () => setMarkets((current) => current.filter((item) => item.id !== market.id)),
      onUndo: () => setMarkets((current) => {
        if (current.some((item) => item.id === market.id)) return current;
        const next = [...current];
        next.splice(Math.max(0, marketIndex), 0, market);
        return next;
      }),
      onCommit: () => deleteMarket(apiFetch, market.id),
      onCommitSuccess: (value) => {
        const result = value && typeof value === "object" && "action" in value
          ? value as { action: "deleted" | "archived"; detail?: string }
          : { action: "deleted" as const };
        showSnackbar({
          message: result.action === "archived" ? result.detail ?? `تمت أرشفة المحل ${market.name}.` : `تم حذف المحل ${market.name} نهائيًا.`,
          tone: result.action === "archived" ? "success" : "danger",
        });
      },
      onCommitError: (reason) => showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر حذف المحل.", tone: "danger" }),
    });
  }

  async function restoreArchivedMarket(market: Market) {
    const previousMarkets = markets;
    setMarkets((current) => current.filter((item) => item.id !== market.id));
    try {
      await restoreMarket(apiFetch, market.id);
      showSnackbar({ message: `تمت استعادة المحل ${market.name}.` });
    } catch (reason) {
      setMarkets(previousMarkets);
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر استعادة المحل.", tone: "danger" });
    }
  }

  async function toggleMarketActive(market: Market, nextActive: boolean) {
    const nextStatus = nextActive ? "active" : "inactive";
    setMarkets((current) => current.map((item) => item.id === market.id ? { ...item, status: nextStatus } : item));
    try {
      const saved = await setMarketActive(apiFetch, market, nextActive);
      setMarkets((current) => current.map((item) => item.id === market.id ? saved : item));
      showSnackbar({ message: nextActive ? `تم تفعيل المحل ${market.name}.` : `تم تعطيل المحل ${market.name}.`, tone: nextActive ? "success" : "danger" });
    } catch (reason) {
      setMarkets((current) => current.map((item) => item.id === market.id ? market : item));
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحديث حالة المحل.", tone: "danger" });
    }
  }

  function savedMarket(saved: Market, notificationRequested: boolean) {
    setMarkets((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]);
    setDialogMarket(undefined);
    showSnackbar({ message: notificationRequested ? "تم إنشاء المحل، والإشعار هيتبعت بعد إضافة أول منتج متاح." : "تم حفظ المحل وربطه بنطاق الظهور." });
  }

  return {
    markets,
    classifications,
    marketTypes,
    serviceCities,
    serviceCitiesLoading,
    serviceCitiesError,
    loading,
    error,
    query,
    setQuery,
    serviceCityFilter,
    setServiceCityFilter,
    classificationFilter,
    setClassificationFilter,
    filteredMarkets,
    dialogMarket,
    setDialogMarket,
    deleteCandidate,
    setDeleteCandidate,
    load,
    loadServiceCityOptions,
    remove,
    restoreArchivedMarket,
    toggleMarketActive,
    savedMarket,
  };
}
