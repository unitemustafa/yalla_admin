import { Check, ChevronsUpDown } from "lucide-react";
import type { RefObject } from "react";

import { cn } from "@/lib/utils";

import { DashboardImage } from "../dashboard-image";
import type { IconTooltipHandlers, SidebarDirection } from "./types";

export function SidebarBranchMenu({
  brandName,
  branchName,
  brandLogo,
  direction,
  iconOnly,
  open,
  menuRef,
  onToggle,
  onClose,
  showIconTooltip,
  hideIconTooltip,
}: IconTooltipHandlers & {
  brandName: string;
  branchName: string;
  brandLogo: string;
  direction: SidebarDirection;
  iconOnly: boolean;
  open: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <div
      ref={menuRef}
      className={cn(
        "relative flex h-16 items-center px-2",
        iconOnly && "justify-center",
      )}
    >
      <button
        data-testid="sidebar-branch-toggle"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        onFocus={(event) => showIconTooltip(event, brandName)}
        onMouseEnter={(event) => showIconTooltip(event, brandName)}
        onBlur={() => hideIconTooltip(brandName)}
        onMouseLeave={() => hideIconTooltip(brandName)}
        title={iconOnly ? brandName : undefined}
        className={cn(
          "flex h-12 items-center gap-2 overflow-hidden rounded-md p-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent",
          open && "bg-sidebar-accent text-sidebar-accent-foreground",
          iconOnly ? "w-12 justify-center" : "w-full",
        )}
      >
        <DashboardImage
          alt={brandName}
          src={brandLogo}
          placeholderType="store"
          width={32}
          height={32}
          priority
          unoptimized={brandLogo.startsWith("data:")}
          className="size-7 rounded-lg"
        />
        {!iconOnly ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
              <span
                data-testid="sidebar-brand-name"
                className="block truncate text-start text-[11px] font-semibold"
              >
                {brandName}
              </span>
              <span
                data-testid="sidebar-branch-name"
                className="line-clamp-2 block text-start text-[10px] leading-3 text-sidebar-foreground/80"
              >
                {branchName}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0" />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          data-testid="sidebar-branch-dropdown"
          role="menu"
          className={cn(
            "z-50 rounded-lg border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-2xl",
            iconOnly
              ? cn(
                  "fixed top-17 w-64",
                  direction === "rtl" ? "right-2" : "left-2",
                )
              : "absolute left-2 right-2 top-16",
          )}
        >
          {[{ id: "current-brand", label: branchName }].map((branch) => (
            <button
              key={branch.id}
              type="button"
              role="menuitemradio"
              aria-checked
              onClick={onClose}
              className="flex min-h-9 w-full items-center gap-2 rounded-md bg-sidebar-accent px-2 py-2 text-sm font-medium text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <span className="min-w-0 flex-1 truncate text-start">
                {branch.label}
              </span>
              <Check className="size-4 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
