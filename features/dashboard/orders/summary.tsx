import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CurrencyText } from "../primitives";

export function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString("en-US")}</div>
    </Card>
  );
}

export function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
      <div className="font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}

export function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  const content =
    typeof value === "string" || typeof value === "number" ? (
      <CurrencyText className="tabular-nums">{value}</CurrencyText>
    ) : (
      value
    );
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2 text-sm",
        strong && "text-base font-bold",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      {content}
    </div>
  );
}
