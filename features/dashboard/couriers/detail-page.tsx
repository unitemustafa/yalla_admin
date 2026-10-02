"use client";

import { Loader2 } from "lucide-react";

import { PageLoadError } from "../load-error-card";
import { Card, Pagination } from "../primitives";
import { CourierDetailSummary } from "./courier-detail-summary";
import { CourierOrdersTable } from "./courier-orders-table";
import { useCourierDetail } from "./use-courier-detail";

export function CourierDetailPage({ courierId }: { courierId: string }) {
  const page = useCourierDetail(courierId);
  if (page.loading && !page.courier) return <div className="flex min-h-96 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  if (page.error || !page.courier) return <div className="px-6 py-8"><PageLoadError onRetry={() => void page.load()} /></div>;
  return (
    <div dir="rtl" className="px-6 py-8" aria-busy={page.loading}>
      <CourierDetailSummary courier={page.courier} totalCount={page.totalCount} activeCount={page.activeCount} deliveredCount={page.deliveredCount} activeOrders={page.activeOrders} deliveredOrders={page.deliveredOrders} deliveredTotal={page.deliveredTotal} onReload={() => void page.load()} />
      <CourierOrdersTable orders={page.visibleOrders} query={page.query} onQueryChange={page.setQuery} />
      <Card className="mt-3 overflow-hidden"><Pagination text={`عرض ${page.visibleOrders.length} من ${page.filteredCount} نتيجة`} pages={`${page.currentPage} / ${page.totalPages}`} previousDisabled={page.currentPage <= 1} nextDisabled={page.currentPage >= page.totalPages} onPrevious={() => page.setCurrentPage((value) => Math.max(1, value - 1))} onNext={() => page.setCurrentPage((value) => Math.min(page.totalPages, value + 1))} /></Card>
    </div>
  );
}
