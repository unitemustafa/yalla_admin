"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import { useServiceCities } from "../cities/use-service-cities";
import { deleteDeliveryZone, loadDeliveryZones, restoreDeliveryZone, saveDeliveryZone } from "./api";
import {
  allCitiesFilterValue,
  deliveryListPageSize,
  deliveryZoneMetrics,
  filterDeliveryZones,
} from "./domain";
import type { DeliveryZone } from "./types";

export function useDeliveryZonesPage(initialArchived: boolean) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState(allCitiesFilterValue);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [missingServiceCities, setMissingServiceCities] = useState(false);
  const [deleteZone, setDeleteZone] = useState<DeliveryZone | null>(null);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const { cities, loading: citiesLoading, error: citiesError } = useServiceCities();
  const cityFilterOptions = useMemo(() => [
    { value: allCitiesFilterValue, label: "جميع المدن" },
    ...cities.map((city) => ({ value: String(city.id), label: city.name })),
  ], [cities]);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const serviceCityId = selectedCityId === allCitiesFilterValue ? undefined : selectedCityId;
      setZones(await loadDeliveryZones(apiFetch, serviceCityId, initialArchived));
    } catch (error) {
      setZones([]);
      setLoadError(error instanceof Error ? error.message : "تعذر تحميل مناطق التوصيل.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, initialArchived, selectedCityId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadZones(), 0);
    return () => window.clearTimeout(timer);
  }, [loadZones]);

  const filteredZones = useMemo(() => filterDeliveryZones(zones, searchQuery), [searchQuery, zones]);
  const totalPages = Math.max(1, Math.ceil(filteredZones.length / deliveryListPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * deliveryListPageSize;
  const pagedZones = filteredZones.slice(pageStartIndex, pageStartIndex + deliveryListPageSize);

  function startCreatingZone() {
    if (!cities.some((city) => city.is_active !== false)) {
      setMissingServiceCities(true);
      return;
    }
    setCreating(true);
  }

  async function saveZone(zone: DeliveryZone) {
    try {
      const savedZone = await saveDeliveryZone(apiFetch, zone);
      const matchesCityFilter = selectedCityId === allCitiesFilterValue || savedZone.cityId === selectedCityId;
      if (editingZone) {
        setZones((current) => matchesCityFilter
          ? current.map((item) => item.id === zone.id ? savedZone : item)
          : current.filter((item) => item.id !== zone.id));
        setEditingZone(null);
        showSnackbar({ message: "تم تحديث منطقة التوصيل.", tone: "success" });
        return;
      }
      if (matchesCityFilter) setZones((current) => [savedZone, ...current]);
      setCreating(false);
      setCurrentPage(1);
      showSnackbar({ message: "تمت إضافة منطقة التوصيل.", tone: "success" });
    } catch (error) {
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر حفظ منطقة التوصيل.", tone: "danger" });
    }
  }

  async function changeStatus(zone: DeliveryZone, checked: boolean) {
    if (changingStatusId) return;
    setChangingStatusId(zone.id);
    try {
      const savedZone = await saveDeliveryZone(apiFetch, { ...zone, status: checked ? "active" : "inactive" });
      setZones((current) => current.map((item) => item.id === savedZone.id ? savedZone : item));
      showSnackbar({ message: checked ? "تم تفعيل منطقة التوصيل." : "تم تعطيل منطقة التوصيل.", tone: checked ? "success" : "danger" });
    } catch (error) {
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر تحديث منطقة التوصيل.", tone: "danger" });
    } finally {
      setChangingStatusId(null);
    }
  }

  function confirmDeleteZone() {
    if (!deleteZone || deletingZoneId) return;
    const zone = deleteZone;
    const zoneIndex = zones.findIndex((item) => item.id === zone.id);
    setDeletingZoneId(zone.id);
    queueUndoableDelete({
      message: `تمت إزالة ${zone.name} من القائمة مؤقتًا.`,
      onDelete: () => {
        setZones((current) => current.filter((item) => item.id !== zone.id));
        setDeleteZone(null);
        setDeletingZoneId(null);
      },
      onUndo: () => {
        setZones((current) => {
          if (current.some((item) => item.id === zone.id)) return current;
          const next = [...current];
          next.splice(Math.max(0, zoneIndex), 0, zone);
          return next;
        });
        showSnackbar({ message: `تمت استعادة منطقة ${zone.name}.`, tone: "success" });
      },
      onCommit: () => deleteDeliveryZone(apiFetch, zone.id),
      onCommitSuccess: (value) => {
        const result = value && typeof value === "object" && "action" in value
          ? value as { action: "deleted" | "archived"; detail?: string }
          : { action: "deleted" as const };
        showSnackbar({ message: result.action === "archived" ? result.detail ?? `تمت أرشفة منطقة ${zone.name}.` : `تم حذف منطقة ${zone.name} نهائيًا.`, tone: result.action === "archived" ? "success" : "danger" });
      },
      onCommitError: (error) => showSnackbar({ message: error instanceof Error ? error.message : "تعذر حذف منطقة التوصيل.", tone: "danger" }),
    });
  }

  async function restoreArchivedZone(zone: DeliveryZone) {
    const previousZones = zones;
    setZones((current) => current.filter((item) => item.id !== zone.id));
    try {
      await restoreDeliveryZone(apiFetch, zone.id);
      showSnackbar({ message: `تمت استعادة منطقة ${zone.name}.`, tone: "success" });
    } catch (error) {
      setZones(previousZones);
      showSnackbar({ message: error instanceof Error ? error.message : "تعذر استعادة منطقة التوصيل.", tone: "danger" });
    }
  }

  return {
    zones,
    loading,
    loadError,
    loadZones,
    cities,
    citiesLoading,
    citiesError,
    cityFilterOptions,
    selectedCityId,
    setSelectedCityId,
    searchQuery,
    setSearchQuery,
    currentPage: safeCurrentPage,
    setCurrentPage,
    totalPages,
    pageStartIndex,
    filteredZones,
    pagedZones,
    metrics: deliveryZoneMetrics(zones),
    editingZone,
    setEditingZone,
    creating,
    setCreating,
    missingServiceCities,
    setMissingServiceCities,
    deleteZone,
    setDeleteZone,
    deletingZoneId,
    changingStatusId,
    startCreatingZone,
    saveZone,
    changeStatus,
    confirmDeleteZone,
    restoreArchivedZone,
  };
}
