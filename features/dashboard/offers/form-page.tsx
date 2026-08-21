"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

import { Button, PageTitle } from "../primitives";
import { OfferBasicSection } from "./offer-basic-section";
import { OfferScheduleSection } from "./offer-schedule-section";
import {
  ClearServiceCitiesDialog,
  OfferNotificationSection,
  OfferUsageLimitsSection,
} from "./offer-supplemental-sections";
import { OfferTypeSection } from "./offer-type-section";
import { OfferProductsProvider } from "./product-context";
import { useCreateOfferForm } from "./use-create-offer-form";

export function CreateOfferPage() {
  const form = useCreateOfferForm();
  const { state } = form;
  const editMode = Boolean(state.editingOfferId);

  return (
    <OfferProductsProvider value={form.products}>
      <div className="px-6 py-8">
        <PageTitle
          title={editMode ? "تعديل العرض" : "إنشاء عرض"}
          description={
            editMode
              ? `تعديل بيانات ${state.editingOffer?.title ?? "العرض"}`
              : state.selectedType === "إعلان"
                ? "اضبط رابط الإعلان، الجدولة، ومدة الظهور"
                : "اضبط نوع العرض، الجدولة، وحدود الاستخدام"
          }
          size="compact"
          actions={
            <>
              <Link
                href="/offers"
                className="inline-flex h-10 items-center justify-center gap-3 rounded-md border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="size-4" />
                <span>الرجوع للعروض</span>
              </Link>
              <Button
                className="h-10 px-5"
                disabled={state.saving}
                onClick={() => void form.saveOffer()}
              >
                <CheckCircle2 className="size-4" />
                {state.saving ? "جار الحفظ..." : editMode ? "حفظ التعديل" : "إنشاء العرض"}
              </Button>
            </>
          }
        />

        <div className="mt-6 grid gap-5">
          <OfferBasicSection form={form} />
          <OfferTypeSection form={form} />
          <OfferNotificationSection form={form} />
          <OfferScheduleSection form={form} />
          <OfferUsageLimitsSection form={form} />
        </div>
        <ClearServiceCitiesDialog form={form} />
      </div>
    </OfferProductsProvider>
  );
}
