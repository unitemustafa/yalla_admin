"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";

import { Button } from "../../primitives";
import { ConfirmDeleteDialog } from "../../confirm-delete-dialog";
import { DashboardImage } from "../../dashboard-image";
import { FormSection } from "./form-section";
import { maxProductImages } from "./use-product-images";
import type { ProductFormController } from "./use-product-form";

export function ProductImagesSection({
  controller,
}: {
  controller: ProductFormController;
}) {
  const images = controller.images;

  return (
    <>
      <FormSection title="صور المنتج">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>يمكنك اختيار حتى 10 صور</span>
          <span>
            {images.productImages.length} / {maxProductImages}
          </span>
        </div>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-center transition hover:border-primary/50 hover:bg-accent/50">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            data-testid="product-images-input"
            disabled={
              controller.saving ||
              images.imageActionBusy ||
              images.productImages.length >= maxProductImages
            }
            multiple
            onChange={(event) => void images.selectImages(event)}
            type="file"
          />
          <DashboardImage
            alt={controller.name || "صورة المنتج"}
            src={images.imagePreview}
            placeholderType="product"
            width={320}
            height={220}
            sizes="320px"
            className="h-55 w-full rounded-lg"
            imageClassName="object-contain p-2"
            unoptimized={images.imagePreview?.startsWith("blob:")}
          />
          <ImagePlus className="size-6 text-primary" />
          <span className="text-sm font-semibold">
            {images.productImages.length ? "إضافة صور أخرى" : "اختر صور المنتج"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG أو PNG أو WEBP؛ الصور الكبيرة تُضغط تلقائيًا (5 ميجابايت بعد الضغط)
          </span>
        </label>
        {controller.isEditing &&
        images.productImages.some((image) => image.kind === "local") ? (
          <Button
            disabled={controller.saving || images.imageActionBusy}
            onClick={() => void images.uploadPendingImages()}
            type="button"
          >
            <ImagePlus className="size-4" />
            {images.imageActionBusy ? "جاري رفع الصور..." : "رفع الصور المحددة"}
          </Button>
        ) : null}

        {images.productImages.length ? (
          <div className="grid grid-cols-2 gap-3" data-testid="product-image-grid">
            {images.productImages.map((image, index) => {
              const sameKind = images.productImages.filter((item) => item.kind === image.kind);
              const kindIndex = sameKind.findIndex((item) =>
                item.kind === "remote" && image.kind === "remote"
                  ? item.id === image.id
                  : item.kind === "local" && image.kind === "local"
                    ? item.clientId === image.clientId
                    : false,
              );
              const src = image.kind === "local" ? image.previewUrl : image.src;
              const key = image.kind === "local" ? image.clientId : String(image.id);
              return (
                <article
                  key={`${image.kind}-${key}`}
                  className="overflow-hidden rounded-lg border bg-background shadow-sm"
                >
                  <div className="relative h-28 bg-muted/25">
                    <DashboardImage
                      alt={`${controller.name || "صورة المنتج"} ${index + 1}`}
                      src={src}
                      placeholderType="product"
                      width={180}
                      height={112}
                      sizes="180px"
                      className="h-28 w-full"
                      imageClassName="object-contain p-1.5"
                      unoptimized={image.kind === "local"}
                    />
                    <span className="absolute start-2 top-2 rounded-md bg-background/90 px-2 py-1 text-[11px] font-black shadow">
                      {index + 1}
                    </span>
                    {image.isPrimary ? (
                      <span className="absolute bottom-2 end-2 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow">
                        الصورة الرئيسية
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-2 p-2">
                    {!image.isPrimary ? (
                      <Button
                        className="h-8 px-2 text-xs"
                        disabled={images.imageActionBusy}
                        onClick={() =>
                          image.kind === "local"
                            ? images.setLocalPrimary(image.clientId)
                            : void images.setRemotePrimary(image.id)
                        }
                        type="button"
                        variant="outline"
                      >
                        تعيين كرئيسية
                      </Button>
                    ) : null}
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        aria-label="تحريك الصورة للأعلى"
                        className="h-8 px-2"
                        disabled={kindIndex <= 0 || images.imageActionBusy}
                        onClick={() =>
                          image.kind === "local"
                            ? images.moveLocalImage(image.clientId, -1)
                            : void images.moveRemoteImage(image.id, -1)
                        }
                        type="button"
                        variant="outline"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        aria-label="تحريك الصورة للأسفل"
                        className="h-8 px-2"
                        disabled={
                          kindIndex >= sameKind.length - 1 || images.imageActionBusy
                        }
                        onClick={() =>
                          image.kind === "local"
                            ? images.moveLocalImage(image.clientId, 1)
                            : void images.moveRemoteImage(image.id, 1)
                        }
                        type="button"
                        variant="outline"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        aria-label="حذف الصورة"
                        className="h-8 px-2"
                        disabled={images.imageActionBusy}
                        onClick={() =>
                          image.kind === "local"
                            ? images.removeLocalImage(image.clientId)
                            : images.setDeleteImageId(image.id)
                        }
                        type="button"
                        variant="danger"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/15 px-3 py-3 text-center text-sm text-muted-foreground">
            لا توجد صور للمنتج بعد.
          </div>
        )}
      </FormSection>

      {images.deleteImageId !== null ? (
        <ConfirmDeleteDialog
          busy={images.imageActionBusy}
          description="سيتم حذف الصورة المرفوعة نهائيًا. إذا كانت رئيسية فسيتم اختيار الصورة التالية تلقائيًا."
          onCancel={() => images.setDeleteImageId(null)}
          onConfirm={() => void images.confirmRemoteImageDelete()}
          title="حذف الصورة"
        />
      ) : null}
    </>
  );
}
