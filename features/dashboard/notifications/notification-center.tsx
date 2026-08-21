"use client";

import { Bell, Inbox } from "lucide-react";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { PageLoadError, PageLoadingState } from "@/features/dashboard/load-error-card";
import { Badge, Card, Pagination } from "@/features/dashboard/primitives";
import { cn } from "@/lib/utils";
import {
  formatNotificationMessage,
  notificationEmptyMessage,
} from "./domain";
import { NotificationItem } from "./notification-item";
import type { NotificationsPageController } from "./use-notifications-page";

export function NotificationCenter({
  controller,
}: {
  controller: NotificationsPageController;
}) {
  const { t } = useDashboardI18n();
  const hasNotifications = controller.notifications.length > 0;

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b px-5 py-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Bell className="size-4" />
          </span>
          <div className="text-start">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {t("notifications.center.title")}
              <Badge tone={controller.unreadCount > 0 ? "blue" : "secondary"}>
                {formatNotificationMessage(t("notifications.unreadCount"), {
                  count: controller.unreadCount,
                })}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("notifications.center.description")}
            </div>
          </div>
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          {controller.filters.map((filter) => (
            <button
              key={filter.id}
              aria-pressed={controller.activeFilter === filter.id}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors md:flex-none",
                controller.activeFilter === filter.id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              onClick={() => controller.selectFilter(filter.id)}
              type="button"
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

      {controller.error ? (
        <PageLoadError
          className={hasNotifications ? "min-h-40" : "min-h-80"}
          onRetry={controller.retryLoad}
          retrying={controller.loading}
        />
      ) : null}

      {controller.loading && !controller.error ? (
        <PageLoadingState className="min-h-80" />
      ) : !controller.error && hasNotifications ? (
        <>
          <div className="divide-y">
            {controller.pagedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                deleting={controller.deletingId === notification.id}
                marking={controller.markingId === notification.id}
                notification={notification}
                onDelete={controller.requestNotificationDelete}
                onOpen={(item) => void controller.openNotification(item)}
              />
            ))}
          </div>
          <div className="px-5">
            <Pagination
              nextDisabled={controller.currentPage === controller.totalPages}
              onNext={controller.nextPage}
              onPrevious={controller.previousPage}
              pages={`${controller.currentPage} / ${controller.totalPages}`}
              previousDisabled={controller.currentPage === 1}
              text={formatNotificationMessage(
                t("notifications.pagination.summary"),
                {
                  shown: controller.pagedNotifications.length,
                  total: controller.notifications.length,
                },
              )}
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <div className="mt-4 text-base font-semibold">
            {notificationEmptyMessage(controller.activeFilter, t)}
          </div>
          <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
            {t("notifications.empty.description")}
          </p>
        </div>
      )}
    </Card>
  );
}
