"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CheckCheck,
  Circle,
  CircleAlert,
  ExternalLink,
  Inbox,
  Info,
  Handshake,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { PageLoadError, PageLoadingState } from "../load-error-card";
import { useDashboardI18n } from "@/features/dashboard/i18n";
import {
  Badge,
  Button,
  Card,
  PageTitle,
  Pagination,
} from "@/features/dashboard/primitives";
import { useDashboardNotifications } from "@/features/dashboard/notifications-context";
import { useSnackbar } from "@/features/dashboard/snackbar";
import { apiResponseData } from "@/features/dashboard/users/api-users";
import { cn } from "@/lib/utils";

const notificationsPageSize = 10;
const pollingIntervalMs = 30_000;

type NotificationFilter = "all" | "unread" | "read";
type NotificationRecord = Record<string, unknown>;

type DashboardNotification = {
  id: string;
  audience: string;
  type: string;
  title: string;
  message: string;
  orderId: string;
  isRead: boolean;
  isBlocking: boolean;
  isResolved: boolean;
  createdAt: string;
};

type DeleteDialogTarget =
  | { kind: "single"; notification: DashboardNotification }
  | { kind: "clear-read" };

const filterPaths: Record<NotificationFilter, string> = {
  all: "notifications/",
  unread: "notifications/?unread=true",
  read: "notifications/?unread=false",
};

function isRecord(value: unknown): value is NotificationRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function listFromApi(value: unknown) {
  const list =
    Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value.results)
        ? value.results
        : isRecord(value) && Array.isArray(value.data)
          ? value.data
          : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.results)
            ? value.data.results
            : [];

  return list.filter(isRecord);
}

function textValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function booleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function notificationFromApi(record: NotificationRecord): DashboardNotification {
  return {
    id: textValue(record.id),
    audience: textValue(record.audience, "admin"),
    type: textValue(record.type, "system"),
    title: textValue(record.title),
    message: textValue(record.message),
    orderId: textValue(record.order_id, ""),
    isRead: booleanValue(record.is_read),
    isBlocking: booleanValue(record.is_blocking),
    isResolved: booleanValue(record.is_resolved),
    createdAt: textValue(record.created_at, ""),
  };
}

function numericOrderId(notification: DashboardNotification) {
  return /^\d+$/.test(notification.orderId) ? notification.orderId : "";
}

function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function displayTitle(
  notification: DashboardNotification,
  t: (key: string) => string,
) {
  if (notification.type === "new_order_review") {
    return t("notifications.known.newOrderReview.title");
  }
  return notification.title;
}

function displayMessage(
  notification: DashboardNotification,
  t: (key: string) => string,
) {
  if (notification.type === "new_order_review") {
    return t("notifications.known.newOrderReview.message");
  }
  return notification.message;
}

function displayOrderLabel(
  notification: DashboardNotification,
  t: (key: string) => string,
) {
  const orderId = numericOrderId(notification);
  return orderId
    ? formatMessage(t("notifications.known.orderNumber"), { id: orderId })
    : "";
}

function apiErrorMessage(_value: unknown, fallback: string) {
  return fallback;
}

function typeLabel(type: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    order_review: t("notifications.category.orderReview"),
    new_order_review: t("notifications.category.ordersReview"),
    order_status_changed: t("notifications.category.deliveryGeneric"),
    stock_alert: t("notifications.category.stock"),
    delivery: t("notifications.category.deliveryGeneric"),
    system: t("notifications.category.systemGeneric"),
    security: t("notifications.category.securityGeneric"),
    reports: t("notifications.category.reportsGeneric"),
    new_partner_application: "طلبات الشركاء",
  };

  return labels[type] ?? (type || t("notifications.category.systemGeneric"));
}

function typeTone(type: string): "default" | "blue" | "green" | "red" | "secondary" {
  if (type === "order_review" || type === "new_order_review") return "blue";
  if (type === "order_status_changed") return "green";
  if (type === "stock_alert" || type === "security") return "red";
  if (type === "delivery") return "green";
  if (type === "reports") return "default";
  return "secondary";
}

function iconForType(type: string) {
  const icons = {
    order_review: ShoppingCart,
    new_order_review: ShoppingCart,
    order_status_changed: Truck,
    stock_alert: CircleAlert,
    delivery: Truck,
    system: Bell,
    security: ShieldCheck,
    reports: BarChart3,
    new_partner_application: Handshake,
  } as const;

  return icons[type as keyof typeof icons] ?? Info;
}

function relativeTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("ar-EG-u-nu-latn", {
    numeric: "auto",
  });

  if (absoluteSeconds < 60) return formatter.format(diffSeconds, "second");

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, "day");

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 5) return formatter.format(diffWeeks, "week");

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, "month");

  return formatter.format(Math.round(diffDays / 365), "year");
}

function emptyMessage(filter: NotificationFilter, t: (key: string) => string) {
  if (filter === "unread") return t("notifications.empty.unread");
  if (filter === "read") return t("notifications.empty.read");
  return t("notifications.empty.all");
}

export function NotificationsPage() {
  const { status, user, apiFetch } = useAuth();
  const router = useRouter();
  const { t } = useDashboardI18n();
  const { showSnackbar } = useSnackbar();
  const { unreadCount, refreshUnreadCount, setUnreadCount } =
    useDashboardNotifications();
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
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
  const hasNotifications = notifications.length > 0;
  const readCount = notifications.filter((notification) => notification.isRead).length;
  const totalPages = Math.max(1, Math.ceil(notifications.length / notificationsPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * notificationsPageSize;
  const pagedNotifications = notifications.slice(
    pageStartIndex,
    pageStartIndex + notificationsPageSize,
  );
  const filters = useMemo(
    () => [
      {
        id: "all" as const,
        label: t("notifications.filter.all"),
        count: activeFilter === "all" ? notifications.length : undefined,
      },
      {
        id: "unread" as const,
        label: t("notifications.filter.unread"),
        count: unreadCount,
      },
      {
        id: "read" as const,
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

      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const response = await apiFetch(filterPaths[filter]);
        const data = await apiResponseData(response);

        if (!response.ok) {
          throw new Error(apiErrorMessage(data, t("notifications.error.load")));
        }

        if (requestId !== requestIdRef.current) return;

        setNotifications(listFromApi(data).map(notificationFromApi));
      } catch (reason) {
        if (requestId !== requestIdRef.current) return;

        setError(
          reason instanceof Error ? reason.message : t("notifications.error.load"),
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
    }, pollingIntervalMs);

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
      const response = await apiFetch(`notifications/${notification.id}/read/`, {
        method: "PATCH",
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, t("notifications.error.update")));
      }

      setNotifications((currentNotifications) => {
        if (activeFilter === "unread") {
          return currentNotifications.filter((item) => item.id !== notification.id);
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
    if (!notification.isRead) {
      void markAsRead(notification);
    }
    const orderId = numericOrderId(notification);
    if (notification.type === "new_partner_application") {
      router.push("/partners");
      return;
    }
    if (orderId) {
      router.push(`/orders/view/${orderId}`);
    }
  }

  async function markAllAsRead() {
    if (markingAll || deletingId || clearingRead) return;

    setMarkingAll(true);
    setError(null);

    try {
      const response = await apiFetch("notifications/mark-all-read/", {
        method: "POST",
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, t("notifications.error.update")));
      }

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
      const response = await apiFetch(`notifications/${notification.id}/`, {
        method: "DELETE",
      });
      const data = response.status === 204 ? null : await apiResponseData(response);

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(t("notifications.error.protectedDelete"));
        }
        throw new Error(apiErrorMessage(data, t("notifications.error.delete")));
      }

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
      const response = await apiFetch("notifications/clear-read/", {
        method: "DELETE",
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, t("notifications.error.clearRead")));
      }

      const deletedIds = new Set(
        notifications
          .filter(
            (notification) =>
              notification.isRead &&
              (!notification.isBlocking || notification.isResolved),
          )
          .map((notification) => notification.id),
      );
      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) => !deletedIds.has(notification.id),
        ),
      );
      setDeleteDialogTarget(null);
      showSnackbar({
        message: formatMessage(t("notifications.success.clearRead"), {
          count: textValue((data as NotificationRecord).deleted_count, "0"),
        }),
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

  return (
    <div className="px-6 py-6">
      <PageTitle
        title={t("page.notifications")}
        description={t("notifications.description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                markingAll || deletingId !== null || clearingRead || unreadCount === 0
              }
              onClick={() => void markAllAsRead()}
              type="button"
              variant="outline"
            >
              {markingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              {t("notifications.action.markAllRead")}
            </Button>
            <Button
              disabled={clearingRead || deletingId !== null || readCount === 0}
              onClick={() => setDeleteDialogTarget({ kind: "clear-read" })}
              type="button"
              variant="outline"
            >
              {clearingRead ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("notifications.action.clearRead")}
            </Button>
            <Button
              disabled={loading || refreshing}
              onClick={() => {
                void loadNotifications(activeFilter, { showLoading: true });
                void refreshUnreadCount();
              }}
              type="button"
              variant="outline"
            >
              {refreshing || loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {t("notifications.action.refresh")}
            </Button>
          </div>
        }
      />

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b px-5 py-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bell className="size-4" />
            </span>
            <div className="text-start">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {t("notifications.center.title")}
                <Badge tone={unreadCount > 0 ? "blue" : "secondary"}>
                  {formatMessage(t("notifications.unreadCount"), {
                    count: unreadCount,
                  })}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("notifications.center.description")}
              </div>
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors md:flex-none",
                  activeFilter === filter.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {filter.label}
                {typeof filter.count === "number" ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {filter.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {error ? <PageLoadError className={hasNotifications ? "min-h-40" : "min-h-[320px]"} onRetry={() => void loadNotifications(activeFilter, { showLoading: true })} retrying={loading} /> : null}

        {loading && !error ? (
          <PageLoadingState className="min-h-[320px]" />
        ) : !error && hasNotifications ? (
          <>
            <div className="divide-y">
              {pagedNotifications.map((notification) => {
                const Icon = iconForType(notification.type);
                const markingThis = markingId === notification.id;
                const deletingThis = deletingId === notification.id;
                const orderId = numericOrderId(notification);
                const orderLabel = displayOrderLabel(notification, t);
                const canDelete =
                  !notification.isBlocking || notification.isResolved;

                return (
                  <article
                    key={notification.id}
                    className={cn(
                      "flex cursor-pointer gap-4 px-5 py-4 transition-colors hover:bg-muted/35",
                      !notification.isRead && "bg-primary/5",
                      markingThis && "opacity-70",
                    )}
                    onClick={() => void openNotification(notification)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border",
                        notification.isRead
                          ? "bg-background text-muted-foreground"
                          : "border-primary/25 bg-primary/10 text-primary",
                      )}
                    >
                      {markingThis ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 text-start">
                          <div className="flex items-center gap-2">
                            {!notification.isRead ? (
                              <Circle className="size-2.5 fill-primary text-primary" />
                            ) : null}
                            <h2 className="truncate text-sm font-semibold">
                              {displayTitle(notification, t)}
                            </h2>
                          </div>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            {displayMessage(notification, t)}
                          </p>
                          {orderLabel ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {orderLabel}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span>{relativeTime(notification.createdAt)}</span>
                          {notification.isRead ? (
                            <CheckCheck className="size-3.5 text-emerald-500" />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={typeTone(notification.type)}>
                            {typeLabel(notification.type, t)}
                          </Badge>
                          {notification.isResolved ? (
                            <Badge tone="green">
                              {t("notifications.state.resolved")}
                            </Badge>
                          ) : notification.isBlocking ? (
                            <Badge tone="red">
                              {t("notifications.state.requiresAction")}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {orderId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openNotification(notification);
                              }}
                            >
                              <ExternalLink className="size-4" />
                              {t("notifications.action.openOrder")}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canDelete || deletingThis}
                            title={
                              canDelete
                                ? t("notifications.delete.title")
                                : t("notifications.delete.protected")
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              if (canDelete) {
                                setDeleteDialogTarget({
                                  kind: "single",
                                  notification,
                                });
                              }
                            }}
                          >
                            {deletingThis ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            {t("notifications.action.delete")}
                          </Button>
                        </div>
                        {!canDelete ? (
                          <div className="basis-full text-xs font-medium text-destructive">
                            {t("notifications.delete.protected")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="px-5">
              <Pagination
                text={formatMessage(t("notifications.pagination.summary"), {
                  shown: pagedNotifications.length,
                  total: notifications.length,
                })}
                pages={`${safeCurrentPage} / ${totalPages}`}
                previousDisabled={safeCurrentPage === 1}
                nextDisabled={safeCurrentPage === totalPages}
                onPrevious={() =>
                  setCurrentPage((page) =>
                    Math.max(1, Math.min(page, totalPages) - 1),
                  )
                }
                onNext={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, Math.min(page, totalPages) + 1),
                  )
                }
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Inbox className="size-5" />
            </span>
            <div className="mt-4 text-base font-semibold">
              {emptyMessage(activeFilter, t)}
            </div>
            <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
              {t("notifications.empty.description")}
            </p>
          </div>
        )}
      </Card>
      {deleteDialogTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 backdrop-blur-[1px]"
          role="presentation"
          onClick={() => {
            if (!deletingId && !clearingRead) {
              setDeleteDialogTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-notification-title"
            className="w-full max-w-md rounded-lg border bg-background p-5 text-start shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-notification-title" className="text-base font-bold">
              {deleteDialogTarget.kind === "clear-read"
                ? t("notifications.clearRead.title")
                : t("notifications.delete.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {deleteDialogTarget.kind === "clear-read"
                ? t("notifications.clearRead.message")
                : t("notifications.delete.message")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deletingId !== null || clearingRead}
                onClick={() => setDeleteDialogTarget(null)}
              >
                {t("notifications.action.cancel")}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deletingId !== null || clearingRead}
                onClick={() => {
                  if (deleteDialogTarget.kind === "clear-read") {
                    void clearReadNotifications();
                  } else {
                    void deleteNotification(deleteDialogTarget.notification);
                  }
                }}
              >
                {deletingId !== null || clearingRead ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("notifications.action.delete")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
