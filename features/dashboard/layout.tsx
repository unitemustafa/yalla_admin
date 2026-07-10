"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DashboardAutoTranslate } from "./auto-translate";
import { useDashboardFrame } from "./hooks";
import {
  DashboardI18nProvider,
  useDashboardI18n,
} from "./i18n";
import { useEffect } from "react";

import { useDashboardCustomization } from "./customization";
import { loadDashboardSettings } from "./dashboard-settings-api";
import { DashboardOfflineBanner } from "./offline-banner";
import { SnackbarProvider } from "./snackbar";
import { AdminOrderReviewBlocker } from "./admin-order-review-blocker";
import { DashboardNotificationsProvider } from "./notifications-context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-provider";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardI18nProvider>
      <SnackbarProvider>
        <DashboardNotificationsProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DashboardNotificationsProvider>
      </SnackbarProvider>
    </DashboardI18nProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    activePage,
    collapsed,
    mobileNavOpen,
    closeMobileNav,
    openMobileNav,
    toggleCollapsed,
  } = useDashboardFrame();
  const { breadcrumbsForPage, direction, t } = useDashboardI18n();
  const { setCustomization } = useDashboardCustomization();
  const breadcrumbs = breadcrumbsForPage(activePage);

  return (
    <DashboardAutoTranslate>
      <div className="min-h-screen w-full bg-background text-foreground">
        <DashboardSettingsBootstrapper setCustomization={setCustomization} />
        <DashboardOfflineBanner />
        <AdminOrderReviewBlocker />
        {mobileNavOpen ? (
          <button
            className="fixed inset-0 z-20 bg-foreground/30 backdrop-blur-[1px] lg:hidden"
            aria-label={t("common.closeSidebar")}
            onClick={closeMobileNav}
          />
        ) : null}
        <Sidebar
          activePage={activePage}
          collapsed={collapsed}
          mobileOpen={mobileNavOpen}
          onCloseMobile={closeMobileNav}
          onToggleCollapsed={toggleCollapsed}
        />
        <div
          className={cn(
            "min-h-screen transition-[padding] duration-300 ease-in-out",
            direction === "rtl"
              ? collapsed
                ? "lg:pr-16"
                : "lg:pr-[256px]"
              : collapsed
                ? "lg:pl-16"
                : "lg:pl-[256px]",
          )}
        >
          <Topbar
            breadcrumbs={breadcrumbs}
            collapsed={collapsed}
            onOpenMobile={openMobileNav}
            onToggleCollapsed={toggleCollapsed}
          />
          <main className="min-h-[calc(100vh-64px)] bg-background">
            {children}
          </main>
        </div>
      </div>
    </DashboardAutoTranslate>
  );
}

function DashboardSettingsBootstrapper({
  setCustomization,
}: {
  setCustomization: ReturnType<typeof useDashboardCustomization>["setCustomization"];
}) {
  const { apiFetch, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;

    void loadDashboardSettings(apiFetch)
      .then((serverCustomization) => {
        if (active) setCustomization(serverCustomization);
      })
      .catch(() => {
        // Keep the most recently saved local customization if the server is unavailable.
      });

    return () => {
      active = false;
    };
  }, [apiFetch, setCustomization, status]);

  return null;
}
