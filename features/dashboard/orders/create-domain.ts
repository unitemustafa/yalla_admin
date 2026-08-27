import { cleanText } from "../order-display";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import { money } from "./formatters";
import type {
  BackendAddress,
  BackendMarket,
  BackendOffer,
  BackendProduct,
  BackendProductVariant,
  BackendVariantAttribute,
  MarketSectionDraft,
  OrderCreatePayload,
  ProductVariantOption,
} from "./types";

export function draftLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function draftOfferId() {
  return `offer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emptyMarketSection(): MarketSectionDraft {
  return { id: draftSectionId(), marketId: "", lines: [], offers: [] };
}

export function marketSectionHasContent(section: MarketSectionDraft) {
  return (
    section.lines.some((line) => line.variantId) ||
    section.offers.some((offer) => offer.offerId)
  );
}

export function customerDisplayName(user: BackendDashboardUser) {
  return fullNameFromBackendUser(user) || `عميل #${user.id}`;
}

export function customerSearchText(user: BackendDashboardUser) {
  return [customerDisplayName(user), user.username, user.email, user.phone, user.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function addressLabel(address: BackendAddress) {
  return address.name?.trim() || address.line1?.trim() || `عنوان #${address.id}`;
}

function toNumberId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueNumberIds(values: unknown[]) {
  const ids: number[] = [];
  for (const value of values) {
    const id = toNumberId(value);
    if (id !== null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function getAddressServiceCityId(address: BackendAddress | null | undefined) {
  return toNumberId(address?.service_city_id ?? address?.service_city?.id);
}

export function isGeneralAddress(address: BackendAddress | null | undefined) {
  return getAddressServiceCityId(address) === null;
}

function getMarketScope(market: BackendMarket | null | undefined) {
  const explicitScope = cleanText(market?.scope).toLowerCase();
  if (explicitScope === "service_city") return "service_city";
  if (explicitScope === "general") return "general";
  return market && marketServiceCityIds(market).length > 0 ? "service_city" : "general";
}

function marketServiceCityIds(market: BackendMarket) {
  const values: unknown[] = [];
  if (Array.isArray(market.service_city_ids)) values.push(...market.service_city_ids);
  for (const city of market.service_cities ?? []) values.push(city.id);
  for (const area of market.delivery_areas ?? []) {
    if (area && typeof area === "object") {
      values.push(area.service_city_id ?? area.service_city?.id);
    }
  }
  return uniqueNumberIds(values);
}

export function filterMarketsForAddress(
  markets: BackendMarket[],
  address: BackendAddress | null,
) {
  if (!address) return [];
  const activeMarkets = markets.filter(
    (market) => market.is_active !== false && (!market.status || market.status === "active"),
  );
  if (isGeneralAddress(address)) {
    return activeMarkets.filter((market) => getMarketScope(market) === "general");
  }
  const cityId = getAddressServiceCityId(address);
  return activeMarkets.filter(
    (market) =>
      getMarketScope(market) === "service_city" &&
      cityId !== null &&
      marketServiceCityIds(market).includes(cityId),
  );
}

function productMarketId(product: BackendProduct) {
  return toNumberId(product.market_id ?? product.market?.id);
}

export function filterProductsForMarket(products: BackendProduct[], marketId: string) {
  const selectedMarketId = toNumberId(marketId);
  if (selectedMarketId === null) return [];
  return products.filter(
    (product) => productMarketId(product) === selectedMarketId && product.is_available !== false,
  );
}

function offerMarketId(offer: BackendOffer) {
  return toNumberId(offer.market_id ?? offer.market?.id);
}

function offerServiceCityIds(offer: BackendOffer) {
  const values: unknown[] = [];
  if (Array.isArray(offer.service_city_ids)) values.push(...offer.service_city_ids);
  for (const city of offer.service_cities ?? []) values.push(city.id);
  return uniqueNumberIds(values);
}

function offerShowsInGeneral(offer: BackendOffer) {
  return offer.show_in_general === true;
}

function getOfferScope(offer: BackendOffer) {
  if (offerShowsInGeneral(offer)) return "general";
  return offerServiceCityIds(offer).length > 0 ? "service_city" : "general";
}

function offerMatchesMarket(offer: BackendOffer, marketId: string) {
  const selectedMarketId = toNumberId(marketId);
  const directMarketId = offerMarketId(offer);
  return selectedMarketId !== null && directMarketId === selectedMarketId;
}

export function filterOffersForMarketAndAddress(
  offers: BackendOffer[],
  marketId: string,
  address: BackendAddress | null,
) {
  if (!address || !marketId) return [];
  if (isGeneralAddress(address)) {
    return offers.filter(
      (offer) => offerShowsInGeneral(offer) && offerMatchesMarket(offer, marketId),
    );
  }
  const cityId = getAddressServiceCityId(address);
  return offers.filter(
    (offer) =>
      !offerShowsInGeneral(offer) &&
      cityId !== null &&
      offerServiceCityIds(offer).includes(cityId) &&
      offerMatchesMarket(offer, marketId),
  );
}

function variantAttributeLabel(attribute: BackendVariantAttribute) {
  const attributeName = cleanText(attribute.attribute?.name);
  const optionValue = cleanText(attribute.option?.value) || cleanText(attribute.value);
  return [attributeName, optionValue].filter(Boolean).join(": ");
}

function getVariantPrice(variant: { price?: string | number | null }) {
  const price = Number(variant.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function getVariantLabel(variant: BackendProductVariant) {
  const explicit = cleanText(variant.label) || cleanText(variant.name);
  if (explicit) return explicit;
  const attributes = (variant.attribute_values ?? [])
    .map(variantAttributeLabel)
    .filter(Boolean);
  return attributes.length > 0
    ? attributes.join("، ")
    : cleanText(variant.sku) || `Variant #${variant.id}`;
}

export function marketLabel(market: BackendMarket) {
  return [market.name?.trim() || `محل #${market.id}`, market.branch?.trim()]
    .filter(Boolean)
    .join(" - ");
}

export function offerLabel(offer: BackendOffer) {
  return [offer.title?.trim() || `عرض #${offer.id}`, offer.type, money(offer.discount)]
    .filter(Boolean)
    .join(" - ");
}

export function buildVariantOptions(
  products: BackendProduct[],
  markets: BackendMarket[],
): ProductVariantOption[] {
  return products.flatMap((product) =>
    (product.variants ?? []).map((variant) => ({
      id: String(variant.id),
      productId: product.id,
      productName: product.name,
      variantLabel: getVariantLabel(variant),
      categoryName: product.category?.name?.trim() || "بدون تصنيف",
      marketName:
        product.market?.name?.trim() ||
        markets.find((market) => market.id === productMarketId(product))?.name?.trim() ||
        "بدون محل",
      label: `${product.name} - ${getVariantLabel(variant)} - ${money(variant.price)}${variant.sku ? ` - ${variant.sku}` : ""}`,
      price: getVariantPrice(variant),
      marketId: productMarketId(product) ?? undefined,
      sku: variant.sku,
      available: product.is_available !== false,
    })),
  );
}

export type OrderDraftContext = {
  selectedUser: string;
  selectedAddress: string;
  selectedAddressRecord: BackendAddress | null;
  selectedCustomer: BackendDashboardUser | null;
  marketSections: MarketSectionDraft[];
  markets: BackendMarket[];
  eligibleMarkets: BackendMarket[];
  variants: ProductVariantOption[];
  offers: BackendOffer[];
  paymentMethod: string;
  description: string;
  deliveryNote: string;
};

function selectedDraftLines(context: OrderDraftContext) {
  const products = context.marketSections.flatMap((section) =>
    section.lines.filter((line) => line.variantId).map((line) => ({ section, line })),
  );
  const offers = context.marketSections.flatMap((section) =>
    section.offers.filter((offer) => offer.offerId).map((offer) => ({ section, offer })),
  );
  return { products, offers };
}

export function validateOrderDraft(context: OrderDraftContext) {
  const selected = selectedDraftLines(context);
  if (!context.selectedUser || !context.selectedCustomer) return "اختر العميل";
  if (!context.selectedAddressRecord) return "اختر عنوان التوصيل";
  if (!context.marketSections.length || context.marketSections.some((section) => !section.marketId)) {
    return "اختر محل واحد على الأقل";
  }
  const marketIds = context.marketSections.map((section) => section.marketId).filter(Boolean);
  if (new Set(marketIds).size !== marketIds.length) return "هذا المحل مضاف بالفعل";
  if (!context.paymentMethod.trim()) return "طريقة الدفع مطلوبة";
  for (const section of context.marketSections) {
    const market = context.markets.find((item) => String(item.id) === section.marketId);
    if (!market) return "اختر محل واحد على الأقل";
    if (!context.eligibleMarkets.some((item) => String(item.id) === section.marketId)) {
      const sameScope = isGeneralAddress(context.selectedAddressRecord)
        ? getMarketScope(market) === "general"
        : getMarketScope(market) === "service_city";
      return sameScope
        ? "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب"
        : "لا يمكن دمج محلات جاهزة للشحن مع محلات مدينة في نفس الطلب";
    }
  }
  if (!selected.products.length && !selected.offers.length) {
    return "أضف منتجاً أو عرضاً واحداً على الأقل";
  }
  for (const { section, line } of selected.products) {
    const variantId = Number(line.variantId);
    if (!Number.isFinite(variantId) || variantId <= 0) return "اختر المنتج";
    const variant = context.variants.find((item) => item.id === line.variantId);
    if (!variant || String(variant.marketId ?? "") !== section.marketId) {
      return "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب";
    }
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return "كمية المنتج يجب أن تكون 1 أو أكثر.";
    }
  }
  for (const { section, offer } of selected.offers) {
    const selectedOffer = context.offers.find((item) => String(item.id) === offer.offerId);
    if (!selectedOffer) return "أكمل بيانات العروض أو احذف العرض غير المكتمل.";
    const allowed = filterOffersForMarketAndAddress(
      context.offers,
      section.marketId,
      context.selectedAddressRecord,
    );
    if (!allowed.some((item) => item.id === selectedOffer.id)) {
      const sameScope = isGeneralAddress(context.selectedAddressRecord)
        ? getOfferScope(selectedOffer) === "general"
        : getOfferScope(selectedOffer) === "service_city";
      return sameScope
        ? "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب"
        : isGeneralAddress(context.selectedAddressRecord)
          ? "لا يمكن استخدام عرض مدينة داخل طلب جاهز للشحن"
          : "لا يمكن استخدام عرض جاهز للشحن داخل طلب مدينة";
    }
  }
  return null;
}

export function buildOrderPayload(context: OrderDraftContext): OrderCreatePayload | null {
  const selected = selectedDraftLines(context);
  const nonEmptySections = context.marketSections.filter(marketSectionHasContent);
  const firstMarketId = nonEmptySections.map((section) => section.marketId).find(Boolean);
  if (!context.selectedUser || !context.selectedAddress || (!selected.products.length && !selected.offers.length)) {
    return null;
  }
  const serviceCityId = context.selectedAddressRecord?.service_city_id
    ? Number(context.selectedAddressRecord.service_city_id)
    : undefined;
  return {
    user_id: Number(context.selectedUser),
    delivery_address_id: Number(context.selectedAddress),
    market_id: firstMarketId ? Number(firstMarketId) : undefined,
    service_city_id: serviceCityId,
    payment_method: context.paymentMethod.trim() || "cash",
    description: context.description.trim(),
    delivery_note: context.deliveryNote.trim(),
    items: selected.products.map(({ line }) => ({
      variant_id: Number(line.variantId),
      quantity: Number(line.quantity),
    })),
    offers: selected.offers.map(({ offer }) => ({ offer_id: Number(offer.offerId) })),
    market_order: nonEmptySections.map((section) => Number(section.marketId)),
  };
}
