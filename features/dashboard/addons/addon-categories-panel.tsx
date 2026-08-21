"use client";

import { Edit, Plus, Trash2 } from "lucide-react";

import { Button, Input } from "../primitives";
import { AddonRowIconButton } from "./components";
import type { AddonsPageController } from "./use-addons-page";

export function AddonCategoriesPanel({
  controller,
}: {
  controller: AddonsPageController;
}) {
  if (!controller.categoriesOpen) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-md border bg-muted/10">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">تصنيفات الإضافات</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            تعديل اسم التصنيف أو حذفه.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => controller.setCategoryModalOpen(true)}
          >
            <Plus className="size-4" />
            إضافة تصنيف
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              controller.setCategoriesOpen(false);
              controller.setEditingCategory(null);
            }}
          >
            إلغاء
          </Button>
        </div>
      </div>
      <div className="divide-y">
        {controller.addonCategories.length ? (
          controller.addonCategories.map((category) => {
            const isEditing = controller.editingCategory?.id === category.id;
            const editingDraft = isEditing ? controller.editingCategory : null;
            return (
              <div
                key={category.id}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-2"
              >
                {editingDraft ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Input
                      value={editingDraft.name}
                      className="h-9 max-w-sm"
                      autoFocus
                      onChange={(event) =>
                        controller.setEditingCategory({
                          ...editingDraft,
                          name: event.target.value,
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void controller.saveCategoryName()}
                    >
                      حفظ
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => controller.setEditingCategory(null)}
                    >
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <span className="font-semibold">{category.name}</span>
                )}
                {!isEditing ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <AddonRowIconButton
                      label={`تعديل تصنيف ${category.name}`}
                      onClick={() => controller.setEditingCategory(category)}
                    >
                      <Edit className="size-4" />
                    </AddonRowIconButton>
                    <AddonRowIconButton
                      tone="danger"
                      label={`حذف تصنيف ${category.name}`}
                      onClick={() => controller.setCategoryDeleteTarget(category)}
                    >
                      <Trash2 className="size-4" />
                    </AddonRowIconButton>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="p-5 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات.
          </div>
        )}
      </div>
    </div>
  );
}
