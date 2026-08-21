"use client";

import Link from "next/link";
import { Save, X } from "lucide-react";

import { Button } from "../../primitives";
import type { ProductFormController } from "./use-product-form";

export function ProductFormHeader({
  controller,
}: {
  controller: ProductFormController;
}) {
  const error =
    controller.saveError ||
    controller.images.imageError ||
    controller.productError ||
    controller.catalogError;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-8 md:text-3xl md:leading-9">
            {controller.pageTitle}
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {controller.pageDescription}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/items"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
            إلغاء
          </Link>
          <Button
            className="h-10"
            disabled={
              controller.saving ||
              controller.images.imageActionBusy ||
              controller.catalogLoading ||
              controller.productLoading
            }
            type="submit"
          >
            <Save className="size-4" />
            {controller.saving ? "جاري الحفظ..." : "حفظ المنتج"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error.split("\n").map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
      {controller.legacyMissingPrice ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
          هذا المنتج لا يحتوي سعرًا محفوظًا، أدخل السعر ثم احفظه.
        </div>
      ) : null}
    </div>
  );
}
