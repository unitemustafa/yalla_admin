"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Package, Plus, Power, Shirt, ShoppingBasket, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, Input } from "../../primitives";
import type { ProductTheme } from "../types";
import {
  colorHexForOption,
  colorInputValue,
  isColorAttributeName,
  optionIsActive,
} from "./domain";
import { FormSection } from "./form-section";
import type { ProductFormController } from "./use-product-form";

const themeCards: Array<{
  id: ProductTheme;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  selectedTone: string;
}> = [
  {
    id: "clothing",
    label: "ملابس",
    description: "ألوان، مقاسات، ونوع",
    icon: Shirt,
    tone:
      "border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    selectedTone:
      "border-emerald-500 ring-2 ring-emerald-500/20 shadow-[0_14px_28px_rgba(16,185,129,0.16)]",
  },
  {
    id: "consumer",
    label: "استهلاكي",
    description: "الوزن والكمية",
    icon: ShoppingBasket,
    tone:
      "border-amber-200 bg-amber-50/70 text-amber-950 hover:border-amber-300 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100",
    selectedTone:
      "border-amber-500 ring-2 ring-amber-500/20 shadow-[0_14px_28px_rgba(245,158,11,0.16)]",
  },
  {
    id: "other",
    label: "أخرى",
    description: "بدون قالب جاهز",
    icon: Package,
    tone:
      "border-sky-200 bg-sky-50/70 text-sky-950 hover:border-sky-300 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100",
    selectedTone:
      "border-sky-500 ring-2 ring-sky-500/20 shadow-[0_14px_28px_rgba(14,165,233,0.16)]",
  },
];

export function ProductThemeSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  return (
    <FormSection title="الثيم">
      <div className="grid gap-3 md:grid-cols-3">
        {themeCards.map((card) => {
          const Icon = card.icon;
          const selected = controller.variants.theme === card.id;
          return (
            <button
              key={card.id}
              aria-pressed={selected}
              className={cn(
                "group grid min-h-29 gap-3 rounded-lg border p-4 text-start transition",
                card.tone,
                selected && card.selectedTone,
              )}
              onClick={() => controller.variants.applyTheme(card.id)}
              type="button"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-background/75 shadow-sm">
                  <Icon className="size-5" />
                </span>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border bg-background/80",
                    selected
                      ? "border-primary text-primary"
                      : "border-transparent text-transparent",
                  )}
                >
                  <Check className="size-4" />
                </span>
              </span>
              <span>
                <span className="block font-black">{card.label}</span>
                <span className="mt-1 block text-xs font-semibold opacity-75">
                  {card.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}

export function ProductAttributesSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  const variants = controller.variants;

  return (
    <FormSection title="خصائص المنتج">
      {variants.hasUnusedAttributeValues ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
          role="status"
        >
          بعض قيم الخصائص غير مرتبطة بمتغيرات، ولذلك لن تظهر كاختيارات متاحة للعملاء.
        </div>
      ) : null}
      <div className="grid gap-3">
        {variants.attributes.map((attribute, attributeIndex) => (
          <div
            key={attribute.clientId}
            className="grid gap-3 rounded-md border bg-background p-3"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                className="h-10 flex-1"
                onChange={(event) =>
                  variants.updateAttribute(attribute.clientId, event.target.value)
                }
                value={attribute.name}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => variants.addOption(attribute.clientId)}
                  type="button"
                  variant="outline"
                >
                  <Plus className="size-4" />
                  {isColorAttributeName(attribute.name) ? "إضافة لون" : "اختيار"}
                </Button>
                <Button
                  aria-label="حذف الخاصية"
                  onClick={() => variants.removeAttribute(attribute.clientId)}
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {attribute.options.map((option) => {
                const isColor = isColorAttributeName(attribute.name);
                const active = optionIsActive(option);
                const colorHex =
                  option.colorHex ?? colorHexForOption(attribute.name, option.value);
                return (
                  <div
                    key={option.clientId}
                    className={cn(
                      "inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-md border bg-card px-1.5 py-1 shadow-sm",
                      !active && "bg-muted/50 opacity-55",
                    )}
                  >
                    {isColor ? (
                      <>
                        <input
                          aria-label={`لون ${option.value}`}
                          className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                          onChange={(event) =>
                            variants.updateOptionColor(
                              attribute.clientId,
                              option.clientId,
                              event.target.value,
                            )
                          }
                          type="color"
                          value={colorInputValue(colorHex)}
                        />
                        <Input
                          aria-label={`درجة لون ${option.value}`}
                          className="h-8 w-20 px-2 text-xs"
                          dir="ltr"
                          onChange={(event) =>
                            variants.updateOptionColor(
                              attribute.clientId,
                              option.clientId,
                              event.target.value,
                            )
                          }
                          value={colorHex ?? "#94a3b8"}
                        />
                      </>
                    ) : null}
                    <input
                      className="w-16 bg-transparent text-sm font-semibold outline-none"
                      onChange={(event) =>
                        variants.updateOption(
                          attribute.clientId,
                          option.clientId,
                          event.target.value,
                        )
                      }
                      value={option.value}
                    />
                    <button
                      aria-label={
                        active
                          ? `تعطيل الاختيار ${option.value}`
                          : `تفعيل الاختيار ${option.value}`
                      }
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md border transition",
                        active
                          ? "text-muted-foreground hover:border-primary hover:text-primary"
                          : "border-primary/40 bg-primary/10 text-primary",
                      )}
                      onClick={() =>
                        variants.toggleOptionActive(attribute.clientId, option.clientId)
                      }
                      type="button"
                    >
                      <Power className="size-3.5" />
                    </button>
                    <button
                      aria-label={`حذف الاختيار ${option.value}`}
                      className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition hover:border-destructive hover:text-destructive"
                      onClick={() =>
                        variants.removeOption(attribute.clientId, option.clientId)
                      }
                      type="button"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            {!attribute.options.length ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                لا توجد اختيارات لـ {attribute.name || `الخاصية ${attributeIndex + 1}`}.
              </div>
            ) : null}
          </div>
        ))}
        {!variants.attributes.length ? (
          <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            يبدأ هذا الثيم بلا خصائص.
          </div>
        ) : null}
      </div>
      <div>
        <Button onClick={variants.addAttribute} type="button" variant="outline">
          <Plus className="size-4" />
          إضافة خاصية
        </Button>
      </div>
    </FormSection>
  );
}
