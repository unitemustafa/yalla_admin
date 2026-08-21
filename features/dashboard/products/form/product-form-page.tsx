"use client";

import Link from "next/link";

import { imageOrPlaceholder } from "../../placeholders";
import { ProductLivePreview } from "../../components/product-live-preview";
import { MarketPickerDialog } from "./market-picker-dialog";
import {
  ProductAdditionsDialog,
  ProductAdditionsSection,
} from "./product-additions-section";
import {
  ProductAttributesSection,
  ProductThemeSection,
} from "./product-attributes-section";
import { ProductBasicSection } from "./product-basic-section";
import { ProductFormHeader } from "./product-form-header";
import { ProductImagesSection } from "./product-images-section";
import { ProductVariantsSection } from "./product-variants-section";
import { useProductForm } from "./use-product-form";

export function ProductFormPage() {
  const controller = useProductForm();

  if (controller.productLoading && controller.isEditing) {
    return (
      <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          جاري تحميل بيانات المنتج...
        </div>
      </div>
    );
  }

  if (controller.productError && controller.isEditing) {
    return (
      <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {controller.productError}
          </div>
          <Link
            href="/items"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            العودة للمنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8"
      dir="rtl"
      onChangeCapture={controller.markDraft}
      onClickCapture={controller.markDraft}
      onSubmit={controller.saveProduct}
    >
      <ProductFormHeader controller={controller} />

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <ProductBasicSection controller={controller} />
          <ProductAdditionsSection controller={controller} />
          <ProductThemeSection controller={controller} />
          <ProductAttributesSection controller={controller} />
          <ProductVariantsSection controller={controller} />
        </div>

        <aside className="grid gap-5 self-start xl:sticky xl:top-5">
          <ProductLivePreview
            additions={controller.additions}
            attributes={controller.variants.previewAttributes}
            description={controller.description}
            discount={controller.discount}
            imageSrc={imageOrPlaceholder(controller.images.imagePreview, "product")}
            isAvailable={controller.isAvailable}
            isPopular={controller.isPopular}
            markets={controller.markets}
            name={controller.name}
            previewSource={controller.previewSource}
            selectedAdditionIds={controller.selectedAdditionIds}
            selectedMarketId={controller.selectedMarketId}
            theme={controller.variants.theme}
            variantRows={controller.variants.previewVariants}
          />
          <ProductImagesSection controller={controller} />
        </aside>
      </div>

      <ProductAdditionsDialog controller={controller} />
      <MarketPickerDialog controller={controller} />
    </form>
  );
}
