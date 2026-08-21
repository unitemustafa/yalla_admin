"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select } from "radix-ui";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function AppSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "اختر",
  ariaLabel,
  icon,
  className,
  contentClassName,
  disabled,
  dir,
  side = "bottom",
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Select.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        dir={dir}
        className={cn(
          "group inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm outline-none transition hover:border-primary/40 hover:bg-accent/70 hover:text-accent-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 data-[state=open]:border-primary data-[state=open]:bg-accent data-[state=open]:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-muted-foreground transition-colors group-data-[state=open]:text-primary">
              {icon}
            </span>
          ) : null}
          <Select.Value
            className="truncate text-start"
            placeholder={placeholder}
          />
        </span>
        <Select.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          align="start"
          dir={dir}
          position="popper"
          side={side}
          sideOffset={8}
          className={cn(
            "z-50 max-h-75 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border/80 bg-popover p-1 text-popover-foreground shadow-2xl shadow-black/20 outline-none",
            contentClassName,
          )}
        >
          <Select.ScrollUpButton className="flex h-7 items-center justify-center text-muted-foreground">
            <ChevronUp className="size-4" />
          </Select.ScrollUpButton>
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex h-10 cursor-default select-none items-center rounded-md py-2 pe-9 ps-3 text-sm font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute end-3 inline-flex size-4 items-center justify-center">
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="flex h-7 items-center justify-center text-muted-foreground">
            <ChevronDown className="size-4" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function SelectBox({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="size-4 opacity-50" />
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-3 text-sm font-medium leading-none">
      {label}
      {children}
    </label>
  );
}

export function FormCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-lg border">
      <div className="flex min-h-[49px] items-center justify-between rounded-t-lg border-b bg-card px-4 py-3">
        <div className="text-sm font-bold">{title}</div>
        {right}
      </div>
      <div className="flex flex-col gap-4 rounded-b-lg bg-card p-4">
        {children}
      </div>
    </div>
  );
}
