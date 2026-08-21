import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import { navGroups } from "../routes";
import {
  navItemIsActive,
  sidebarChildLabel,
  sidebarGroupLabel,
  sidebarItemLabel,
} from "./navigation-logic";
import type { ExpandedNavigationProps } from "./types";

const soonClass =
  "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";

export function ExpandedNavigationItems({
  activePage,
  direction,
  isGroupOpen,
  toggleGroup,
  onNavigate,
  t,
  pageTitle,
}: ExpandedNavigationProps) {
  return (
    <>
      {navGroups.map((group, groupIndex) => (
        <div
          key={group.label}
          className={cn("pt-2", groupIndex > 0 && "mt-3")}
        >
          <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">
            {sidebarGroupLabel(groupIndex, t)}
          </div>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children?.length);
              const itemLabel = sidebarItemLabel(item, t, pageTitle);
              const active = navItemIsActive(item, activePage);
              const open = isGroupOpen(item.label);
              const disabled = item.soon && !hasChildren;
              const itemBody = (
                <>
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-start">
                    {itemLabel}
                  </span>
                  {hasChildren ? (
                    open ? (
                      <ChevronDown className="size-4 shrink-0" />
                    ) : (
                      <ChevronLeft className="size-4 shrink-0" />
                    )
                  ) : null}
                  {item.soon ? (
                    <span className={soonClass}>{t("common.soon")}</span>
                  ) : null}
                </>
              );

              return (
                <div key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        active &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      {itemBody}
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (disabled) return;
                        if (hasChildren) toggleGroup(item.label);
                      }}
                      aria-expanded={hasChildren ? open : undefined}
                      disabled={disabled}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        active &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                        disabled &&
                          "cursor-not-allowed text-sidebar-foreground/35 opacity-60 hover:bg-transparent hover:text-sidebar-foreground/35",
                      )}
                    >
                      {itemBody}
                    </button>
                  )}
                  {item.children && open ? (
                    <div
                      className={cn(
                        "flex min-w-0 flex-col gap-1 border-sidebar-accent-foreground/30 py-0.5",
                        direction === "rtl"
                          ? "mr-3.5 border-r pr-4"
                          : "ml-3.5 border-l pl-4",
                      )}
                    >
                      {item.children.map((child) =>
                        child.href === "#" ? (
                          <button
                            key={child.label}
                            className="flex h-8 items-center justify-between gap-2 rounded-md px-2 text-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          >
                            <span className="truncate">
                              {sidebarChildLabel(child.page, t, pageTitle)}
                            </span>
                            {child.soon ? (
                              <span className={soonClass}>
                                {t("common.soon")}
                              </span>
                            ) : null}
                          </button>
                        ) : (
                          <Link
                            key={child.label}
                            href={child.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex h-8 items-center justify-between gap-2 rounded-md px-2 text-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              child.page === activePage &&
                                "bg-sidebar-accent text-sidebar-accent-foreground",
                            )}
                          >
                            <span className="truncate">
                              {sidebarChildLabel(child.page, t, pageTitle)}
                            </span>
                            {child.soon ? (
                              <span className={soonClass}>
                                {t("common.soon")}
                              </span>
                            ) : null}
                          </Link>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
