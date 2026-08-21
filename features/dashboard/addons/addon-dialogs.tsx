"use client";

import { ImagePlus, X } from "lucide-react";

import { ConfirmDeleteDialog } from "../confirm-delete-dialog";
import { DashboardImage } from "../dashboard-image";
import { AppSelect, Button, Field, Input } from "../primitives";
import { MissingAddonCategoriesDialog } from "./components";
import type { AddonsPageController } from "./use-addons-page";

export function AddonDeleteDialogs({
  controller,
}: {
  controller: AddonsPageController;
}) {
  const addonTarget = controller.addonDeleteTarget;
  const categoryTarget = controller.categoryDeleteTarget;

  return (
    <>
      {addonTarget ? (
        <ConfirmDeleteDialog
          title="حذف الإضافة"
          description={`هل تريد حذف الإضافة ${addonTarget.nameAr}؟`}
          busy={false}
          onCancel={() => controller.setAddonDeleteTarget(null)}
          onConfirm={() => controller.deleteAddon(addonTarget)}
        />
      ) : null}
      {categoryTarget ? (
        <ConfirmDeleteDialog
          title="حذف تصنيف الإضافة"
          description={`هل تريد حذف التصنيف ${categoryTarget.name}؟`}
          busy={false}
          onCancel={() => controller.setCategoryDeleteTarget(null)}
          onConfirm={() => controller.deleteCategory(categoryTarget)}
        />
      ) : null}
    </>
  );
}

export function AddonCategoryDialog({
  controller,
}: {
  controller: AddonsPageController;
}) {
  if (!controller.categoryModalOpen) return null;
  const close = () => {
    controller.setCategoryModalOpen(false);
    controller.setNewCategoryName("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain bg-foreground/30 p-4 backdrop-blur-[1px]">
      <form
        className="w-full max-w-105 rounded-lg border bg-background p-5 shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          void controller.createCategory();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">إضافة تصنيف جديد</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أضف تصنيف يظهر في فلتر الإضافات.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-md border p-2 hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="اسم التصنيف">
            <Input
              value={controller.newCategoryName}
              onChange={(event) => controller.setNewCategoryName(event.target.value)}
              placeholder="مثال: إضافات ساخنة"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              إلغاء
            </Button>
            <Button type="submit">إضافة التصنيف</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function AddonCreateDialog({
  controller,
}: {
  controller: AddonsPageController;
}) {
  if (!controller.modalOpen) return null;
  if (!controller.categoryOptions.length) {
    return (
      <MissingAddonCategoriesDialog
        onClose={controller.closeAddonModal}
        onCreateCategory={() => {
          controller.closeAddonModal();
          controller.setCategoryModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-foreground/30 p-4 backdrop-blur-[1px] sm:items-center">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-155 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">إضافة جديدة</h2>
            <p className="mt-1 text-sm text-muted-foreground">أنشئ إضافة للمنتجات.</p>
          </div>
          <button
            type="button"
            onClick={controller.closeAddonModal}
            className="rounded-md border p-2 hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="صورة الإضافة">
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
              <label className="group relative flex aspect-square min-h-33 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background text-center transition hover:border-primary/50 hover:bg-accent/40">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={controller.handleAddonImageChange}
                  type="file"
                />
                {controller.addonImagePreview ? (
                  <>
                    <DashboardImage
                      src={controller.addonImagePreview}
                      placeholderType="addon"
                      alt="معاينة صورة الإضافة"
                      width={300}
                      height={300}
                      sizes="150px"
                      className="absolute inset-0 size-full"
                      imageClassName="object-cover"
                    />
                    <span className="absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/35" />
                    <span className="relative z-30 rounded-md bg-background/95 px-3 py-2 text-sm font-semibold opacity-0 shadow-sm transition group-hover:opacity-100">
                      تغيير الصورة
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground">
                    <span className="flex size-10 items-center justify-center rounded-md bg-muted/50">
                      <ImagePlus className="size-5 text-primary" />
                    </span>
                    <span className="font-semibold text-foreground">اختيار صورة</span>
                  </span>
                )}
              </label>
              <div className="flex min-w-0 flex-col gap-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  استخدم صورة مربعة وواضحة. الصيغ المدعومة PNG, JPG, WEBP.
                </p>
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {controller.addonImageName || "لم يتم اختيار صورة"}
                  </span>
                  {controller.addonImagePreview ? (
                    <button
                      type="button"
                      onClick={controller.resetAddonImage}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 font-semibold text-destructive transition hover:bg-destructive/10"
                    >
                      <X className="size-3.5" />
                      حذف الصورة
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </Field>
          <Field label="الاسم بالعربي">
            <Input
              value={controller.addonNameAr}
              onChange={(event) => controller.setAddonNameAr(event.target.value)}
              placeholder="جبنة زيادة"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="تصنيف الإضافة">
              <AppSelect
                value={controller.currentAddonFormCategory}
                onValueChange={controller.setAddonFormCategory}
                ariaLabel="اختيار تصنيف الإضافة"
                className="h-9 bg-input"
                options={controller.categoryOptions.map((category) => ({
                  value: category,
                  label: category,
                }))}
              />
            </Field>
            <Field label="سعر الإضافة">
              <Input
                dir="ltr"
                value={controller.addonPrice}
                onChange={(event) => controller.setAddonPrice(event.target.value)}
                placeholder="EGP 0.00"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={controller.closeAddonModal}>
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={() => void controller.createAddon()}
              disabled={!controller.addonNameAr.trim() || !controller.addonPrice.trim()}
            >
              إنشاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
