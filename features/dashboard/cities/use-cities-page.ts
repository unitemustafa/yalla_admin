"use client";

import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import {
  deleteServiceCity,
  loadDeliveryAreas,
  restoreServiceCity,
  saveServiceCity,
} from "./api";
import {
  citiesPageSize,
  cityMetrics,
  filterCities,
  payloadFromCity,
} from "./domain";
import type { DeliveryArea, ServiceCity } from "./types";
import { useServiceCities } from "./use-service-cities";

export function useCitiesPage(initialArchived: boolean) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { cities, setCities, loading, error, reload } = useServiceCities({ archived: initialArchived });
  const [query, setQuery] = useState("");
  const [editingCity, setEditingCity] = useState<ServiceCity | null | undefined>();
  const [deleteCity, setDeleteCity] = useState<ServiceCity | null>(null);
  const [busyCityId, setBusyCityId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCityForAreas, setSelectedCityForAreas] = useState<ServiceCity | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);

  const filteredCities = useMemo(() => filterCities(cities, query), [cities, query]);
  const totalPages = Math.max(1, Math.ceil(filteredCities.length / citiesPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * citiesPageSize;
  const pagedCities = filteredCities.slice(pageStartIndex, pageStartIndex + citiesPageSize);

  const loadAreasForCity = useCallback(async (city: ServiceCity) => {
    setAreasLoading(true);
    setAreasError(null);
    try {
      const nextAreas = await loadDeliveryAreas(apiFetch, city.id);
      setDeliveryAreas(nextAreas);
      setCities((current) => current.map((item) =>
        item.id === city.id ? { ...item, delivery_area_count: nextAreas.length } : item,
      ));
    } catch (reason) {
      setDeliveryAreas([]);
      setAreasError(reason instanceof Error ? reason.message : "تعذر تحميل مناطق التوصيل.");
    } finally {
      setAreasLoading(false);
    }
  }, [apiFetch, setCities]);

  async function toggleCity(city: ServiceCity, checked: boolean) {
    if (busyCityId === city.id) return;
    setBusyCityId(city.id);
    try {
      const updated = await saveServiceCity(apiFetch, { is_active: checked }, city.id);
      setCities((current) => current.map((item) => item.id === city.id ? updated : item));
      showSnackbar({
        message: checked ? "تم تفعيل المدينة." : "تم تعطيل المدينة.",
        tone: checked ? "success" : "danger",
      });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر تحديث المدينة.", tone: "danger" });
    } finally {
      setBusyCityId(null);
    }
  }

  async function restoreDeletedCity(city: ServiceCity, index: number) {
    try {
      const restoredCity = await saveServiceCity(apiFetch, payloadFromCity(city));
      setCities((current) => {
        if (current.some((item) => item.id === restoredCity.id)) return current;
        const next = [...current];
        next.splice(Math.max(0, index), 0, {
          ...restoredCity,
          delivery_area_count: city.delivery_area_count,
          market_count: city.market_count,
          offer_count: city.offer_count,
        });
        return next;
      });
      showSnackbar({ message: `تم التراجع واستعادة ${city.name}.`, tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر التراجع عن حذف المدينة.", tone: "danger" });
    }
  }

  async function removeCity(city: ServiceCity) {
    if (busyCityId === city.id) return;
    const cityIndex = cities.findIndex((item) => item.id === city.id);
    setBusyCityId(city.id);
    try {
      const result = await deleteServiceCity(apiFetch, city.id);
      setCities((current) => current.filter((item) => item.id !== city.id));
      setDeleteCity(null);
      if (result.action === "archived") {
        showSnackbar({ message: result.detail ?? `تمت أرشفة ${city.name} وتعطيلها.`, tone: "success" });
        return;
      }
      showSnackbar({
        message: `تم حذف ${city.name}.`,
        tone: "danger",
        actionLabel: "تراجع",
        onAction: () => void restoreDeletedCity(city, cityIndex),
      });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر حذف المدينة.", tone: "danger" });
    } finally {
      setBusyCityId(null);
    }
  }

  async function restoreArchivedCity(city: ServiceCity) {
    if (busyCityId === city.id) return;
    setBusyCityId(city.id);
    try {
      await restoreServiceCity(apiFetch, city.id);
      setCities((current) => current.filter((item) => item.id !== city.id));
      showSnackbar({ message: `تمت استعادة ${city.name} إلى قائمة المدن الحالية.`, tone: "success" });
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر استعادة المدينة.", tone: "danger" });
    } finally {
      setBusyCityId(null);
    }
  }

  function openDeliveryAreas(city: ServiceCity) {
    setSelectedCityForAreas(city);
    void loadAreasForCity(city);
  }

  function closeDeliveryAreas() {
    setSelectedCityForAreas(null);
    setDeliveryAreas([]);
    setAreasError(null);
  }

  function saveCityToList(savedCity: ServiceCity) {
    setCities((current) => current.some((city) => city.id === savedCity.id)
      ? current.map((city) => city.id === savedCity.id ? savedCity : city)
      : [savedCity, ...current]);
    setEditingCity(undefined);
    showSnackbar({ message: editingCity ? "تم تحديث المدينة." : "تمت إضافة المدينة." });
  }

  function confirmDeleteCity() {
    if (deleteCity) void removeCity(deleteCity);
  }

  function reloadSelectedAreas() {
    if (selectedCityForAreas) void loadAreasForCity(selectedCityForAreas);
  }

  return {
    cities,
    loading,
    error,
    reload,
    query,
    setQuery,
    editingCity,
    setEditingCity,
    deleteCity,
    setDeleteCity,
    busyCityId,
    currentPage: safeCurrentPage,
    setCurrentPage,
    filteredCities,
    pagedCities,
    totalPages,
    pageStartIndex,
    metrics: cityMetrics(cities),
    selectedCityForAreas,
    deliveryAreas,
    areasLoading,
    areasError,
    loadAreasForCity,
    toggleCity,
    removeCity,
    restoreArchivedCity,
    openDeliveryAreas,
    closeDeliveryAreas,
    saveCityToList,
    confirmDeleteCity,
    reloadSelectedAreas,
  };
}
