"use client";

import { Plus, RefreshCw, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Card, PageTitle } from "../primitives";
import { AddonCategoriesPanel } from "./addon-categories-panel";
import {
  AddonCategoryDialog,
  AddonCreateDialog,
  AddonDeleteDialogs,
} from "./addon-dialogs";
import { AddonsTable } from "./addons-table";
import { useAddonsPage } from "./use-addons-page";

export function AddonsPage() {
  const controller = useAddonsPage();

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="الإضافات"
        description="إدارة الإضافات والاختيارات الإضافية للمنيو"
        size="compact"
        className="w-full"
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 text-sm"
            onClick={() => void controller.loadAddons(true)}
            disabled={controller.addonsLoading}
          >
            <RefreshCw
              className={cn("size-4", controller.addonsLoading && "animate-spin")}
            />
            تحديث
          </Button>
        }
      />

      <Card className="mt-8">
        <div className="flex min-h-[77px] items-center justify-between border-b px-6">
          <div>
            <h2 className="font-semibold">كل الإضافات</h2>
            <p className="mt-2 text-sm text-muted-foreground">قائمة الإضافات</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => controller.setCategoriesOpen(!controller.categoriesOpen)}
            >
              <Tag className="size-4" />
              التصنيفات
            </Button>
            <Button
              variant="outline"
              onClick={() => controller.setCategoryModalOpen(true)}
            >
              <Plus className="size-4" />
              إضافة تصنيف جديد
            </Button>
            <Button
              onClick={() => controller.setModalOpen(true)}
              disabled={controller.addonsLoading}
            >
              <Plus className="size-4" />
              إضافة جديدة
            </Button>
          </div>
        </div>
        <div className="p-6">
          <AddonCategoriesPanel controller={controller} />
          <AddonsTable controller={controller} />
        </div>
      </Card>

      <AddonDeleteDialogs controller={controller} />
      <AddonCategoryDialog controller={controller} />
      <AddonCreateDialog controller={controller} />
    </div>
  );
}
