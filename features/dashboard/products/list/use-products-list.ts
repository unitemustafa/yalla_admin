"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { fetchAddonRows } from "../../addons/api";
import {
  AdminApiError,
  adminApiPaths,
  fetchAdminRows,
  shopRowFromApi,
  type ShopRow,
} from "../../admin-api";
import { useSnackbar } from "../../snackbar";
import {
  deleteProduct,
  getProduct,
  listProducts,
  restoreProduct,
  toggleProductAvailability,
} from "../api";
import { normalizeItemRow, productRowFromApi } from "../normalizers";
import type { ItemRow, NormalizedProduct } from "../types";
import { compareItems, matchesItemFilters } from "./domain";
import {
  defaultAdvancedFilters,
  defaultFilters,
  itemsPageSize,
  type ItemAdvancedFilters,
} from "./types";

export function useProductsList(showArchived: boolean) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [markets, setMarkets] = useState<ShopRow[]>([]);
  const [additionRows, setAdditionRows] = useState(() => new Map<string, string>());
  const [filters, setFilters] = useState(defaultFilters);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailProduct, setDetailProduct] = useState<NormalizedProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const visibleRows = useMemo(
    () => rows.filter((row) => matchesItemFilters(row, filters)).sort(compareItems),
    [filters, rows],
  );
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * itemsPageSize;
  const pagedRows = visibleRows.slice(pageStartIndex, pageStartIndex + itemsPageSize);
  const deleteRow = rows.find((row) => row.id === deleteId);
  const detailDialogOpen = detailLoading || Boolean(detailError) || Boolean(detailProduct);
  const showEmptyState = !loading && !error && rows.length === 0;

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const [products, addonResult, loadedMarkets] = await Promise.all([
          listProducts(apiFetch, showArchived),
          fetchAddonRows(apiFetch),
          fetchAdminRows(apiFetch, adminApiPaths.markets, shopRowFromApi),
        ]);
        if (!active) return;
        const marketsById = new Map(loadedMarkets.map((market) => [market.id, market]));
        setMarkets(loadedMarkets);
        setRows(
          products.map((product, index) => {
            const row = productRowFromApi(product, index);
            return normalizeItemRow(
              row,
              row.marketId ? marketsById.get(row.marketId) : undefined,
            );
          }),
        );
        if (addonResult.ok) {
          setAdditionRows(
            new Map(
              addonResult.addons.map((addon) => [addon.id, addon.nameAr || addon.name]),
            ),
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المنتجات");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => {
      active = false;
    };
  }, [apiFetch, reloadKey, showArchived]);

  function toggleSelectedRow(rowIndex: string) {
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);
      if (nextRows.has(rowIndex)) nextRows.delete(rowIndex);
      else nextRows.add(rowIndex);
      return nextRows;
    });
  }

  async function toggleActive(row: ItemRow, active: boolean) {
    const previousRows = rows;
    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.id === row.id ? { ...currentRow, active } : currentRow,
      ),
    );
    setError("");
    try {
      await toggleProductAvailability(apiFetch, row.id, active);
      showSnackbar({ message: active ? "تم تفعيل المنتج في الباك." : "تم إيقاف المنتج في الباك." });
    } catch (updateError) {
      setRows(previousRows);
      showSnackbar({
        message:
          updateError instanceof Error
            ? updateError.message
            : "تعذر تحديث حالة المنتج في الباك.",
        tone: "danger",
      });
    }
  }

  async function openProductDetail(row: ItemRow) {
    setError("");
    setDetailProduct(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setDetailProduct(await getProduct(apiFetch, row.id));
    } catch (detailLoadError) {
      setDetailError(
        detailLoadError instanceof AdminApiError && detailLoadError.status === 404
          ? "تعذر العثور على المنتج"
          : detailLoadError instanceof Error
            ? detailLoadError.message
            : "تعذر تحميل بيانات المنتج",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeProductDetail() {
    setDetailProduct(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    const previousRows = rows;
    setRows((currentRows) => currentRows.filter((row) => row.id !== deleteRow.id));
    setSelectedRows((currentRows) => {
      const nextRows = new Set(currentRows);
      nextRows.delete(deleteRow.index);
      return nextRows;
    });
    setDeleteId(null);
    setError("");
    try {
      const result = await deleteProduct(apiFetch, deleteRow.id);
      showSnackbar({
        message:
          result.action === "archived"
            ? result.detail ?? `تمت أرشفة ${deleteRow.name} وتعطيله.`
            : `تم حذف ${deleteRow.name} نهائيًا.`,
        tone: result.action === "archived" ? "success" : "danger",
      });
    } catch (deleteError) {
      setRows(previousRows);
      showSnackbar({
        message: deleteError instanceof Error ? deleteError.message : "تعذر حذف المنتج من الباك.",
        tone: "danger",
      });
    }
  }

  async function restoreArchivedProduct(row: ItemRow) {
    const previousRows = rows;
    setRows((currentRows) => currentRows.filter((item) => item.id !== row.id));
    try {
      await restoreProduct(apiFetch, row.id);
      showSnackbar({ message: `تمت استعادة ${row.name} إلى قائمة المنتجات.` });
    } catch (restoreError) {
      setRows(previousRows);
      showSnackbar({
        message: restoreError instanceof Error ? restoreError.message : "تعذر استعادة المنتج.",
        tone: "danger",
      });
    }
  }

  function changeSearch(search: string) {
    setFilters((current) => ({ ...current, search }));
    setCurrentPage(1);
  }

  function applyAdvancedFilters(advanced: ItemAdvancedFilters) {
    setFilters((current) => ({ search: current.search, ...advanced }));
    setCurrentPage(1);
  }

  function clearAdvancedFilters() {
    setFilters((current) => ({ search: current.search, ...defaultAdvancedFilters }));
    setCurrentPage(1);
  }

  return {
    additionRows,
    applyAdvancedFilters,
    changeSearch,
    clearAdvancedFilters,
    closeProductDetail,
    confirmDelete,
    currentPage: safeCurrentPage,
    deleteRow,
    detailDialogOpen,
    detailError,
    detailLoading,
    detailProduct,
    error,
    filters,
    loading,
    markets,
    nextPage: () => setCurrentPage((page) => Math.min(totalPages, Math.min(page, totalPages) + 1)),
    openProductDetail,
    pageStartIndex,
    pagedRows,
    previousPage: () => setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1)),
    reload: () => setReloadKey((current) => current + 1),
    restoreArchivedProduct,
    selectedRows,
    setDeleteId,
    showEmptyState,
    toggleActive,
    toggleSelectedRow,
    totalPages,
    visibleRows,
  };
}
