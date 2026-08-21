"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function Button({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        variant === "outline" &&
          "border border-border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "danger" &&
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        size === "icon" && "size-9",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked = true,
  disabled,
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const controlled = onCheckedChange !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = useState(checked);
  const isChecked = controlled ? checked : uncontrolledChecked;

  function toggleSwitch(event: MouseEvent<HTMLButtonElement>) {
    props.onClick?.(event);

    if (event.defaultPrevented || disabled) {
      return;
    }

    event.stopPropagation();

    const nextChecked = !isChecked;
    if (!controlled) {
      setUncontrolledChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
  }

  return (
    <button
      type="button"
      aria-checked={isChecked}
      disabled={disabled}
      role="switch"
      className={cn(
        "inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isChecked ? "bg-primary" : "bg-muted-foreground/30",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
      onClick={toggleSwitch}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow transition-transform",
          isChecked && "-translate-x-4",
        )}
      />
    </button>
  );
}
