import { CheckCircle2, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "../primitives";
import {
  representativeAvailability,
  representativeCity,
  representativeId,
  representativeLoad,
  representativeName,
  representativePhone,
} from "./domain";
import type { ApiRecord } from "./types";

export function RepresentativeOptionCard({ representative, selected, disabled, onSelect }: { representative: ApiRecord; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const availability = representativeAvailability(representative);
  return (
    <button type="button" disabled={disabled} onClick={onSelect} className={cn("grid w-full gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/40 hover:bg-muted/20 disabled:cursor-not-allowed disabled:opacity-60", selected && "border-primary bg-primary/10 ring-2 ring-primary/20")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="size-4" /></span><span className="truncate font-bold">{representativeName(representative)}</span><Badge tone={availability.tone}>{availability.label}</Badge></div>
          <div className="mt-2 text-xs text-muted-foreground" dir="ltr">{representativePhone(representative)}</div>
        </div>
        {selected ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : null}
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <span className="rounded-md bg-muted px-2 py-1">ID: {representativeId(representative) || "-"}</span>
        <span className="rounded-md bg-muted px-2 py-1">المدينة: {representativeCity(representative)}</span>
        <span className="rounded-md bg-muted px-2 py-1">الطلبات: {representativeLoad(representative)}</span>
      </div>
    </button>
  );
}
