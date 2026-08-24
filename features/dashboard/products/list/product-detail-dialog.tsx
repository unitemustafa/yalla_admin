"use client";

import type { ReactNode } from "react";
import { XCircle } from "lucide-react";

import { DashboardImage } from "../../dashboard-image";
import { CurrencyText } from "../../primitives";
import { formatItemPrice, primaryProductImageUrl } from "../normalizers";
import type { NormalizedProduct } from "../types";
import { useBodyScrollLock } from "./use-body-scroll-lock";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function detailText(value: unknown, fallback = "-") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function nestedDetailName(value: unknown, fallback = "-") {
  const record = asRecord(value);
  if (!record) return fallback;
  return detailText(record.name ?? record.name_ar ?? record.name_en ?? record.title, fallback);
}

function productDetailDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function variantAttributeLabel(value: unknown) {
  const record = asRecord(value);
  if (!record) return "";
  const attribute = asRecord(record.attribute);
  const option = asRecord(record.option);
  const attributeName = nestedDetailName(attribute, "");
  const optionValue = detailText(option?.value ?? record.option_value ?? record.value, "");

  if (attributeName && optionValue) return `${attributeName}: ${optionValue}`;
  return optionValue || attributeName;
}

function productAdditionLabel(
  additionId: number,
  additionsById: Map<string, string>,
) {
  return additionsById.get(String(additionId)) ?? `#${additionId}`;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md bg-muted/35 px-3 py-2 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 font-semibold">{value}</span>
    </div>
  );
}

export function ProductDetailDialog({
  additionsById,
  error,
  loading,
  onClose,
  product,
}: {
  additionsById: Map<string, string>;
  error: string;
  loading: boolean;
  onClose: () => void;
  product: NormalizedProduct | null;
}) {
  useBodyScrollLock(true);

  const variants = product?.variants ?? [];
  const additions = product?.additions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        aria-labelledby="product-detail-title"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id="product-detail-title" className="truncate text-lg font-semibold">
              بيانات المنتج
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {product?.name || "تفاصيل المنتج من الباك"}
            </p>
          </div>
          <button
            aria-label="إغلاق"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={onClose}
            type="button"
          >
            <XCircle className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              جاري تحميل بيانات المنتج...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : product ? (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <DashboardImage
                  alt={product.name}
                  src={primaryProductImageUrl(product)}
                  placeholderType="product"
                  width={180}
                  height={180}
                  sizes="180px"
                  className="h-44 w-full rounded-md border bg-muted/30 md:w-44"
                  imageClassName="object-contain p-2"
                />
                <div className="grid gap-3">
                  <div>
                    <h3 className="text-xl font-black leading-8">{product.name || "-"}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {product.description || "-"}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow label="السوق" value={nestedDetailName(product.market)} />
                    <DetailRow label="فرع السوق" value={detailText(product.market?.branch)} />
                    <DetailRow label="قسم المنتج" value={nestedDetailName(product.subcategory)} />
                    <DetailRow label="الحالة" value={product.isAvailable ? "متاح" : "غير متاح"} />
                    <DetailRow label="الخصم" value={`${detailText(product.discount, "0.00")}%`} />
                    <DetailRow label="رقم المنتج" value={`#${product.id}`} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b bg-muted/20 px-4 py-3 text-sm font-semibold">
                  المتغيرات والأسعار
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-155 text-sm">
                    <thead className="bg-muted/30 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-start">SKU</th>
                        <th className="px-4 py-2 text-start">السعر</th>
                        <th className="px-4 py-2 text-start">الخصائص</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.length ? (
                        variants.map((variant, index) => {
                          const attributes = Array.isArray(variant.attribute_values)
                            ? variant.attribute_values.map(variantAttributeLabel).filter(Boolean)
                            : [];

                          return (
                            <tr key={`${variant.id ?? "variant"}-${index}`} className="border-t">
                              <td className="px-4 py-3 font-medium" dir="ltr">
                                {detailText(variant.sku, "-")}
                              </td>
                              <td className="px-4 py-3">
                                <CurrencyText>{formatItemPrice(`EGP ${detailText(variant.price, "0.00")}`)}</CurrencyText>
                              </td>
                              <td className="px-4 py-3">
                                {attributes.length ? attributes.join("، ") : "-"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="px-4 py-6 text-center text-muted-foreground" colSpan={3}>
                            لا توجد متغيرات.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <DetailRow
                  label="الإضافات"
                  value={
                    additions.length
                      ? additions.map((additionId) =>
                          productAdditionLabel(additionId, additionsById),
                        ).join("، ")
                      : "-"
                  }
                />
                <DetailRow label="تاريخ الإنشاء" value={productDetailDate(product.createdAt)} />
                <DetailRow label="آخر تحديث" value={productDetailDate(product.updatedAt)} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
