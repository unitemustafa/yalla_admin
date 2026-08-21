"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";

import { PageLoadError, PageLoadingState } from "../load-error-card";
import { AppSelect, Button, Card, PageTitle } from "../primitives";
import { AssignmentDialog, PasswordDialog } from "./dialogs";
import { CouriersTable } from "./couriers-table";
import { useCouriersPage } from "./use-couriers-page";

export function CouriersPage() {
  const page = useCouriersPage();
  return (
    <div className="px-6 py-8">
      <PageTitle title="المندوبين" description="حسابات المندوبين وإسناد طلبات يلا هوم" size="compact" actions={<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => void page.load()} className="h-9 px-4 text-sm"><RefreshCw className="size-4" />تحديث</Button><Link href="/delivery/couriers/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"><Plus className="size-4" />إضافة مندوب</Link></div>} />
      <Card className="mt-6 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="text-2xl font-extrabold">{page.filteredCouriers.length}</div><div className="text-xs font-bold text-muted-foreground">{page.focusedCourier ? "تفاصيل المندوب المحدد من الطلب" : page.areaFilter === "all" ? "إجمالي المندوبين" : `مندوبو مدينة ${page.cities.find((city) => String(city.id) === page.areaFilter)?.name || ""}`}</div></div><div className="w-full md:w-90"><AppSelect value={page.areaFilter} onValueChange={(value) => { page.setAreaFilter(value); page.setCurrentPage(1); }} options={[{ value: "all", label: "جميع المدن" }, ...page.cities.map((city) => ({ value: String(city.id), label: city.name }))]} className="h-11 border-border/70 bg-background" contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl" ariaLabel="فلتر المدينة" /></div></div></Card>

      {page.loading ? <PageLoadingState className="min-h-64" /> : page.error ? <PageLoadError onRetry={() => void page.load()} /> : <CouriersTable couriers={page.pagedCouriers} orders={page.orders} startIndex={page.pageStartIndex} currentPage={page.currentPage} totalPages={page.totalPages} totalCount={page.filteredCouriers.length} assignableCount={page.assignableCount} busy={page.busy} onPageChange={page.setCurrentPage} onAssign={page.setAssigning} onPassword={page.setPasswordCourier} onAvailabilityChange={(courier, checked) => void page.handleAvailabilityChange(courier, checked)} />}

      {page.passwordCourier ? <PasswordDialog courier={page.passwordCourier} busy={page.busy === `password-${page.passwordCourier.id}`} onClose={() => page.setPasswordCourier(null)} onConfirm={(password) => void page.confirmPassword(password)} /> : null}
      {page.assigning ? <AssignmentDialog courier={page.assigning} orders={page.filteredReadyOrders} selectedOrder={page.selectedOrder} search={page.orderSearch} busy={page.busy !== null} onSelectedOrderChange={page.setSelectedOrder} onSearchChange={page.setOrderSearch} onConfirm={() => void page.assign()} /> : null}
    </div>
  );
}
