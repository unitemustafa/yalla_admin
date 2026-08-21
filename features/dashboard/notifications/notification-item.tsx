"use client";

import {
  BarChart3,
  Bell,
  CheckCheck,
  Circle,
  CircleAlert,
  ExternalLink,
  Handshake,
  Info,
  Loader2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { Badge, Button } from "@/features/dashboard/primitives";
import { cn } from "@/lib/utils";
import {
  notificationDisplayMessage,
  notificationDisplayTitle,
  notificationOrderLabel,
  notificationTypeLabel,
  notificationTypeTone,
  numericOrderId,
  relativeNotificationTime,
} from "./domain";
import type { DashboardNotification } from "./types";

function NotificationTypeIcon({ type }: { type: string }) {
  if (type === "order_review" || type === "new_order_review") {
    return <ShoppingCart className="size-4" />;
  }
  if (type === "order_status_changed" || type === "delivery") {
    return <Truck className="size-4" />;
  }
  if (type === "stock_alert") return <CircleAlert className="size-4" />;
  if (type === "system") return <Bell className="size-4" />;
  if (type === "security") return <ShieldCheck className="size-4" />;
  if (type === "reports") return <BarChart3 className="size-4" />;
  if (type === "new_partner_application") {
    return <Handshake className="size-4" />;
  }
  return <Info className="size-4" />;
}

export function NotificationItem({
  notification,
  marking,
  deleting,
  onOpen,
  onDelete,
}: {
  notification: DashboardNotification;
  marking: boolean;
  deleting: boolean;
  onOpen: (notification: DashboardNotification) => void;
  onDelete: (notification: DashboardNotification) => void;
}) {
  const { t } = useDashboardI18n();
  const orderId = numericOrderId(notification);
  const orderLabel = notificationOrderLabel(notification, t);
  const canDelete = !notification.isBlocking || notification.isResolved;

  return (
    <article
      className={cn(
        "flex cursor-pointer gap-4 px-5 py-4 transition-colors hover:bg-muted/35",
        !notification.isRead && "bg-primary/5",
        marking && "opacity-70",
      )}
      onClick={() => onOpen(notification)}
    >
      <span
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border",
          notification.isRead
            ? "bg-background text-muted-foreground"
            : "border-primary/25 bg-primary/10 text-primary",
        )}
      >
        {marking ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <NotificationTypeIcon type={notification.type} />
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
                {notificationDisplayTitle(notification, t)}
              </h2>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {notificationDisplayMessage(notification, t)}
            </p>
            {orderLabel ? (
              <p className="mt-1 text-xs text-muted-foreground">{orderLabel}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span>{relativeNotificationTime(notification.createdAt)}</span>
            {notification.isRead ? (
              <CheckCheck className="size-3.5 text-emerald-500" />
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={notificationTypeTone(notification.type)}>
              {notificationTypeLabel(notification.type, t)}
            </Badge>
            {notification.isResolved ? (
              <Badge tone="green">{t("notifications.state.resolved")}</Badge>
            ) : notification.isBlocking ? (
              <Badge tone="red">
                {t("notifications.state.requiresAction")}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {orderId ? (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(notification);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <ExternalLink className="size-4" />
                {t("notifications.action.openOrder")}
              </Button>
            ) : null}
            <Button
              disabled={!canDelete || deleting}
              onClick={(event) => {
                event.stopPropagation();
                if (canDelete) onDelete(notification);
              }}
              size="sm"
              title={
                canDelete
                  ? t("notifications.delete.title")
                  : t("notifications.delete.protected")
              }
              type="button"
              variant="outline"
            >
              {deleting ? (
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
}
