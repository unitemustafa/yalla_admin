"use client";

import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";

import { PageLoadError, PageLoadingState } from "../../load-error-card";
import { AppSelect, Button, Card, Input, PageTitle, Pagination } from "../../primitives";
import { statusLabels, statusOptions } from "../constants";
import type { BackendOrderStatus } from "../types";
import { Metric } from "../summary";
import { OrderListCard } from "./order-list-card";
import { useOrdersList } from "./use-orders-list";

export function OrdersListPage() {
  const state = useOrdersList();
  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle
        title="الطلبات"
        description="عرض وإدارة كل الطلبات الواردة من يلا ماركت والداشبورد"
        size="compact"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void state.loadOrders(state.status)}>
              <RefreshCw className="size-4" />
              تحديث
            </Button>
            <Link href="/orders/create" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
              <Plus className="size-4" />
              إنشاء طلب
            </Link>
          </>
        }
      />
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric title="إجمالي الطلبات" value={state.metrics.total} />
        <Metric title="جاهزة للإسناد" value={state.metrics.assignmentReady} />
        <Metric title="مسندة لطيار" value={state.metrics.assigned} />
        <Metric title="تم التسليم" value={state.metrics.delivered} />
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={state.query} onChange={(event) => { state.setQuery(event.target.value); state.setCurrentPage(1); }} className="h-12 ps-9" placeholder="بحث برقم الطلب أو العميل أو المحل..." />
          </label>
          <AppSelect
            value={state.status}
            onValueChange={(value) => {
              const status = value as "all" | BackendOrderStatus;
              state.setStatus(status);
              state.setCurrentPage(1);
              void state.loadOrders(status);
            }}
            options={[{ value: "all", label: "كل الحالات" }, ...statusOptions.map((value) => ({ value, label: statusLabels[value] }))]}
            ariaLabel="فلترة حالة الطلب"
            dir="rtl"
            className="h-12"
          />
          <AppSelect
            value={state.deliveryType}
            onValueChange={(value) => {
              state.setDeliveryType(value as "all" | "fixed_area" | "delivery");
              state.setCurrentPage(1);
            }}
            options={[{ value: "all", label: "كل أنواع التوصيل" }, { value: "fixed_area", label: "مدينة ثابتة" }, { value: "delivery", label: "دليفري" }]}
            ariaLabel="فلترة نوع التوصيل"
            dir="rtl"
            className="h-12"
          />
        </div>
        {state.loading ? (
          <PageLoadingState className="min-h-64" />
        ) : state.error ? (
          <PageLoadError onRetry={() => void state.loadOrders(state.status)} />
        ) : state.visibleOrdersCount === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">لا توجد طلبات مطابقة.</div>
        ) : (
          <div className="grid gap-3 p-4">
            {state.pagedOrders.map((order, index) => (
              <OrderListCard key={order.id} order={order} index={state.pageStartIndex + index + 1} />
            ))}
            <div className="overflow-hidden rounded-md border bg-card shadow-sm">
              <Pagination
                text={`عرض ${state.pagedOrders.length} من ${state.visibleOrdersCount} نتيجة`}
                pages={`${state.safeCurrentPage} / ${state.totalPages}`}
                previousDisabled={state.safeCurrentPage === 1}
                nextDisabled={state.safeCurrentPage === state.totalPages}
                onPrevious={() => state.setCurrentPage((page) => Math.max(1, Math.min(page, state.totalPages) - 1))}
                onNext={() => state.setCurrentPage((page) => Math.min(state.totalPages, Math.min(page, state.totalPages) + 1))}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
