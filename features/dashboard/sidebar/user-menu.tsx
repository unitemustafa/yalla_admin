import Link from "next/link";
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import type { RefObject } from "react";

import { cn } from "@/lib/utils";

import { DashboardImage } from "../dashboard-image";
import type { ThemeChoice } from "./theme-domain";
import { SidebarThemeMenu } from "./theme-menu";
import type { IconTooltipHandlers, SidebarDirection } from "./types";

export function SidebarUserMenu({
  userFullName,
  userAvatar,
  unreadCount,
  theme,
  language,
  direction,
  iconOnly,
  open,
  menuRef,
  onToggle,
  onNavigate,
  onLogout,
  onSelectTheme,
  showIconTooltip,
  hideIconTooltip,
  t,
}: IconTooltipHandlers & {
  userFullName: string;
  userAvatar?: string;
  unreadCount: number;
  theme: ThemeChoice;
  language: "ar" | "en";
  direction: SidebarDirection;
  iconOnly: boolean;
  open: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onNavigate: () => void;
  onLogout: () => Promise<void>;
  onSelectTheme: (theme: ThemeChoice) => void;
  t: (key: string) => string;
}) {
  return (
    <div
      ref={menuRef}
      className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-center bg-sidebar px-2"
    >
      {open ? (
        <div
          className={cn(
            "z-50 rounded-lg border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-2xl",
            iconOnly
              ? cn(
                  "fixed bottom-17 w-64",
                  direction === "rtl" ? "right-2" : "left-2",
                )
              : "absolute bottom-16 left-2 right-2",
          )}
        >
          <div className="mb-1 flex items-center gap-3 rounded-md bg-sidebar-accent/60 px-3 py-2">
            <DashboardImage
              alt={userFullName}
              src={userAvatar}
              placeholderType="user"
              width={36}
              height={36}
              className="size-9 rounded-lg"
            />
            <span className="min-w-0 flex-1 text-start">
              <span className="block truncate text-sm font-semibold">
                {userFullName}
              </span>
            </span>
          </div>

          <MenuLink href="/account" onNavigate={onNavigate} icon={User}>
            {t("profile.account")}
          </MenuLink>
          <MenuLink href="/settings" onNavigate={onNavigate} icon={Settings}>
            {t("profile.settings")}
          </MenuLink>
          <MenuLink
            href="/notifications"
            onNavigate={onNavigate}
            icon={Bell}
            suffix={
              unreadCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null
            }
          >
            {t("profile.notifications")}
          </MenuLink>

          <div className="my-1 h-px bg-sidebar-border" />
          <SidebarThemeMenu
            theme={theme}
            language={language}
            onSelectTheme={onSelectTheme}
            t={t}
          />
          <div className="my-1 h-px bg-sidebar-border" />

          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-300"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-start">
              {t("profile.logout")}
            </span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        onFocus={(event) => showIconTooltip(event, userFullName)}
        onMouseEnter={(event) => showIconTooltip(event, userFullName)}
        onBlur={() => hideIconTooltip(userFullName)}
        onMouseLeave={() => hideIconTooltip(userFullName)}
        title={iconOnly ? userFullName : undefined}
        className={cn(
          "flex h-12 items-center gap-2 rounded-md p-2 text-start transition-colors hover:bg-sidebar-accent",
          open && "bg-sidebar-accent text-sidebar-accent-foreground",
          iconOnly ? "w-12 justify-center" : "w-full",
        )}
      >
        <DashboardImage
          alt={userFullName}
          src={userAvatar}
          placeholderType="user"
          width={32}
          height={32}
          className="size-8 rounded-lg"
        />
        {!iconOnly ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col items-start justify-start text-sm leading-tight">
              <span className="block truncate font-medium">{userFullName}</span>
              <span className="block truncate text-xs">
                {t("role.manager")}
              </span>
            </span>
            <ChevronsUpDown className="size-4" />
          </>
        ) : null}
      </button>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  suffix,
  onNavigate,
}: {
  href: string;
  icon: typeof User;
  children: React.ReactNode;
  suffix?: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-start">{children}</span>
      {suffix}
    </Link>
  );
}
