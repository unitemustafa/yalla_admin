"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

import { useDashboardCustomization } from "./customization";
import { useDashboardI18n } from "./i18n";
import { useDashboardNotifications } from "./notifications-context";
import { SidebarBranchMenu } from "./sidebar/branch-menu";
import { DesktopNavigation } from "./sidebar/desktop-navigation";
import { MobileNavigation } from "./sidebar/mobile-navigation";
import { sidebarUserName } from "./sidebar/navigation-logic";
import type { FloatingNavState } from "./sidebar/types";
import { useSidebarNavigation } from "./sidebar/use-sidebar-navigation";
import { useSidebarTheme } from "./sidebar/use-sidebar-theme";
import { SidebarUserMenu } from "./sidebar/user-menu";
import { dashboardBrandLogos } from "./shared/branding";
import type { PageKey } from "./types";
import { neutralDashboardUserName } from "./users/types";

export function Sidebar({
  activePage,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: {
  activePage: PageKey;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}) {
  const { logout: endSession, user } = useAuth();
  const { isGroupOpen, toggleGroup } = useSidebarNavigation(activePage);
  const { direction, language, pageTitle, t } = useDashboardI18n();
  const { unreadCount } = useDashboardNotifications();
  const { customization } = useDashboardCustomization();
  const { theme, resolvedTheme, selectTheme } = useSidebarTheme();
  const iconOnly = collapsed && !mobileOpen;
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const collapsedNavMenuRef = useRef<HTMLDivElement>(null);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsedGroupOpen, setCollapsedGroupOpen] =
    useState<FloatingNavState | null>(null);
  const [iconTooltip, setIconTooltip] = useState<FloatingNavState | null>(null);
  const brandName = customization.brandName || t("brand.name");
  const branchName = customization.branchName || t("branch.default");
  const userFullName = sidebarUserName(user, neutralDashboardUserName);
  const userAvatar = user?.avatar_url?.trim();
  const brandLogo =
    customization.logoDataUrl || dashboardBrandLogos[resolvedTheme];

  useEffect(() => {
    if (!branchMenuOpen && !profileMenuOpen && !collapsedGroupOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setBranchMenuOpen(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }

      if (
        collapsedNavMenuRef.current &&
        !collapsedNavMenuRef.current.contains(target)
      ) {
        setCollapsedGroupOpen(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBranchMenuOpen(false);
        setProfileMenuOpen(false);
        setCollapsedGroupOpen(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [branchMenuOpen, collapsedGroupOpen, profileMenuOpen]);

  async function logout() {
    setProfileMenuOpen(false);
    onCloseMobile();

    await endSession();
    window.location.href = "/login";
  }

  function floatingTop(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }

  function showIconTooltip(
    event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>,
    label: string,
  ) {
    if (!iconOnly || collapsedGroupOpen?.label === label) {
      return;
    }

    setIconTooltip({ label, top: floatingTop(event.currentTarget) });
  }

  function hideIconTooltip(label?: string) {
    setIconTooltip((current) =>
      !label || current?.label === label ? null : current,
    );
  }

  function toggleCollapsedGroup(
    event: React.MouseEvent<HTMLElement>,
    label: string,
  ) {
    const top = floatingTop(event.currentTarget);

    setIconTooltip(null);
    setBranchMenuOpen(false);
    setProfileMenuOpen(false);
    setCollapsedGroupOpen((current) =>
      current?.label === label ? null : { label, top },
    );
  }

  function closeNavigation() {
    setCollapsedGroupOpen(null);
    onCloseMobile();
  }

  function toggleBranchMenu() {
    setBranchMenuOpen((open) => !open);
    setProfileMenuOpen(false);
    setCollapsedGroupOpen(null);
    setIconTooltip(null);
  }

  function toggleProfileMenu() {
    setProfileMenuOpen((open) => !open);
    setBranchMenuOpen(false);
    setCollapsedGroupOpen(null);
    setIconTooltip(null);
  }

  function closeProfileMenu() {
    setProfileMenuOpen(false);
    onCloseMobile();
  }

  const navigationProps = {
    activePage,
    direction,
    isGroupOpen,
    toggleGroup,
    onNavigate: closeNavigation,
    t,
    pageTitle,
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 z-30 overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out lg:z-20 lg:block",
        direction === "rtl" ? "right-0 border-l" : "left-0 border-r",
        mobileOpen ? "block w-64" : "hidden",
        !mobileOpen && (collapsed ? "lg:w-16" : "lg:w-64"),
      )}
    >
      <SidebarBranchMenu
        brandName={brandName}
        branchName={branchName}
        brandLogo={brandLogo}
        direction={direction}
        iconOnly={iconOnly}
        open={branchMenuOpen}
        menuRef={branchMenuRef}
        onToggle={toggleBranchMenu}
        onClose={() => setBranchMenuOpen(false)}
        showIconTooltip={showIconTooltip}
        hideIconTooltip={hideIconTooltip}
      />

      <DesktopNavigation
        {...navigationProps}
        iconOnly={iconOnly}
        collapsedGroupOpen={collapsedGroupOpen}
        collapsedNavMenuRef={collapsedNavMenuRef}
        onToggleCollapsedGroup={toggleCollapsedGroup}
        showIconTooltip={showIconTooltip}
        hideIconTooltip={hideIconTooltip}
      />
      {mobileOpen ? <MobileNavigation {...navigationProps} /> : null}

      {iconOnly && iconTooltip ? (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-50 -translate-y-1/2 rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-xs font-semibold text-sidebar-foreground shadow-xl",
            direction === "rtl" ? "right-18" : "left-18",
          )}
          style={{ top: iconTooltip.top }}
        >
          {iconTooltip.label}
        </div>
      ) : null}

      <SidebarUserMenu
        userFullName={userFullName}
        userAvatar={userAvatar}
        unreadCount={unreadCount}
        theme={theme}
        language={language}
        direction={direction}
        iconOnly={iconOnly}
        open={profileMenuOpen}
        menuRef={profileMenuRef}
        onToggle={toggleProfileMenu}
        onNavigate={closeProfileMenu}
        onLogout={logout}
        onSelectTheme={selectTheme}
        showIconTooltip={showIconTooltip}
        hideIconTooltip={hideIconTooltip}
        t={t}
      />

      <button
        onClick={onToggleCollapsed}
        className={cn(
          "absolute top-0 hidden h-full w-0.5 cursor-ew-resize border-x bg-transparent lg:block",
          direction === "rtl" ? "-left-2" : "-right-2",
        )}
        aria-label={t("common.toggleSidebar")}
      />
    </aside>
  );
}
