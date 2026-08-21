import { Check, PackageCheck, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge, Card } from "../../primitives";
import { orderRouteStatuses, statusLabels } from "../constants";
import { dateTime, statusTone } from "../formatters";
import {
  isExceptionalTerminalStatus,
  orderHistoryStatuses,
  orderRouteIndex,
  orderTimelineEvents,
  routeActiveStatus,
} from "../status-domain";
import type { BackendOrder } from "../types";

export function OrderRouteCard({ order }: { order: BackendOrder }) {
  const activeStatus = routeActiveStatus(order);
  const activeIndex = orderRouteIndex(activeStatus);
  const reachedStatuses = orderHistoryStatuses(order);
  const hasExceptionalFinal = isExceptionalTerminalStatus(order.status);
  const routeStatuses = hasExceptionalFinal ? [...orderRouteStatuses, order.status] : orderRouteStatuses;
  const timelineEvents = orderTimelineEvents(order);
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-muted/25 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"><PackageCheck className="size-5" /></span>
          <div><div className="font-semibold">مسار الطلب</div><div className="mt-1 text-xs text-muted-foreground">آخر تحديث {dateTime(order.updated_at ?? order.created_at)}</div></div>
        </div>
        <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
      </div>
      <ol className="grid gap-3 px-5 py-5">
        {timelineEvents.map((event, index) => (
          <li key={`${event.key}-${event.time}-${index}`} className="flex items-start gap-3 text-sm">
            <span className={cn("mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2", event.active ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card text-muted-foreground")}><Check className="size-3.5" /></span>
            <span className="min-w-0">
              <span className={cn("block font-semibold", event.active && "text-emerald-600 dark:text-emerald-300")}>{event.label}</span>
              <time className="mt-1 block text-xs text-muted-foreground">{dateTime(event.time)}</time>
              {event.detail ? <span className="mt-1 block text-xs text-muted-foreground">{event.cancelled && order.rejection_reason?.trim() ? `سبب الإلغاء: ${order.rejection_reason.trim()}` : event.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <ol className={cn("grid gap-y-5 px-5 py-6 md:gap-y-0", hasExceptionalFinal ? "md:grid-cols-6" : "md:grid-cols-5")}>
        {routeStatuses.map((status, index) => {
          const exceptionStep = hasExceptionalFinal && status === order.status && index === routeStatuses.length - 1;
          const reached = exceptionStep || reachedStatuses.has(status) || (!exceptionStep && index <= activeIndex);
          const active = exceptionStep || (!hasExceptionalFinal && status === activeStatus);
          const connectorReached = !exceptionStep && index < activeIndex;
          return (
            <li key={status} className="relative flex min-w-0 items-start gap-3 text-sm md:flex-col md:items-center md:gap-3 md:text-center">
              {index < routeStatuses.length - 1 ? <span aria-hidden="true" className={cn("absolute start-[15px] top-8 z-0 h-[calc(100%+1.25rem)] w-0.5 transition-colors md:start-auto md:right-1/2 md:top-4 md:h-0.5 md:w-full", connectorReached ? "bg-emerald-500" : exceptionStep ? "bg-red-500" : "bg-border")} /> : null}
              <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all", exceptionStep ? "border-red-500 bg-red-500 text-white shadow-sm shadow-red-500/25" : reached ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25" : "border-border bg-card text-muted-foreground", active && (exceptionStep ? "ring-4 ring-red-500/10" : "ring-4 ring-emerald-500/10"))}>
                {exceptionStep ? <XCircle className="size-4" /> : reached ? <Check className="size-4 stroke-[3]" /> : null}
              </span>
              <div className="min-w-0 text-right md:text-center">
                <div className={cn("font-semibold transition-colors", exceptionStep ? "text-red-600 dark:text-red-300" : reached ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground")}>{statusLabels[status]}</div>
                <time className={cn("mt-0.5 block text-xs", exceptionStep ? "text-red-600/75 dark:text-red-300/75" : reached ? "text-emerald-600/75 dark:text-emerald-300/75" : "text-muted-foreground/60")}>{reached ? dateTime(order.updated_at ?? order.created_at) : "في الانتظار"}</time>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
