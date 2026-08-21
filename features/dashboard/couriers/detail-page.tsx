"use client";

import { Loader2 } from "lucide-react";

import { PageLoadError } from "../load-error-card";
import { CourierDetailSummary } from "./courier-detail-summary";
import { CourierOrdersTable } from "./courier-orders-table";
import { useCourierDetail } from "./use-courier-detail";

export function CourierDetailPage({ courierId }: { courierId: string }) {
  const page = useCourierDetail(courierId);
  if (page.loading) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (page.error || !page.courier) return <div className="px-6 py-8"><PageLoadError onRetry={() => void page.load()} /></div>;
  return (
    <div dir="rtl" className="px-6 py-8">
      <CourierDetailSummary courier={page.courier} orders={page.orders} activeOrders={page.activeOrders} deliveredOrders={page.deliveredOrders} deliveredTotal={page.deliveredTotal} onReload={() => void page.load()} />
      <CourierOrdersTable orders={page.visibleOrders} query={page.query} onQueryChange={page.setQuery} />
    </div>
  );
}
