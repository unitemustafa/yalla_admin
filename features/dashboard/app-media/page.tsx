"use client";

import { useDashboardI18n } from "@/features/dashboard/i18n";
import { PageTitle } from "@/features/dashboard/primitives";
import { AppMediaCard } from "./app-media-card";

export function AppMediaPage() {
  const { t } = useDashboardI18n();

  return (
    <div className="px-6 py-6">
      <PageTitle
        description="إدارة صور وفيديوهات شاشات البداية وتسجيل الدخول في التطبيقات."
        title={t("page.appMedia")}
      />
      <div className="mt-6">
        <AppMediaCard />
      </div>
    </div>
  );
}
