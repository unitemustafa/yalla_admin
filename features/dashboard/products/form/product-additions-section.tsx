"use client";

import { Check, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, CurrencyText } from "../../primitives";
import { FormSection } from "./form-section";
import type { ProductFormController } from "./use-product-form";

export function ProductAdditionsSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  return (
    <FormSection title="الإضافات">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">
            {controller.selectedAdditions.length
              ? `${controller.selectedAdditions.length} إضافات محددة`
              : "لا توجد إضافات محددة"}
          </div>
          {controller.selectedAdditions.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {controller.selectedAdditions.map((addition) => (
                <span
                  key={addition.id}
                  className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs font-semibold"
                >
                  {addition.name}
                  {addition.price ? (
                    <CurrencyText className="text-primary">
                      {`EGP ${addition.price}`}
                    </CurrencyText>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          onClick={() => controller.setAdditionPickerOpen(true)}
          type="button"
          variant="outline"
        >
          <Plus className="size-4" />
          اختيار الإضافات
        </Button>
      </div>
    </FormSection>
  );
}

export function ProductAdditionsDialog({
  controller,
}: {
  controller: ProductFormController;
}) {
  if (!controller.additionPickerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        aria-modal="true"
        className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="font-semibold">اختيار الإضافات</div>
          <button
            aria-label="إغلاق"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={() => controller.setAdditionPickerOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-semibold transition",
                controller.additionClassification === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary/50",
              )}
              onClick={() => controller.setAdditionClassification("all")}
              type="button"
            >
              الكل
            </button>
            {controller.additionClassifications.map((classification) => (
              <button
                key={classification}
                className={cn(
                  "h-9 rounded-md border px-3 text-sm font-semibold transition",
                  controller.additionClassification === classification
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/50",
                )}
                onClick={() => controller.setAdditionClassification(classification)}
                type="button"
              >
                {classification}
              </button>
            ))}
          </div>

          <div className="max-h-[54vh] overflow-y-auto">
            {controller.filteredAdditions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {controller.filteredAdditions.map((addition) => {
                  const additionId = Number(addition.id);
                  const selected = controller.selectedAdditionIds.includes(additionId);
                  return (
                    <button
                      key={addition.id}
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-12 items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-start text-sm transition hover:border-primary/50",
                        selected && "border-primary bg-primary/10 ring-1 ring-primary/20",
                      )}
                      onClick={() => controller.toggleAddition(addition.id)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{addition.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {addition.classification}
                          {addition.price ? ` - EGP ${addition.price}` : ""}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {selected ? <Check className="size-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                لا توجد إضافات في هذا التصنيف.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => controller.setAdditionPickerOpen(false)} type="button">
              موافق
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
