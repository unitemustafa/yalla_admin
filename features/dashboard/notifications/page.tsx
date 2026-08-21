"use client";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { PageTitle } from "@/features/dashboard/primitives";
import { NotificationCenter } from "./notification-center";
import { NotificationDeleteDialog } from "./delete-dialog";
import { NotificationsHeaderActions } from "./header-actions";
import { useNotificationsPage } from "./use-notifications-page";

export function NotificationsPage() {
  const { t } = useDashboardI18n();
  const controller = useNotificationsPage();

  return (
    <div className="px-6 py-6">
      <PageTitle
        actions={<NotificationsHeaderActions controller={controller} />}
        description={t("notifications.description")}
        title={t("page.notifications")}
      />
      <NotificationCenter controller={controller} />
      <NotificationDeleteDialog controller={controller} />
    </div>
  );
}
