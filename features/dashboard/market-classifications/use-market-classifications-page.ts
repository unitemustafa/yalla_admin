"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import {
  createMarketClassification,
  deleteMarketClassification,
  loadMarketClassifications,
  updateMarketClassification,
} from "./api";
import {
  featuredClassificationLimitReached,
  filterMarketClassifications,
  paginateMarketClassifications,
  translateMarketClassificationError,
} from "./domain";
import type {
  ClassificationFormPayload,
  MarketClassification,
} from "./types";

export function useMarketClassificationsPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const [classifications, setClassifications] = useState<
    MarketClassification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQueryState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogClassification, setDialogClassification] = useState<
    MarketClassification | null | undefined
  >();
  const [deleteClassification, setDeleteClassification] =
    useState<MarketClassification | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      setClassifications(await loadMarketClassifications(apiFetch));
    } catch (reason) {
      setClassifications([]);
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "تعذر تحميل فئات المحلات.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredClassifications = useMemo(
    () => filterMarketClassifications(classifications, query),
    [classifications, query],
  );
  const pagination = useMemo(
    () => paginateMarketClassifications(filteredClassifications, currentPage),
    [currentPage, filteredClassifications],
  );
  const featuredOptionDisabled = useMemo(
    () => featuredClassificationLimitReached(classifications),
    [classifications],
  );

  function setQuery(queryValue: string) {
    setQueryState(queryValue);
    setCurrentPage(1);
  }

  async function saveClassification(payload: ClassificationFormPayload) {
    try {
      if (dialogClassification) {
        const updated = await updateMarketClassification(
          apiFetch,
          dialogClassification.id,
          payload,
          payload.imageFile,
        );
        setClassifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        showSnackbar({
          message: "تم تحديث الفئة بنجاح.",
          tone: "success",
        });
      } else {
        const created = await createMarketClassification(
          apiFetch,
          payload,
          payload.imageFile,
        );
        setClassifications((current) => [created, ...current]);
        setCurrentPage(1);
        showSnackbar({
          message: "تمت إضافة الفئة بنجاح.",
          tone: "success",
        });
      }

      setDialogClassification(undefined);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "تعذر حفظ فئة المحل.";
      showSnackbar({
        message: translateMarketClassificationError(message),
        tone: "danger",
      });
      throw new Error("تعذر حفظ فئة المحل.");
    }
  }

  async function toggleClassificationActive(
    classification: MarketClassification,
    nextActive: boolean,
  ) {
    setClassifications((current) =>
      current.map((item) =>
        item.id === classification.id
          ? { ...item, is_active: nextActive }
          : item,
      ),
    );

    try {
      const updated = await updateMarketClassification(
        apiFetch,
        classification.id,
        {
          name: classification.name,
          classification_type: classification.classification_type,
          is_active: nextActive,
        },
      );
      setClassifications((current) =>
        current.map((item) =>
          item.id === classification.id ? updated : item,
        ),
      );
      showSnackbar({
        message: nextActive
          ? `تم تفعيل الفئة ${classification.name}.`
          : `تم تعطيل الفئة ${classification.name}.`,
        tone: nextActive ? "success" : "danger",
      });
    } catch (reason) {
      setClassifications((current) =>
        current.map((item) =>
          item.id === classification.id ? classification : item,
        ),
      );
      const message =
        reason instanceof Error ? reason.message : "تعذر تحديث حالة الفئة.";
      showSnackbar({
        message: translateMarketClassificationError(message),
        tone: "danger",
      });
    }
  }

  function confirmDelete() {
    if (!deleteClassification) return;
    const classification = deleteClassification;
    const classificationIndex = classifications.findIndex(
      (item) => item.id === classification.id,
    );
    setDeleteClassification(null);

    queueUndoableDelete({
      message: `تمت إزالة الفئة ${classification.name} من القائمة مؤقتًا.`,
      onDelete: () => {
        setClassifications((current) =>
          current.filter((item) => item.id !== classification.id),
        );
      },
      onUndo: () => {
        setClassifications((current) => {
          if (current.some((item) => item.id === classification.id)) {
            return current;
          }
          const nextClassifications = [...current];
          nextClassifications.splice(
            Math.max(0, classificationIndex),
            0,
            classification,
          );
          return nextClassifications;
        });
      },
      onCommit: () => deleteMarketClassification(apiFetch, classification.id),
      onCommitSuccess: (value) => {
        if (
          value &&
          typeof value === "object" &&
          "action" in value &&
          value.action === "archived"
        ) {
          setClassifications((current) => {
            if (current.some((item) => item.id === classification.id)) {
              return current;
            }
            const nextClassifications = [...current];
            nextClassifications.splice(
              Math.max(0, classificationIndex),
              0,
              { ...classification, is_active: false },
            );
            return nextClassifications;
          });
          showSnackbar({
            message:
              "detail" in value && typeof value.detail === "string"
                ? value.detail
                : `تمت أرشفة الفئة ${classification.name}.`,
            tone: "success",
          });
        }
      },
      onCommitError: (reason) => {
        const message =
          reason instanceof Error ? reason.message : "تعذر حذف فئة المحل.";
        showSnackbar({
          message: translateMarketClassificationError(message),
          tone: "danger",
        });
      },
    });
  }

  return {
    classifications,
    filteredClassifications,
    pagedClassifications: pagination.items,
    totalPages: pagination.totalPages,
    currentPage: pagination.safeCurrentPage,
    pageStartIndex: pagination.pageStartIndex,
    setCurrentPage,
    loading,
    loadError,
    load,
    query,
    setQuery,
    featuredOptionDisabled,
    dialogClassification,
    setDialogClassification,
    saveClassification,
    deleteClassification,
    setDeleteClassification,
    confirmDelete,
    toggleClassificationActive,
  };
}
