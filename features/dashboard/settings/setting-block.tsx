"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/features/dashboard/primitives";
import { cn } from "@/lib/utils";

export function SettingBlock({
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentVisible = !collapsible || open;

  return (
    <Card className="p-5">
      <button
        aria-expanded={contentVisible}
        className={cn(
          "flex w-full items-center gap-2 text-start text-base font-bold",
          contentVisible && "mb-4",
          !collapsible && "pointer-events-none",
        )}
        disabled={!collapsible}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="flex-1">{title}</span>
        {collapsible ? (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        ) : null}
      </button>
      {contentVisible ? children : null}
    </Card>
  );
}
