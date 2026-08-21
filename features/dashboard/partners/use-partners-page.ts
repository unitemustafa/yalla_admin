"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useSnackbar } from "../snackbar";
import {
  fetchPartnerApplications,
  patchPartnerApplicationStatus,
} from "./api";
import {
  filterPartnerApplications,
  partnerApplicationCounts,
  partnerStatusLabel,
} from "./domain";
import type {
  PartnerApplication,
  PartnerFilter,
  PartnerStatus,
} from "./types";

export function usePartnersPage() {
  const { apiFetch, status: authStatus, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PartnerFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<PartnerApplication | null>(null);
  const shouldLoad = authStatus === "authenticated" && user?.role === "admin";

  const loadApplications = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!shouldLoad) return;
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        setApplications(await fetchPartnerApplications(apiFetch));
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "تعذر تحميل طلبات الشركاء.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, shouldLoad],
  );

  useEffect(() => {
    if (!shouldLoad) return;
    const timer = window.setTimeout(() => void loadApplications(), 0);
    return () => window.clearTimeout(timer);
  }, [loadApplications, shouldLoad]);

  const filteredApplications = useMemo(
    () => filterPartnerApplications(applications, filter, search),
    [applications, filter, search],
  );
  const counts = useMemo(
    () => partnerApplicationCounts(applications),
    [applications],
  );

  async function updateStatus(
    application: PartnerApplication,
    nextStatus: PartnerStatus,
  ) {
    if (updatingId || application.status === nextStatus) return;
    setUpdatingId(application.id);
    try {
      const { updated, shouldRefresh } = await patchPartnerApplicationStatus(
        apiFetch,
        application,
        nextStatus,
      );
      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedApplication((current) =>
        current?.id === updated.id ? updated : current,
      );
      showSnackbar({
        message: `تم تحديث طلب ${updated.businessName} إلى «${partnerStatusLabel(updated.status)}».`,
        tone: updated.status === "rejected" ? "danger" : "success",
      });
      if (shouldRefresh) void loadApplications({ quiet: true });
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error ? reason.message : "تعذر تحديث حالة الطلب.",
        tone: "danger",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return {
    counts,
    error,
    filter,
    filteredApplications,
    loading,
    loadApplications,
    refreshing,
    search,
    selectedApplication,
    setFilter,
    setSearch,
    setSelectedApplication,
    updateStatus,
    updatingId,
  };
}
