"use client";

import { Plus, RefreshCw, Store, Tags } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Card, PageTitle } from "../primitives";
import { ClassificationDialog } from "./classification-dialog";
import { ClassificationsList } from "./classifications-list";
import { DeleteClassificationDialog } from "./delete-classification-dialog";
import { useMarketClassificationsPage } from "./use-market-classifications-page";

export function MarketClassificationsPage() {
  const page = useMarketClassificationsPage();

  return (
    <div dir="rtl" className="px-6 py-6">
      <PageTitle
        title="الفئات الأساسية للمحلات"
        description="الفئة الأساسية مثل مطاعم أو أثاث، ونوع ظهورها يحدد مكانها في التطبيق: شائعة أو عادية."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-sm"
              onClick={() => void page.load()}
              disabled={page.loading}
            >
              <RefreshCw
                className={cn("size-4", page.loading && "animate-spin")}
              />
              تحديث
            </Button>
            <Button
              type="button"
              className="h-9 px-4 text-sm"
              onClick={() => page.setDialogClassification(null)}
            >
              <Plus className="size-4" />
              إضافة فئة
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Card className="h-20">
          <div className="flex h-full items-center gap-3 px-5">
            <span className="rounded-full bg-primary/10 p-3 text-primary">
              <Tags className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الفئات</p>
              <p className="text-xl font-bold">{page.classifications.length}</p>
            </div>
          </div>
        </Card>
        <Card className="h-20">
          <div className="flex h-full items-center gap-3 px-5">
            <span className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <Store className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">النتائج المعروضة</p>
              <p className="text-xl font-bold">
                {page.filteredClassifications.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ClassificationsList
        classifications={page.pagedClassifications}
        filteredCount={page.filteredClassifications.length}
        loading={page.loading}
        loadError={page.loadError}
        query={page.query}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        pageStartIndex={page.pageStartIndex}
        onQueryChange={page.setQuery}
        onPageChange={page.setCurrentPage}
        onReload={() => void page.load()}
        onCreate={() => page.setDialogClassification(null)}
        onEdit={page.setDialogClassification}
        onDelete={page.setDeleteClassification}
        onToggle={(classification, checked) =>
          void page.toggleClassificationActive(classification, checked)
        }
      />

      {page.dialogClassification !== undefined ? (
        <ClassificationDialog
          classification={page.dialogClassification ?? undefined}
          onClose={() => page.setDialogClassification(undefined)}
          onSubmit={page.saveClassification}
        />
      ) : null}

      {page.deleteClassification ? (
        <DeleteClassificationDialog
          classification={page.deleteClassification}
          deleting={false}
          onCancel={() => page.setDeleteClassification(null)}
          onConfirm={page.confirmDelete}
        />
      ) : null}
    </div>
  );
}
