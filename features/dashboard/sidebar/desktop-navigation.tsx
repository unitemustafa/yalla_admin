import Link from "next/link";

import { cn } from "@/lib/utils";

import { navGroups } from "../routes";
import { ExpandedNavigationItems } from "./expanded-navigation";
import {
  navItemIsActive,
  sidebarChildLabel,
  sidebarItemLabel,
} from "./navigation-logic";
import type {
  CollapsedNavigationProps,
  ExpandedNavigationProps,
} from "./types";

const soonClass =
  "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";

type DesktopNavigationProps = ExpandedNavigationProps &
  CollapsedNavigationProps & {
    iconOnly: boolean;
  };

export function DesktopNavigation({
  iconOnly,
  activePage,
  direction,
  isGroupOpen,
  toggleGroup,
  collapsedGroupOpen,
  collapsedNavMenuRef,
  onNavigate,
  onToggleCollapsedGroup,
  showIconTooltip,
  hideIconTooltip,
  t,
  pageTitle,
}: DesktopNavigationProps) {
  return (
    <nav
      className={cn(
        "no-scrollbar hidden h-[calc(100vh-128px)] flex-col justify-between overflow-y-auto overflow-x-hidden pb-4 lg:flex",
        iconOnly ? "px-0" : "px-2",
      )}
    >
      <div>
        {iconOnly ? (
          <CollapsedNavigation
            activePage={activePage}
            direction={direction}
            collapsedGroupOpen={collapsedGroupOpen}
            collapsedNavMenuRef={collapsedNavMenuRef}
            onNavigate={onNavigate}
            onToggleCollapsedGroup={onToggleCollapsedGroup}
            showIconTooltip={showIconTooltip}
            hideIconTooltip={hideIconTooltip}
            t={t}
            pageTitle={pageTitle}
          />
        ) : (
          <ExpandedNavigationItems
            activePage={activePage}
            direction={direction}
            isGroupOpen={isGroupOpen}
            toggleGroup={toggleGroup}
            onNavigate={onNavigate}
            t={t}
            pageTitle={pageTitle}
          />
        )}
      </div>
      <div className="pt-4" />
    </nav>
  );
}

function CollapsedNavigation({
  activePage,
  direction,
  collapsedGroupOpen,
  collapsedNavMenuRef,
  onNavigate,
  onToggleCollapsedGroup,
  showIconTooltip,
  hideIconTooltip,
  t,
  pageTitle,
}: CollapsedNavigationProps) {
  return navGroups.map((group, groupIndex) => (
    <div
      key={group.label}
      className={cn("pt-2", groupIndex > 0 && "mt-3")}
    >
      <div className="flex flex-col gap-1">
        {group.items.map((item) => {
          const Icon = item.icon;
          const hasChildren = Boolean(item.children?.length);
          const itemLabel = sidebarItemLabel(item, t, pageTitle);
          const active = navItemIsActive(item, activePage);
          const disabled = item.soon && !hasChildren;

          return (
            <div key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  onFocus={(event) => showIconTooltip(event, itemLabel)}
                  onMouseEnter={(event) => showIconTooltip(event, itemLabel)}
                  onBlur={() => hideIconTooltip(itemLabel)}
                  onMouseLeave={() => hideIconTooltip(itemLabel)}
                  title={itemLabel}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                </Link>
              ) : (
                <button
                  onClick={(event) => {
                    if (disabled) return;
                    if (hasChildren) {
                      onToggleCollapsedGroup(event, item.label);
                    }
                  }}
                  onFocus={(event) => showIconTooltip(event, itemLabel)}
                  onMouseEnter={(event) => showIconTooltip(event, itemLabel)}
                  onBlur={() => hideIconTooltip(itemLabel)}
                  onMouseLeave={() => hideIconTooltip(itemLabel)}
                  title={itemLabel}
                  aria-expanded={
                    hasChildren
                      ? collapsedGroupOpen?.label === item.label
                      : undefined
                  }
                  aria-haspopup={hasChildren ? "menu" : undefined}
                  disabled={disabled}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                    disabled &&
                      "cursor-not-allowed text-sidebar-foreground/35 opacity-60 hover:bg-transparent hover:text-sidebar-foreground/35",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                </button>
              )}
              {item.children && collapsedGroupOpen?.label === item.label ? (
                <div
                  ref={collapsedNavMenuRef}
                  role="menu"
                  className={cn(
                    "fixed z-50 w-60 -translate-y-1/2 rounded-lg border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-2xl",
                    direction === "rtl" ? "right-18" : "left-18",
                  )}
                  style={{ top: collapsedGroupOpen.top }}
                >
                  <div className="mb-1 rounded-md bg-sidebar-accent/60 px-3 py-2 text-sm font-semibold text-sidebar-accent-foreground">
                    {itemLabel}
                  </div>
                  {item.children.map((child) =>
                    child.href === "#" ? (
                      <button
                        key={child.label}
                        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        role="menuitem"
                        type="button"
                      >
                        <span className="truncate">
                          {sidebarChildLabel(child.page, t, pageTitle)}
                        </span>
                        {child.soon ? (
                          <span className={soonClass}>{t("common.soon")}</span>
                        ) : null}
                      </button>
                    ) : (
                      <Link
                        key={child.label}
                        href={child.href}
                        onClick={onNavigate}
                        role="menuitem"
                        className={cn(
                          "flex min-h-9 items-center justify-between gap-2 rounded-md px-2 py-2 text-start text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          child.page === activePage &&
                            "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="truncate">
                          {sidebarChildLabel(child.page, t, pageTitle)}
                        </span>
                        {child.soon ? (
                          <span className={soonClass}>{t("common.soon")}</span>
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
  ));
}
