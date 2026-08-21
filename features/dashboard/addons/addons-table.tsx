"use client";

import { Edit, Search, Trash2 } from "lucide-react";

import {
  AppSelect,
  DataTable,
  Input,
  Pagination,
  Switch,
} from "../primitives";
import {
  AddonEditPanel,
  AddonIdentity,
  AddonInfoPill,
  AddonPriceCell,
  AddonRowIconButton,
  EmptyStateTable,
} from "./components";
import type { AddonsPageController } from "./use-addons-page";

export function AddonsTable({ controller }: { controller: AddonsPageController }) {
  return (
    <>
      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="addon-search" className="text-sm leading-5">
            بحث
          </label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="addon-search"
              value={controller.addonSearch}
              onChange={(event) => controller.setAddonSearch(event.target.value)}
              className="h-10 ps-9"
              placeholder="ابحث عن إضافة..."
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-sm leading-5">تصنيف الإضافة</div>
          <AppSelect
            value={controller.selectedAddonCategory}
            onValueChange={controller.setSelectedAddonCategory}
            ariaLabel="فلتر تصنيف الإضافة"
            className="h-10"
            options={[
              { value: "all", label: "كل التصنيفات" },
              ...controller.categoryOptions.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />
        </div>
      </div>
      <div className="mt-4">
        {controller.visibleAddons.length ? (
          <div className="overflow-hidden rounded-md border transition-opacity duration-200">
            <DataTable
              minWidth={885}
              columnWidths={[80, 350, 210, 160, 235]}
              rowHeight="tall"
              headers={["", "الإضافة", "تصنيف الإضافة", "سعر الإضافة", ""]}
              rows={controller.pagedAddons.flatMap((addon, addonIndex) => {
                const baseRow = [
                  <span
                    key={`index-${addon.id}`}
                    className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                  >
                    {controller.pageStartIndex + addonIndex + 1}
                  </span>,
                  <AddonIdentity key={`identity-${addon.id}`} addon={addon} />,
                  <AddonInfoPill key={`category-${addon.id}`}>
                    {addon.category}
                  </AddonInfoPill>,
                  <AddonPriceCell key={`price-${addon.id}`} price={addon.price} />,
                  <div
                    key={`actions-${addon.id}`}
                    className="flex min-w-55 items-center justify-end gap-2"
                  >
                    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-2 text-xs font-semibold">
                      <span>{addon.active !== false ? "مفعلة" : "معطلة"}</span>
                      <Switch
                        checked={addon.active !== false}
                        onCheckedChange={(checked) =>
                          void controller.toggleAddonActive(addon, checked)
                        }
                        aria-label={`تفعيل الإضافة ${addon.nameAr}`}
                      />
                    </div>
                    <AddonRowIconButton
                      label={`تعديل ${addon.nameAr}`}
                      onClick={() => controller.startEditingAddon(addon)}
                    >
                      <Edit className="size-4" />
                    </AddonRowIconButton>
                    <AddonRowIconButton
                      tone="danger"
                      label={`حذف ${addon.nameAr}`}
                      onClick={() => controller.setAddonDeleteTarget(addon)}
                    >
                      <Trash2 className="size-4" />
                    </AddonRowIconButton>
                  </div>,
                ];

                if (controller.editingAddon?.id !== addon.id) return [baseRow];
                return [
                  baseRow,
                  [
                    <div key={`edit-${addon.id}`} className="p-1">
                      <AddonEditPanel
                        draft={controller.editingAddon}
                        categoryOptions={controller.categoryOptions}
                        onChange={controller.setEditingAddon}
                        onImageChange={controller.handleEditAddonImageChange}
                        onCancel={controller.cancelEditingAddon}
                        onSave={() => void controller.saveEditingAddon()}
                      />
                    </div>,
                    null,
                    null,
                    null,
                    null,
                  ],
                ];
              })}
              getRowProps={(_rowIndex, row) =>
                row[1] === null
                  ? { className: "bg-primary/5 hover:bg-primary/5" }
                  : undefined
              }
              getCellProps={(_rowIndex, cellIndex, row) =>
                row[1] === null && cellIndex === 0
                  ? { colSpan: 5, className: "p-2.5" }
                  : undefined
              }
            />
          </div>
        ) : (
          <EmptyStateTable
            minWidth={860}
            headers={["", "الإضافة", "تصنيف الإضافة", "سعر الإضافة", ""]}
          />
        )}
      </div>
      <Pagination
        text={`عرض ${
          controller.pagedAddons.length
            ? `${controller.pageStartIndex + 1}-${controller.pageStartIndex + controller.pagedAddons.length}`
            : "0-0"
        } من ${controller.visibleAddons.length} نتائج`}
        pages={`${controller.currentPage} / ${controller.totalPages}`}
        previousDisabled={controller.currentPage === 1}
        nextDisabled={controller.currentPage === controller.totalPages}
        onPrevious={controller.previousPage}
        onNext={controller.nextPage}
      />
    </>
  );
}
