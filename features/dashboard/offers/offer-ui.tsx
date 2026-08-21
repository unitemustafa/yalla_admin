import type { ChangeEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "green" | "yellow" | "blue" | "red" | "purple" | "orange" | "gray";

export function Textarea({
  placeholder,
  minHeight = "min-h-21",
  dir,
  value,
  onChange,
}: {
  placeholder: string;
  minHeight?: string;
  dir?: "rtl" | "ltr";
  value?: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      dir={dir}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        minHeight,
      )}
    />
  );
}

export function RefBadge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        tone === "green" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
        tone === "yellow" && "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
        tone === "blue" && "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
        tone === "red" && "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
        tone === "purple" && "bg-purple-100 text-purple-700",
        tone === "orange" && "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
        tone === "gray" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function MiniIconButton({
  children,
  tone = "default",
  ariaLabel,
  onClick,
  disabled,
}: {
  children: ReactNode;
  tone?: "default" | "green" | "orange" | "red";
  ariaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-35",
        tone === "green" && "text-green-600",
        tone === "orange" && "text-orange-500",
        tone === "red" && "text-red-500",
        tone === "default" && "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
