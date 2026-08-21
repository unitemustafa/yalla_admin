import {
  notificationsPageSize,
  type DashboardNotification,
  type NotificationFilter,
  type NotificationRecord,
  type NotificationTone,
  type Translate,
} from "./types";

function isNotificationRecord(value: unknown): value is NotificationRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function notificationRecordsFromApi(
  value: unknown,
): NotificationRecord[] {
  const list = Array.isArray(value)
    ? value
    : isNotificationRecord(value) && Array.isArray(value.results)
      ? value.results
      : isNotificationRecord(value) && Array.isArray(value.data)
        ? value.data
        : isNotificationRecord(value) &&
            isNotificationRecord(value.data) &&
            Array.isArray(value.data.results)
          ? value.data.results
          : [];

  return list.filter(isNotificationRecord);
}

export function notificationTextValue(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function notificationBooleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function notificationFromApi(
  record: NotificationRecord,
): DashboardNotification {
  return {
    id: notificationTextValue(record.id),
    audience: notificationTextValue(record.audience, "admin"),
    type: notificationTextValue(record.type, "system"),
    title: notificationTextValue(record.title),
    message: notificationTextValue(record.message),
    orderId: notificationTextValue(record.order_id, ""),
    isRead: notificationBooleanValue(record.is_read),
    isBlocking: notificationBooleanValue(record.is_blocking),
    isResolved: notificationBooleanValue(record.is_resolved),
    createdAt: notificationTextValue(record.created_at, ""),
  };
}

export function notificationsFromApi(value: unknown): DashboardNotification[] {
  return notificationRecordsFromApi(value).map(notificationFromApi);
}

export function numericOrderId(notification: DashboardNotification) {
  return /^\d+$/.test(notification.orderId) ? notification.orderId : "";
}

export function formatNotificationMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function notificationDisplayTitle(
  notification: DashboardNotification,
  t: Translate,
) {
  return notification.type === "new_order_review"
    ? t("notifications.known.newOrderReview.title")
    : notification.title;
}

export function notificationDisplayMessage(
  notification: DashboardNotification,
  t: Translate,
) {
  return notification.type === "new_order_review"
    ? t("notifications.known.newOrderReview.message")
    : notification.message;
}

export function notificationOrderLabel(
  notification: DashboardNotification,
  t: Translate,
) {
  const orderId = numericOrderId(notification);
  return orderId
    ? formatNotificationMessage(t("notifications.known.orderNumber"), {
        id: orderId,
      })
    : "";
}

export function notificationTypeLabel(type: string, t: Translate) {
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

export function notificationTypeTone(type: string): NotificationTone {
  if (type === "order_review" || type === "new_order_review") return "blue";
  if (type === "order_status_changed") return "green";
  if (type === "stock_alert" || type === "security") return "red";
  if (type === "delivery") return "green";
  if (type === "reports") return "default";
  return "secondary";
}

export function relativeNotificationTime(value: string, now = Date.now()) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSeconds = Math.round((date.getTime() - now) / 1000);
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

export function notificationEmptyMessage(
  filter: NotificationFilter,
  t: Translate,
) {
  if (filter === "unread") return t("notifications.empty.unread");
  if (filter === "read") return t("notifications.empty.read");
  return t("notifications.empty.all");
}

export function notificationPage(
  notifications: DashboardNotification[],
  currentPage: number,
) {
  const totalPages = Math.max(
    1,
    Math.ceil(notifications.length / notificationsPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * notificationsPageSize;

  return {
    totalPages,
    safeCurrentPage,
    notifications: notifications.slice(
      pageStartIndex,
      pageStartIndex + notificationsPageSize,
    ),
  };
}

export function clearableReadNotificationIds(
  notifications: DashboardNotification[],
) {
  return new Set(
    notifications
      .filter(
        (notification) =>
          notification.isRead &&
          (!notification.isBlocking || notification.isResolved),
      )
      .map((notification) => notification.id),
  );
}
