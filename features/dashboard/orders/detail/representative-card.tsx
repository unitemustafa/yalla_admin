"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Truck, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEgyptPhoneForDisplay } from "../../order-display";
import { AppSelect, Badge, Button, Card } from "../../primitives";
import {
  assignedRepresentativeId,
  representativeHref,
  representativeName,
  representativeNameWithLookup,
} from "../formatters";
import { isAssignmentEligible, isReassignmentEligible } from "../status-domain";
import type { BackendOrder, RepresentativeOption } from "../types";
import type { BackendDashboardUser } from "../../users/api-users";

type RepresentativeCardProps = {
  order: BackendOrder;
  representatives: Map<string, BackendDashboardUser>;
  options: RepresentativeOption[];
  selectedId: string;
  loading: boolean;
  saving: boolean;
  onSelectedIdChange: (value: string) => void;
  onLoadOptions: () => void;
  onAssign: () => void;
  onUnassign: () => void;
};

export function RepresentativeCard(props: RepresentativeCardProps) {
  const [open, setOpen] = useState(false);
  const assignedId = assignedRepresentativeId(props.order);
  const assignmentReady = isAssignmentEligible(props.order);

  return (
    <Card className="p-5 text-sm">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen && assignmentReady && props.options.length === 0) props.onLoadOptions();
        }}
        className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-start font-semibold transition hover:bg-muted/40"
      >
        <span className="inline-flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          الطيار
          <Badge tone={assignedId ? "green" : "secondary"}>
            {assignedId ? representativeNameWithLookup(props.order, props.representatives) : "غير مسند"}
          </Badge>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-3">
          {assignedId ? (
            <div className="grid gap-3">
              <AssignedRepresentativeDetails order={props.order} representatives={props.representatives} />
              {isReassignmentEligible(props.order) ? (
                <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                  {props.options.length > 0 ? <RepresentativeSelect {...props} label="اختيار الطيار الجديد" placeholder="اختر الطيار الجديد" /> : null}
                  <div className="flex flex-wrap justify-end gap-2">
                    <LoadRepresentativesButton loading={props.loading} saving={props.saving} onClick={props.onLoadOptions} />
                    <Button type="button" disabled={!props.selectedId || props.saving} onClick={props.onAssign}>{props.saving ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}تغيير الطيار</Button>
                  </div>
                </div>
              ) : null}
              {isReassignmentEligible(props.order) ? <Button type="button" variant="outline" disabled={props.saving} onClick={props.onUnassign}>{props.saving ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}إلغاء إسناد الطيار</Button> : null}
            </div>
          ) : (
            <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">{assignmentReady ? "لم يتم إسناد الطلب لطيار بعد." : "يجب قبول الطلب قبل إسناده للطيار."}</div>
              {assignmentReady && props.options.length > 0 ? <RepresentativeSelect {...props} label="اختيار الطيار" placeholder="اختر الطيار" /> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <LoadRepresentativesButton loading={props.loading} saving={props.saving} disabled={!assignmentReady} onClick={props.onLoadOptions} />
                <Button type="button" disabled={!assignmentReady || !props.selectedId || props.saving} onClick={props.onAssign}>{props.saving ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}إسناد الطلب</Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function RepresentativeSelect(props: RepresentativeCardProps & { label: string; placeholder: string }) {
  return <AppSelect value={props.selectedId} onValueChange={props.onSelectedIdChange} placeholder={props.placeholder} ariaLabel={props.label} className="h-10 bg-input" options={props.options.map((representative) => ({ value: representative.id, label: representative.phone ? `${representative.name} - ${formatEgyptPhoneForDisplay(representative.phone)}` : representative.name }))} />;
}

function LoadRepresentativesButton({ loading, saving, disabled, onClick }: { loading: boolean; saving: boolean; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" variant="outline" disabled={disabled || loading || saving} onClick={onClick}>{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}تحديث الطيارين</Button>;
}

function AssignedRepresentativeDetails({ order, representatives }: { order: BackendOrder; representatives: Map<string, BackendDashboardUser> }) {
  const representativeId = assignedRepresentativeId(order);
  if (!representativeId) return null;
  const name = representatives.size ? representativeNameWithLookup(order, representatives) : representativeName(order);
  return (
    <Link href={representativeHref(order)} aria-label={`عرض تفاصيل الطيار ${name}`} className="mt-2 inline-grid max-w-full gap-1 rounded-md border bg-muted/15 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
      <span className="truncate">{name}</span>
      <span className="truncate text-start text-xs font-normal text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">{formatEgyptPhoneForDisplay(order.assigned_representative?.phone ?? `#${representativeId}`)}</span>
    </Link>
  );
}
