"use client";

import Link from "next/link";
import { Package, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Card, PageTitle, Pagination } from "../../primitives";
import { DeleteDialog, MetricCards } from "./items-components";
import { ItemsFilters } from "./items-filters";
import { ItemsMobileCards } from "./items-mobile-cards";
import { ItemsTable } from "./items-table";
import { ProductDetailDialog } from "./product-detail-dialog";
import { useProductsList } from "./use-products-list";

export function ItemsPage() {
  const list = useProductsList();

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        title="المنتجات"
        description="إدارة منتجات المنيو في كل الفروع"
        size="compact"
        className="rounded-lg border bg-card p-4 shadow-sm"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={list.reload}
              disabled={list.loading}
            >
              <RotateCcw className={cn("size-4", list.loading && "animate-spin")} />
              تحديث
            </Button>
            <Link
                href="/items/create"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 sm:w-33"
              >
                <Plus className="size-4" />
                منتج جديد
              </Link>
          </div>
        }
      />

      <MetricCards rows={list.visibleRows} />

      <div className="mt-6">
        {list.showEmptyState ? (
          <Card className="flex min-h-70 items-center justify-center bg-card shadow">
            <div className="mx-auto flex w-full max-w-130 flex-col items-center px-6 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Package className="size-8" />
              </div>
              <h2 className="mt-4 text-xl font-semibold leading-7">
                لا توجد منتجات حتى الآن
              </h2>
              <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
                سيظهر هنا أول منتج تضيفه للعملاء في تطبيق يلا ماركت.
              </p>
                <div className="mt-4 flex w-full justify-center sm:w-auto">
                  <Link
                    href="/items/create"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
                  >
                    <Plus className="size-4" />
                    إضافة أول منتج
                  </Link>
                </div>
            </div>
          </Card>
        ) : (
          <>
            {list.error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                {list.error}
              </div>
            ) : null}
            <ItemsFilters
              filters={list.filters}
              markets={list.markets}
              rows={list.rows}
              onSearchChange={list.changeSearch}
              onApply={list.applyAdvancedFilters}
              onClear={list.clearAdvancedFilters}
            />
            {list.loading ? (
              <div className="mt-4 flex h-16 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
                جاري تحميل المنتجات...
              </div>
            ) : list.visibleRows.length ? (
              <ItemsMobileCards
                rows={list.pagedRows}
                selectedRows={list.selectedRows}
                onToggleSelected={list.toggleSelectedRow}
                onToggleActive={list.toggleActive}
                onView={list.openProductDetail}
                onDelete={list.setDeleteId}
              />
            ) : (
              <div className="mt-4 flex h-16 items-center justify-center rounded-md border text-sm text-muted-foreground lg:hidden">
                لا توجد نتائج مطابقة.
              </div>
            )}
            <ItemsTable
              loading={list.loading}
              onDelete={list.setDeleteId}
              onToggleActive={list.toggleActive}
              onView={list.openProductDetail}
              pageStartIndex={list.pageStartIndex}
              rows={list.pagedRows}
              visibleCount={list.visibleRows.length}
            />
            <Pagination
              text={`عرض ${list.pagedRows.length} من ${list.visibleRows.length} نتيجة`}
              pages={`${list.currentPage} / ${list.totalPages}`}
              previousDisabled={list.currentPage === 1}
              nextDisabled={list.currentPage === list.totalPages}
              onPrevious={list.previousPage}
              onNext={list.nextPage}
            />
          </>
        )}
      </div>

      {list.detailDialogOpen ? (
        <ProductDetailDialog
          additionsById={list.additionRows}
          error={list.detailError}
          loading={list.detailLoading}
          onClose={list.closeProductDetail}
          product={list.detailProduct}
        />
      ) : null}

      {list.deleteRow ? (
        <DeleteDialog
          itemName={list.deleteRow.name}
          onClose={() => list.setDeleteId(null)}
          onConfirm={() => void list.confirmDelete()}
        />
      ) : null}
    </div>
  );
}
