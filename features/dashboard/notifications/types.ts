export const notificationsPageSize = 10;
export const notificationsPollingIntervalMs = 30_000;

export type NotificationFilter = "all" | "unread" | "read";
export type NotificationRecord = Record<string, unknown>;
export type NotificationTone =
  | "default"
  | "blue"
  | "green"
  | "red"
  | "secondary";

export type DashboardNotification = {
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

export type DeleteDialogTarget =
  | { kind: "single"; notification: DashboardNotification }
  | { kind: "clear-read" };

export type NotificationFilterOption = {
  id: NotificationFilter;
  label: string;
  count?: number;
};

export type Translate = (key: string) => string;
