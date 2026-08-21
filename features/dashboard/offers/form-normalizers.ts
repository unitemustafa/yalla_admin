import type { BackendRecord } from "../admin-api";
import { offerCardFromApi } from "./domain";
import type { BundleLine, OfferFormState } from "./form-types";
import { formatDateInputValue, formatTimeInputValue } from "./schedule";

function backendRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is BackendRecord => Boolean(item && typeof item === "object"))
    : [];
}

function offerLinesFromApi(record: BackendRecord): BundleLine[] {
  return backendRecords(record.items)
    .map((item, index) => ({
      id: `offer-item-${String(item.id ?? index)}`,
      itemId: String(item.product_id ?? ""),
      variantId: String(item.variant_id ?? ""),
      quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
      applyProductDiscount: item.apply_product_discount !== false,
    }))
    .filter((line) => line.itemId);
}

export function offerFormPatchFromApi(record: BackendRecord): Partial<OfferFormState> {
  const card = offerCardFromApi(record);
  const products = backendRecords(record.products);
  const productIds = Array.isArray(record.product_ids)
    ? record.product_ids.map(String)
    : products.map((product) => String(product.id));
  const lines = offerLinesFromApi(record);
  const start = new Date(String(record.start_time));
  const end = new Date(String(record.end_time));
  const patch: Partial<OfferFormState> = {
    editingOffer: card,
    title: card.title,
    description: String(record.description ?? ""),
    selectedType: card.type,
    appearsInGeneral: card.showInGeneral,
    appearsInServiceCity: !card.showInGeneral && card.serviceCityIds.length > 0,
    serviceCityIds: card.showInGeneral ? [] : card.serviceCityIds.slice(0, 1),
    sendPushNotification: card.sendPushNotification,
    pushSentAt: card.pushSentAt,
    imageFile: null,
    imagePreview: card.image ?? "",
    imageName: card.image ? "صورة العرض الحالية" : "",
    startDate: formatDateInputValue(start),
    startTime: formatTimeInputValue(start),
    endDate: formatDateInputValue(end),
    endTime: formatTimeInputValue(end),
    useLimits: record.use_limits == null ? "" : String(record.use_limits),
    userLimit: record.user_limit == null ? "" : String(record.user_limit),
    announcementUrl: String(record.announcement_url ?? ""),
    announcementCtaLabel: String(record.announcement_cta_label ?? "تسوق الآن"),
    announcementPriority: String(record.announcement_priority ?? 0),
    announcementDisplaySeconds: String(record.announcement_display_seconds ?? 15),
  };

  if (card.type === "فلاش") {
    const line = lines[0];
    return {
      ...patch,
      flashProductIds: line ? [line.itemId] : productIds.slice(0, 1),
      flashVariantId: line?.variantId ?? "",
      flashQuantity: line?.quantity ?? 1,
      flashDiscountPercent: String(record.discount ?? "0"),
    };
  }
  if (card.type === "باكج") {
    return {
      ...patch,
      bundleItems: lines.length
        ? lines
        : productIds.map((itemId) => ({
            id: `bundle-${itemId}`,
            itemId,
            variantId: "",
            quantity: 1,
            applyProductDiscount: true,
          })),
      packageDiscountPercent: String(record.discount ?? "0"),
    };
  }
  if (card.type === "توصيل") {
    const line = lines[0];
    return {
      ...patch,
      deliveryProductId: line?.itemId ?? productIds[0] ?? "",
      deliveryVariantId: line?.variantId ?? "",
      deliveryQuantity: line?.quantity ?? 1,
    };
  }
  if (card.type === "خصم") {
    const line = lines[0];
    return {
      ...patch,
      discountProductId: line?.itemId ?? productIds[0] ?? "",
      discountVariantId: line?.variantId ?? "",
      discountQuantity: line?.quantity ?? 1,
      discountPercent: String(record.discount ?? "0"),
    };
  }
  return patch;
}
