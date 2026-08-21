import {
  cleanText,
  formatOrderMoney,
  getMarketSections,
  numberValue,
  objectName,
  orderOfferTitle,
  type OrderMarketSectionLike,
} from "../order-display";
import { money } from "./formatters";
import type { BackendOrder, BackendOrderItem, BackendOrderOffer } from "./types";

export function sectionTotal(section: OrderMarketSectionLike) {
  const explicitTotal = numberValue(section.total_price);
  if (explicitTotal !== null) return money(explicitTotal);
  const subtotal = numberValue(section.subtotal_price) ?? 0;
  const discount = numberValue(section.discount) ?? 0;
  return money(Math.max(0, subtotal - discount));
}

export function orderItemSubtotal(item: BackendOrderItem) {
  if (item.subtotal !== null && item.subtotal !== undefined && item.subtotal !== "") {
    return formatOrderMoney(item.subtotal, money(0));
  }
  const unitPrice = numberValue(item.unit_price) ?? 0;
  const quantity = numberValue(item.quantity) ?? 0;
  return money(unitPrice * quantity);
}

export function orderItemDisplayName(item: BackendOrderItem) {
  return (
    cleanText(item.product_name) ||
    cleanText(item.product?.name) ||
    cleanText(item.variant?.product?.name) ||
    "منتج غير مسمى"
  );
}

export function orderItemVariantLabel(item: BackendOrderItem) {
  return cleanText(item.variant_name) || cleanText(item.variant?.sku) || "-";
}

export function orderOfferBenefitLabel(offer: BackendOrderOffer, order: BackendOrder) {
  if (cleanText(offer.offer?.type).toLowerCase() === "delivery") {
    return numberValue(order.delivery_price) === 0
      ? "توصيل مجاني"
      : "لم يُطبّق على هذا الطلب";
  }
  const percentage = numberValue(offer.offer?.discount);
  return percentage !== null
    ? `${percentage}% = ${money(offer.discount_amount)}`
    : money(offer.discount_amount);
}

export function orderOfferBenefitTitle(offer: BackendOrderOffer) {
  return cleanText(offer.offer?.type).toLowerCase() === "delivery"
    ? "ميزة العرض"
    : "إجمالي خصم العرض";
}

export function aggregatedOrderOffers(order: BackendOrder) {
  const directOffers = order.offers ?? [];
  if (directOffers.length > 0) return directOffers;
  const grouped = new Map<string, BackendOrderOffer>();
  for (const section of getMarketSections(order)) {
    for (const rawOffer of section.offers ?? []) {
      const offer = rawOffer as BackendOrderOffer;
      const offerId = cleanText(offer.offer_id ?? offer.offer?.id ?? offer.id);
      if (!offerId) continue;
      const existing = grouped.get(offerId);
      if (!existing) {
        grouped.set(offerId, {
          ...offer,
          section_id: null,
          discount_amount: String(numberValue(offer.discount_amount) ?? 0),
        });
        continue;
      }
      existing.discount_amount = String(
        (numberValue(existing.discount_amount) ?? 0) +
          (numberValue(offer.discount_amount) ?? 0),
      );
    }
  }
  return [...grouped.values()];
}

export function sectionMarketDisplayName(section: OrderMarketSectionLike) {
  return (
    objectName(section.market) ||
    (section.market_id ? `محل #${section.market_id}` : "محل غير محدد")
  );
}

export { orderOfferTitle };
