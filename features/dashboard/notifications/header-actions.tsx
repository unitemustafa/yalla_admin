"use client";

import { CheckCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { Button } from "@/features/dashboard/primitives";
import type { NotificationsPageController } from "./use-notifications-page";

export function NotificationsHeaderActions({
  controller,
}: {
  controller: NotificationsPageController;
}) {
  const { t } = useDashboardI18n();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={
          controller.markingAll ||
          controller.deletingId !== null ||
          controller.clearingRead ||
          controller.unreadCount === 0
        }
        onClick={() => void controller.markAllAsRead()}
        type="button"
        variant="outline"
      >
        {controller.markingAll ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCheck className="size-4" />
        )}
        {t("notifications.action.markAllRead")}
      </Button>
      <Button
        disabled={
          controller.clearingRead ||
          controller.deletingId !== null ||
          controller.readCount === 0
        }
        onClick={controller.requestClearRead}
        type="button"
        variant="outline"
      >
        {controller.clearingRead ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        {t("notifications.action.clearRead")}
      </Button>
      <Button
        disabled={controller.loading || controller.refreshing}
        onClick={controller.refresh}
        type="button"
        variant="outline"
      >
        {controller.refreshing || controller.loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {t("notifications.action.refresh")}
      </Button>
    </div>
  );
}
