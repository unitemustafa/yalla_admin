"use client";

import { Plus, Trash2 } from "lucide-react";

import { AppSelect, Button, CurrencyText, Input } from "../../primitives";
import { optionIsActive } from "./domain";
import { FormSection, LabelText } from "./form-section";
import type { ProductFormController } from "./use-product-form";

export function ProductVariantsSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  const variants = controller.variants;

  return (
    <FormSection title="المتغيرات والأسعار">
      <div className="grid gap-3">
        {variants.variantRows.map((variant, index) => (
          <div
            key={variant.tempId}
            className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[48px_1fr_auto] lg:items-start"
          >
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-sm font-black text-primary">
              {index + 1}
            </div>
            <div className="grid gap-3">
              <LabelText
                label={variants.attributes.length ? "سعر التركيبة" : "السعر الأساسي"}
              >
                <div className="relative" dir="ltr">
                  <Input
                    className="h-10 pe-14 text-left"
                    data-testid={`variant-price-${index}`}
                    inputMode="decimal"
                    onChange={(event) =>
                      variants.updateVariant(variant.tempId, (current) => ({
                        ...current,
                        price: event.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                    placeholder="0.00"
                    value={variant.price}
                  />
                  <CurrencyText className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-muted-foreground">
                    EGP
                  </CurrencyText>
                </div>
              </LabelText>
              {variants.attributes.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {variants.attributes.map((attribute) => (
                    <LabelText key={attribute.clientId} label={attribute.name}>
                      <AppSelect
                        ariaLabel={attribute.name}
                        className="h-10"
                        disabled={!attribute.options.length}
                        onValueChange={(optionId) =>
                          variants.updateVariant(variant.tempId, (current) => ({
                            ...current,
                            selections: {
                              ...current.selections,
                              [attribute.clientId]: optionId,
                            },
                          }))
                        }
                        options={attribute.options.filter(optionIsActive).map((option) => ({
                          value: option.clientId,
                          label: option.value,
                          disabled: variants.variantOptionWouldDuplicate(
                            variant.tempId,
                            attribute.clientId,
                            option.clientId,
                          ),
                        }))}
                        placeholder={
                          attribute.options.length ? "اختر" : "لا توجد اختيارات"
                        }
                        value={variant.selections[attribute.clientId] ?? ""}
                      />
                    </LabelText>
                  ))}
                </div>
              ) : null}
            </div>
            <Button
              aria-label="حذف المتغير"
              className="h-10"
              disabled={variants.variantRows.length === 1}
              onClick={() => variants.removeVariant(variant.tempId)}
              type="button"
              variant="outline"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      {variants.attributes.length ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              variants.variantLimitReached || !variants.availableVariantCombinations.length
            }
            onClick={variants.addVariant}
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
            {variants.variantLimitReached ? "تم إنشاء كل التركيبات" : "إضافة تركيبة"}
          </Button>
          <span className="self-center text-xs font-semibold text-muted-foreground">
            {variants.variantRows.length} من {variants.availableVariantCombinations.length} تركيبة
          </span>
        </div>
      ) : null}
    </FormSection>
  );
}
