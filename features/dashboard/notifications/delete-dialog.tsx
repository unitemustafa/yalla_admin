"use client";

import { Loader2, Trash2 } from "lucide-react";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { Button } from "@/features/dashboard/primitives";
import type { NotificationsPageController } from "./use-notifications-page";

export function NotificationDeleteDialog({
  controller,
}: {
  controller: NotificationsPageController;
}) {
  const { t } = useDashboardI18n();
  const target = controller.deleteDialogTarget;
  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 backdrop-blur-[1px]"
      onClick={controller.closeDeleteDialog}
      role="presentation"
    >
      <div
        aria-labelledby="delete-notification-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border bg-background p-5 text-start shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-base font-bold" id="delete-notification-title">
          {target.kind === "clear-read"
            ? t("notifications.clearRead.title")
            : t("notifications.delete.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {target.kind === "clear-read"
            ? t("notifications.clearRead.message")
            : t("notifications.delete.message")}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            disabled={
              controller.deletingId !== null || controller.clearingRead
            }
            onClick={controller.closeDeleteDialog}
            type="button"
            variant="outline"
          >
            {t("notifications.action.cancel")}
          </Button>
          <Button
            disabled={
              controller.deletingId !== null || controller.clearingRead
            }
            onClick={() => void controller.confirmDelete()}
            type="button"
            variant="danger"
          >
            {controller.deletingId !== null || controller.clearingRead ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("notifications.action.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
