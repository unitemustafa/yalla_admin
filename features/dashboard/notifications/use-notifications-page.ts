"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useDashboardI18n } from "@/features/dashboard/i18n";
import { useDashboardNotifications } from "@/features/dashboard/notifications-context";
import { useSnackbar } from "@/features/dashboard/snackbar";
import {
  clearReadNotificationsRequest,
  deleteNotificationRequest,
  loadNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from "./api";
import {
  clearableReadNotificationIds,
  formatNotificationMessage,
  notificationPage,
  notificationTextValue,
  numericOrderId,
} from "./domain";
import {
  notificationsPollingIntervalMs,
  type DashboardNotification,
  type DeleteDialogTarget,
  type NotificationFilter,
  type NotificationFilterOption,
} from "./types";

export type NotificationsPageController = {
  notifications: DashboardNotification[];
  pagedNotifications: DashboardNotification[];
  filters: NotificationFilterOption[];
  activeFilter: NotificationFilter;
  currentPage: number;
  totalPages: number;
  unreadCount: number;
  readCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  markingId: string | null;
  markingAll: boolean;
  deletingId: string | null;
  clearingRead: boolean;
  deleteDialogTarget: DeleteDialogTarget | null;
  selectFilter: (filter: NotificationFilter) => void;
  retryLoad: () => void;
  refresh: () => void;
  openNotification: (notification: DashboardNotification) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestNotificationDelete: (notification: DashboardNotification) => void;
  requestClearRead: () => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => Promise<void>;
  previousPage: () => void;
  nextPage: () => void;
};

export function useNotificationsPage(): NotificationsPageController {
  const { status, user, apiFetch } = useAuth();
  const router = useRouter();
  const { t } = useDashboardI18n();
  const { showSnackbar } = useSnackbar();
  const { unreadCount, refreshUnreadCount, setUnreadCount } =
    useDashboardNotifications();
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  );
  const [activeFilter, setActiveFilter] =
    useState<NotificationFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingRead, setClearingRead] = useState(false);
  const [deleteDialogTarget, setDeleteDialogTarget] =
    useState<DeleteDialogTarget | null>(null);
  const requestIdRef = useRef(0);

  const shouldRun = status === "authenticated" && user?.role === "admin";
  const readCount = notifications.filter(
    (notification) => notification.isRead,
  ).length;
  const notificationPagination = notificationPage(notifications, currentPage);
  const filters = useMemo<NotificationFilterOption[]>(
    () => [
      {
        id: "all",
        label: t("notifications.filter.all"),
        count: activeFilter === "all" ? notifications.length : undefined,
      },
      {
        id: "unread",
        label: t("notifications.filter.unread"),
        count: unreadCount,
      },
      {
        id: "read",
        label: t("notifications.filter.read"),
        count:
          activeFilter === "read" || activeFilter === "all"
            ? readCount
            : undefined,
      },
    ],
    [activeFilter, notifications.length, readCount, t, unreadCount],
  );

  const loadNotifications = useCallback(
    async (
      filter: NotificationFilter = activeFilter,
      options: { showLoading?: boolean } = {},
    ) => {
      if (!shouldRun) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const showLoading = options.showLoading ?? true;

      if (showLoading) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const nextNotifications = await loadNotificationsRequest(
          apiFetch,
          filter,
          t("notifications.error.load"),
        );
        if (requestId !== requestIdRef.current) return;
        setNotifications(nextNotifications);
      } catch (reason) {
        if (requestId !== requestIdRef.current) return;
        setError(
          reason instanceof Error
            ? reason.message
            : t("notifications.error.load"),
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeFilter, apiFetch, shouldRun, t],
  );

  useEffect(() => {
    if (!shouldRun) return;
    const timer = window.setTimeout(() => {
      void loadNotifications(activeFilter, { showLoading: true });
      void refreshUnreadCount();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeFilter, loadNotifications, refreshUnreadCount, shouldRun]);

  useEffect(() => {
    if (!shouldRun) return;
    const timer = window.setInterval(() => {
      void loadNotifications(activeFilter, { showLoading: false });
      void refreshUnreadCount();
    }, notificationsPollingIntervalMs);
    return () => window.clearInterval(timer);
  }, [activeFilter, loadNotifications, refreshUnreadCount, shouldRun]);

  useEffect(() => {
    if (shouldRun) return;
    const timer = window.setTimeout(() => {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [shouldRun]);

  async function markAsRead(notification: DashboardNotification) {
    if (
      notification.isRead ||
      markingId ||
      markingAll ||
      deletingId ||
      clearingRead
    ) {
      return;
    }

    setMarkingId(notification.id);
    setError(null);
    try {
      await markNotificationReadRequest(
        apiFetch,
        notification.id,
        t("notifications.error.update"),
      );
      setNotifications((currentNotifications) => {
        if (activeFilter === "unread") {
          return currentNotifications.filter(
            (item) => item.id !== notification.id,
          );
        }
        return currentNotifications.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        );
      });
      setUnreadCount((count) => Math.max(0, count - 1));
      void refreshUnreadCount();
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error
            ? reason.message
            : t("notifications.error.update"),
        tone: "danger",
      });
    } finally {
      setMarkingId(null);
    }
  }

  async function openNotification(notification: DashboardNotification) {
    if (!notification.isRead) void markAsRead(notification);
    const orderId = numericOrderId(notification);
    if (notification.type === "new_partner_application") {
      router.push("/partners");
      return;
    }
    if (orderId) router.push(`/orders/view/${orderId}`);
  }

  async function markAllAsRead() {
    if (markingAll || deletingId || clearingRead) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsReadRequest(
        apiFetch,
        t("notifications.error.update"),
      );
      setNotifications((currentNotifications) =>
        activeFilter === "unread"
          ? []
          : currentNotifications.map((notification) => ({
              ...notification,
              isRead: true,
            })),
      );
      setUnreadCount(0);
      showSnackbar({ message: t("notifications.success.markAllRead") });
      await Promise.all([
        refreshUnreadCount(),
        loadNotifications(activeFilter, { showLoading: false }),
      ]);
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error
            ? reason.message
            : t("notifications.error.update"),
        tone: "danger",
      });
    } finally {
      setMarkingAll(false);
    }
  }

  async function deleteNotification(notification: DashboardNotification) {
    if (deletingId || markingId || markingAll || clearingRead) return;
    if (notification.isBlocking && !notification.isResolved) {
      showSnackbar({
        message: t("notifications.error.protectedDelete"),
        tone: "danger",
      });
      return;
    }

    setDeletingId(notification.id);
    setError(null);
    try {
      await deleteNotificationRequest(
        apiFetch,
        notification.id,
        t("notifications.error.delete"),
        t("notifications.error.protectedDelete"),
      );
      setNotifications((currentNotifications) =>
        currentNotifications.filter((item) => item.id !== notification.id),
      );
      if (!notification.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      setDeleteDialogTarget(null);
      showSnackbar({
        message: t("notifications.success.delete"),
        tone: "danger",
      });
      await refreshUnreadCount();
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error
            ? reason.message
            : t("notifications.error.delete"),
        tone: "danger",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function clearReadNotifications() {
    if (clearingRead || deletingId || markingId || markingAll) return;
    setClearingRead(true);
    setError(null);
    try {
      const data = await clearReadNotificationsRequest(
        apiFetch,
        t("notifications.error.clearRead"),
      );
      const deletedIds = clearableReadNotificationIds(notifications);
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => !deletedIds.has(notification.id),
        ),
      );
      setDeleteDialogTarget(null);
      showSnackbar({
        message: formatNotificationMessage(
          t("notifications.success.clearRead"),
          { count: notificationTextValue(data.deleted_count, "0") },
        ),
        tone: "danger",
      });
      await refreshUnreadCount();
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error
            ? reason.message
            : t("notifications.error.clearRead"),
        tone: "danger",
      });
    } finally {
      setClearingRead(false);
    }
  }

  return {
    notifications,
    pagedNotifications: notificationPagination.notifications,
    filters,
    activeFilter,
    currentPage: notificationPagination.safeCurrentPage,
    totalPages: notificationPagination.totalPages,
    unreadCount,
    readCount,
    loading,
    refreshing,
    error,
    markingId,
    markingAll,
    deletingId,
    clearingRead,
    deleteDialogTarget,
    selectFilter(filter) {
      setActiveFilter(filter);
      setCurrentPage(1);
    },
    retryLoad() {
      void loadNotifications(activeFilter, { showLoading: true });
    },
    refresh() {
      void loadNotifications(activeFilter, { showLoading: true });
      void refreshUnreadCount();
    },
    openNotification,
    markAllAsRead,
    requestNotificationDelete(notification) {
      setDeleteDialogTarget({ kind: "single", notification });
    },
    requestClearRead() {
      setDeleteDialogTarget({ kind: "clear-read" });
    },
    closeDeleteDialog() {
      if (!deletingId && !clearingRead) setDeleteDialogTarget(null);
    },
    async confirmDelete() {
      if (!deleteDialogTarget) return;
      if (deleteDialogTarget.kind === "clear-read") {
        await clearReadNotifications();
      } else {
        await deleteNotification(deleteDialogTarget.notification);
      }
    },
    previousPage() {
      setCurrentPage((page) =>
        Math.max(1, Math.min(page, notificationPagination.totalPages) - 1),
      );
    },
    nextPage() {
      setCurrentPage((page) =>
        Math.min(
          notificationPagination.totalPages,
          Math.min(page, notificationPagination.totalPages) + 1,
        ),
      );
    },
  };
}
