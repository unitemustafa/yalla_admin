"use client";

import Link from "next/link";
import { ChevronRight, Copy, Loader2 } from "lucide-react";

import { formatEgyptPhoneForDisplay } from "../../order-display";
import { PageLoadError } from "../../load-error-card";
import { Button } from "../../primitives";
import { customerHref, customerName, dateTime, marketName, orderNumber } from "../formatters";
import { FinancialSummaryCard } from "./financial-summary-card";
import { MarketSectionsCard } from "./market-sections-card";
import { OrderDetailSidebar } from "./order-detail-sidebar";
import { OrderRouteCard } from "./order-route-card";
import { useOrderDetail } from "./use-order-detail";

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const state = useOrderDetail(orderId);
  if (state.loading) {
    return <div className="flex min-h-96 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }
  if (state.error || !state.order) {
    return <div className="px-6 py-8"><PageLoadError onRetry={() => void state.loadOrder()} /></div>;
  }
  const order = state.order;
  return (
    <div dir="rtl" className="px-6 py-8">
      <div className="flex min-h-14 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold leading-8 tracking-normal">طلب <span dir="ltr" className="inline-block text-primary">{orderNumber(order)}</span></h1>
          <div className="mt-2 grid gap-1 text-sm leading-5">
            <Link href={customerHref(order)} className="w-fit max-w-full truncate font-semibold text-primary hover:underline">{customerName(order)}</Link>
            <span className="w-fit max-w-full truncate text-start text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">{formatEgyptPhoneForDisplay(order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`)}</span>
            <span className="text-xs text-muted-foreground">{marketName(order)} - {dateTime(order.created_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void state.copyOrder()}><Copy className="size-4" />نسخ بيانات الطلب</Button>
          <Link href="/orders" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"><ChevronRight className="size-4" />الرجوع للطلبات</Link>
        </div>
      </div>
      <OrderRouteCard order={order} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <MarketSectionsCard order={order} />
          <FinancialSummaryCard order={order} />
        </div>
        <OrderDetailSidebar state={state} />
      </div>
    </div>
  );
}
