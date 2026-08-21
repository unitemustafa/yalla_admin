import type { ItemRow } from "../products/types";
import { formatLocalIsoDateTime } from "./schedule";
import { offerTypeValues, type OfferMarket } from "./domain";
import type { BundleLine, OfferFormState, OfferPayload } from "./form-types";

export function selectedItemFrom(rows: ItemRow[], itemId: string) {
  return rows.find((item) => item.id === itemId) ?? null;
}

export function variantFromItem(item: ItemRow | null, variantId: string) {
  if (!item || !variantId) return null;
  return item.variants?.find((variant) => String(variant.id) === variantId) ?? null;
}

export function defaultVariantId(item: ItemRow | null) {
  return item?.variants?.length === 1 ? String(item.variants[0].id) : "";
}

export function variantPriceValue(item: ItemRow | null, variantId: string) {
  const parsed = Number(variantFromItem(item, variantId)?.price);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function lineUnitPrice(item: ItemRow | null, line: BundleLine) {
  const price = variantPriceValue(item, line.variantId ?? "");
  if (line.applyProductDiscount === false) return price;
  return price * (1 - clampDiscountPercent(item?.discountPercent ?? 0) / 100);
}

export function marketsForOfferScope(state: OfferFormState) {
  return state.markets.filter((market) => {
    if (market.status !== "active") return false;
    if (state.appearsInGeneral && market.scope !== "general") return false;
    if (!state.appearsInGeneral && market.scope !== "service_city") return false;
    if (!state.appearsInServiceCity || !state.serviceCityIds.length) return true;

    return state.serviceCityIds.every((selectedCityId) =>
      market.serviceCityIds.some((cityId) => Number(cityId) === Number(selectedCityId)),
    );
  });
}

export function productsForMarkets(products: ItemRow[], markets: OfferMarket[]) {
  const marketIds = new Set(markets.map((market) => String(market.id)));
  return products.filter((product) =>
    product.marketId ? marketIds.has(String(product.marketId)) : false,
  );
}

function selectedOfferLines(state: OfferFormState): BundleLine[] {
  if (state.selectedType === "باكج") return state.bundleItems;
  if (state.selectedType === "فلاش" && state.flashProductIds[0]) {
    return [{
      id: "flash",
      itemId: state.flashProductIds[0],
      variantId: state.flashVariantId,
      quantity: state.flashQuantity,
      applyProductDiscount: true,
    }];
  }
  if (state.selectedType === "توصيل" && state.deliveryProductId) {
    return [{
      id: "delivery",
      itemId: state.deliveryProductId,
      variantId: state.deliveryVariantId,
      quantity: state.deliveryQuantity,
      applyProductDiscount: true,
    }];
  }
  if (state.selectedType === "خصم" && state.discountProductId) {
    return [{
      id: "discount",
      itemId: state.discountProductId,
      variantId: state.discountVariantId,
      quantity: state.discountQuantity,
      applyProductDiscount: true,
    }];
  }
  return [];
}

export function selectedOfferItems(state: OfferFormState, products: ItemRow[]) {
  return selectedOfferLines(state)
    .map((line) => selectedItemFrom(products, line.itemId))
    .filter((item): item is ItemRow => Boolean(item));
}

export function packagePricing(lines: BundleLine[], products: ItemRow[], discount: string) {
  const subtotal = lines.reduce((total, line) => {
    const item = selectedItemFrom(products, line.itemId);
    return total + lineUnitPrice(item, line) * line.quantity;
  }, 0);
  const discountRate = clampDiscountPercent(Number(discount) || 0);
  const finalPrice = subtotal * (1 - discountRate / 100);
  return { subtotal, finalPrice, saving: Math.max(subtotal - finalPrice, 0), discountRate };
}

export type OfferPayloadResult =
  | { ok: true; payload: OfferPayload }
  | { ok: false; message: string; clearProducts?: boolean };

function validateScope(state: OfferFormState, markets: OfferMarket[]): OfferPayloadResult | null {
  if (!state.title.trim()) return { ok: false, message: "العنوان مطلوب" };
  if (!state.appearsInGeneral && !state.appearsInServiceCity) {
    return { ok: false, message: "اختر الظهور في العام أو المدن واحدة على الأقل." };
  }
  if (state.appearsInGeneral && state.appearsInServiceCity) {
    return { ok: false, message: "اختر العام أو مدينة واحدة فقط." };
  }
  if (state.appearsInServiceCity && !state.serviceCityIds.length) {
    return { ok: false, message: "اختر المدن" };
  }
  if (state.serviceCityIds.length > 1) {
    return { ok: false, message: "يمكن اختيار مدينة واحدة فقط للعرض." };
  }
  if (state.selectedType !== "إعلان" && !markets.length) {
    const message = state.appearsInGeneral
      ? "لا توجد محلات عامة. أنشئ محلًا عامًا من صفحة المحلات أولاً."
      : state.appearsInServiceCity && state.serviceCityIds.length
        ? "لا توجد محلات في هذه المدينة"
        : "تعذر تحديد سوق مناسب للعرض تلقائيًا.";
    return { ok: false, message };
  }
  return null;
}

function validateAnnouncement(state: OfferFormState): OfferPayloadResult | null {
  if (state.selectedType !== "إعلان") return null;
  try {
    const url = new URL(state.announcementUrl.trim());
    if (url.protocol !== "https:") throw new Error("invalid protocol");
  } catch {
    return { ok: false, message: "أدخل رابط HTTPS خارجيًا صحيحًا للإعلان." };
  }
  const priority = Number(state.announcementPriority || 0);
  const seconds = Number(state.announcementDisplaySeconds || 15);
  if (!Number.isInteger(priority) || priority < 0 || !Number.isInteger(seconds) || seconds < 1) {
    return { ok: false, message: "أدخل أولوية صحيحة ومدة ظهور بالثواني أكبر من صفر." };
  }
  return null;
}

function offerDiscount(state: OfferFormState) {
  if (state.selectedType === "فلاش") return state.flashDiscountPercent;
  if (state.selectedType === "باكج") return state.packageDiscountPercent;
  if (state.selectedType === "خصم") return state.discountPercent;
  return "0";
}

export function buildOfferPayload(
  state: OfferFormState,
  offerProducts: ItemRow[],
  markets: OfferMarket[],
  now = new Date(),
): OfferPayloadResult {
  const scopeError = validateScope(state, markets);
  if (scopeError) return scopeError;
  const announcementError = validateAnnouncement(state);
  if (announcementError) return announcementError;

  const lines = selectedOfferLines(state);
  const items = selectedOfferItems(state, offerProducts);
  const productIds = Array.from(new Set(items.map((item) => Number(item.id)).filter(Number.isFinite)));
  if (state.selectedType !== "إعلان" && !productIds.length) {
    return { ok: false, message: "اختر منتجًا واحدًا على الأقل" };
  }
  const invalidVariant = lines.some((line) =>
    !variantFromItem(selectedItemFrom(offerProducts, line.itemId), line.variantId ?? ""),
  );
  if (state.selectedType !== "إعلان" && invalidVariant) {
    return { ok: false, message: "اختر تركيبة محددة لكل منتج داخل العرض." };
  }
  const marketIds = Array.from(new Set(items.map((item) => item.marketId).filter(Boolean)));
  if (state.selectedType !== "إعلان" && state.selectedType !== "باكج" && marketIds.length !== 1) {
    return { ok: false, message: "هذا النوع من العروض يجب أن يكون تابعًا لمحل واحد." };
  }
  if (state.selectedType !== "إعلان" && productIds.some((id) =>
    !offerProducts.some((product) => Number(product.id) === id),
  )) {
    return {
      ok: false,
      message: "تم منع حفظ منتجات غير متوافقة مع السوق أو مدن الظهور الحالية.",
      clearProducts: true,
    };
  }

  const discount = Number(offerDiscount(state) || 0);
  if (!Number.isFinite(discount) || discount < 0) {
    return { ok: false, message: "قيمة الخصم يجب أن تكون صفر أو أكثر." };
  }
  const selectedStart = new Date(`${state.startDate}T${state.startTime}`);
  const end = new Date(`${state.endDate}T${state.endTime}`);
  const immediateExpiredReactivation =
    Boolean(state.editingOfferId) &&
    state.editingOffer?.effectiveStatus === "expired" &&
    state.sendPushNotification &&
    selectedStart.getTime() > now.getTime() &&
    selectedStart.getTime() - now.getTime() <= 60_000;
  const start = immediateExpiredReactivation ? new Date(now.getTime() - 1_000) : selectedStart;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return { ok: false, message: "تأكد من تاريخ ووقت بداية ونهاية العرض." };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" };
  }

  let useLimits = state.useLimits ? Number(state.useLimits) : null;
  let userLimit = state.userLimit ? Number(state.userLimit) : null;
  if (state.selectedType === "إعلان") {
    useLimits = null;
    userLimit = null;
  }
  if (
    (useLimits !== null && (!Number.isFinite(useLimits) || useLimits <= 0)) ||
    (userLimit !== null && (!Number.isFinite(userLimit) || userLimit <= 0))
  ) {
    return { ok: false, message: "حدود الاستخدام يجب أن تكون أرقامًا موجبة." };
  }
  if (useLimits !== null && userLimit === null) {
    return { ok: false, message: "أدخل الحد لكل عميل عند تفعيل حدود الاستخدام." };
  }

  const payload: OfferPayload = {
    ...(state.selectedType === "إعلان" ? {} : { market_id: Number(marketIds[0] ?? "") }),
    show_in_general: state.appearsInGeneral,
    service_city_ids: state.appearsInServiceCity ? state.serviceCityIds.map(Number) : [],
    product_ids: productIds,
    items: lines.map((line) => ({
      variant_id: Number(line.variantId),
      quantity: line.quantity,
      apply_product_discount: line.applyProductDiscount !== false,
    })),
    title: state.title.trim(),
    description: state.description.trim(),
    type: offerTypeValues[state.selectedType],
    discount: discount.toFixed(2),
    start_time: formatLocalIsoDateTime(start),
    end_time: formatLocalIsoDateTime(end),
    active_days: [],
    use_limits: useLimits,
    user_limit: useLimits === null ? null : userLimit,
    announcement_url: state.selectedType === "إعلان" ? state.announcementUrl.trim() : "",
    announcement_cta_label: state.selectedType === "إعلان" ? state.announcementCtaLabel.trim() : "",
    announcement_priority: state.selectedType === "إعلان" ? Number(state.announcementPriority || 0) : 0,
    announcement_display_seconds: state.selectedType === "إعلان" ? Number(state.announcementDisplaySeconds || 15) : 15,
    send_push_notification: state.sendPushNotification,
  };
  return { ok: true, payload };
}
