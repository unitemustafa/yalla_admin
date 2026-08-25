"use client";

import { Layers3, Sparkles, Store } from "lucide-react";

import { Button, Input, Switch } from "../../primitives";
import { FormSection, LabelText } from "./form-section";
import type { ProductFormController } from "./use-product-form";

export function ProductBasicSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  return (
    <>
      <FormSection title="البيانات الأساسية">
        <LabelText label="اسم المنتج">
          <Input
            className="h-10"
            data-testid="product-name-input"
            onChange={(event) => controller.setName(event.target.value)}
            placeholder="اسم المنتج مطلوب"
            value={controller.name}
          />
        </LabelText>
        <LabelText label="وصف المنتج">
          <textarea
            className="min-h-24 w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            data-testid="product-description-input"
            onChange={(event) => controller.setDescription(event.target.value)}
            placeholder="الوصف اختياري"
            value={controller.description}
          />
        </LabelText>
        <div className="grid gap-4 md:grid-cols-3">
          <LabelText label="المحل">
            <button
              className="flex h-10 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 text-sm shadow-sm transition hover:border-primary/50"
              onClick={() => controller.setMarketModalOpen(true)}
              type="button"
            >
              <span className="min-w-0 truncate font-semibold">
                {controller.selectedMarket
                  ? controller.selectedMarket.branch
                    ? `${controller.selectedMarket.name} - ${controller.selectedMarket.branch}`
                    : controller.selectedMarket.name
                  : "اختيار المحل"}
              </span>
              <Store className="size-4 text-muted-foreground" />
            </button>
          </LabelText>
          <LabelText label="أقسام المنتج">
            {controller.selectedMarket && !controller.availableSubcategories.length ? (
              <div className="flex min-h-20 flex-col items-start justify-center rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-sm font-bold">لا توجد أقسام منتجات لهذا المحل</p>
                <p className="mt-1 text-xs text-muted-foreground">أضف قسمًا مثل وجبات أو مشروبات قبل حفظ المنتج.</p>
                <Button type="button" size="sm" className="mt-3" onClick={() => controller.setMarketSubcategoriesOpen(true)}><Layers3 className="size-4" />إعداد أقسام المحل</Button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 rounded-md border bg-input p-2">
                  <p className="mb-2 text-xs text-muted-foreground">
                    اختر قسمًا أو أكثر. للنقل ألغِ القسم القديم واختر القسم الجديد.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {controller.availableSubcategories.map((item) => {
                      const id = String(item.id);
                      const selected = controller.selectedSubcategoryIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!item.is_active && !selected}
                          aria-pressed={selected}
                          onClick={() => controller.toggleSubcategory(id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"} ${!item.is_active ? "border-dashed text-muted-foreground" : ""}`}
                        >
                          {item.name_ar}{item.is_active ? "" : " (معطل حاليًا)"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {controller.selectedMarket ? <Button type="button" size="icon" variant="outline" onClick={() => controller.setMarketSubcategoriesOpen(true)} aria-label="إدارة أقسام المحل"><Layers3 className="size-4" /></Button> : null}
              </div>
            )}
          </LabelText>
          <LabelText label="الخصم">
            <div className="relative" dir="ltr">
              <Input
                className="h-10 pe-10 text-left"
                data-testid="product-discount-input"
                inputMode="decimal"
                onChange={(event) =>
                  controller.setDiscount(event.target.value.replace(/[^\d.]/g, ""))
                }
                placeholder="0.00"
                value={controller.discount}
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-black text-muted-foreground">
                %
              </span>
            </div>
          </LabelText>
        </div>
        <div className="flex min-h-12 items-center justify-between rounded-md border bg-background px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-[#FFA000]" />
            منتج شائع
          </span>
          <Switch checked={controller.isPopular} onCheckedChange={controller.setIsPopular} />
        </div>
      </FormSection>

      {!controller.isEditing ? (
        <FormSection title="إشعار المنتج">
          <div className="flex min-h-24 items-center justify-between gap-5 rounded-lg border bg-background px-4 py-3">
            <div className="min-w-0">
              <span className="block text-sm font-semibold">
                تحب تبعت إشعار للعملاء عن المنتج ده؟
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {!controller.selectedMarket
                  ? "اختار المحل الأول علشان نحدد العملاء اللي الإشعار هيوصل لهم."
                  : controller.selectedMarket.scope === "general"
                    ? "الإشعار هيوصل لعملاء السوق العام فقط، ولما يضغطوا عليه هيفتح تفاصيل المنتج."
                    : `الإشعار هيوصل لعملاء ${controller.selectedMarket.serviceCities.join("، ") || "مدينة المحل"} فقط، ولما يضغطوا عليه هيفتح تفاصيل المنتج.`}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                لو إعلان المحل نفسه لسه منتظر أول منتج، هنبعت إعلان المحل وحده بدل إشعارين متتاليين.
              </span>
              {!controller.isAvailable ? (
                <span className="mt-2 block text-xs font-semibold text-amber-700 dark:text-amber-300">
                  خلّي المنتج متاح للبيع علشان تقدر تبعت الإشعار.
                </span>
              ) : null}
            </div>
            <Switch
              aria-label="إرسال إشعار للعملاء عن المنتج"
              checked={controller.sendPushNotification}
              data-testid="product-notification-switch"
              disabled={!controller.selectedMarket || !controller.isAvailable || controller.saving}
              onCheckedChange={controller.setSendPushNotification}
            />
          </div>
        </FormSection>
      ) : null}
    </>
  );
}
