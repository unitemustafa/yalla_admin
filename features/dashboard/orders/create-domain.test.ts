import { describe, expect, it } from "vitest";

import {
  buildOrderPayload,
  filterMarketsForAddress,
  filterOffersForMarketAndAddress,
  validateOrderDraft,
  type OrderDraftContext,
} from "./create-domain";
import type {
  BackendAddress,
  BackendMarket,
  BackendOffer,
  MarketSectionDraft,
  ProductVariantOption,
} from "./types";

const generalAddress: BackendAddress = { id: 1, manual_city: "طرابلس" };
const cityAddress: BackendAddress = { id: 2, service_city_id: 10 };
const markets: BackendMarket[] = [
  { id: 1, name: "عام", scope: "general", status: "active" },
  { id: 2, name: "مدينة 10", scope: "service_city", service_city_ids: [10], status: "active" },
  { id: 3, name: "مدينة 20", scope: "service_city", service_city_ids: [20], status: "active" },
  { id: 4, name: "مؤرشف", scope: "general", status: "archived" },
];

describe("order creation domain", () => {
  it("filters active markets by address scope and service city", () => {
    expect(filterMarketsForAddress(markets, generalAddress).map((market) => market.id))
      .toEqual([1]);
    expect(filterMarketsForAddress(markets, cityAddress).map((market) => market.id))
      .toEqual([2]);
    expect(filterMarketsForAddress(markets, null)).toEqual([]);
  });

  it("filters offers by market and address scope", () => {
    const offers: BackendOffer[] = [
      { id: 1, market_id: 1, show_in_general: true },
      { id: 2, market_id: 2, service_city_ids: [10] },
      { id: 3, market_id: 2, service_city_ids: [20] },
    ];
    expect(filterOffersForMarketAndAddress(offers, "1", generalAddress).map((offer) => offer.id))
      .toEqual([1]);
    expect(filterOffersForMarketAndAddress(offers, "2", cityAddress).map((offer) => offer.id))
      .toEqual([2]);
  });

  it("validates a complete draft and builds the unchanged API payload", () => {
    const context = createContext();
    expect(validateOrderDraft(context)).toBeNull();
    expect(buildOrderPayload(context)).toEqual({
      user_id: 7,
      delivery_address_id: 2,
      market_id: 2,
      service_city_id: 10,
      payment_method: "cash",
      description: "ملاحظة",
      delivery_note: "اتصل أولًا",
      items: [{ variant_id: 200, quantity: 2 }],
      offers: [{ offer_id: 11 }],
    });
  });

  it.each([
    ["missing customer", (context: OrderDraftContext) => { context.selectedUser = ""; }, "اختر العميل"],
    ["missing address", (context: OrderDraftContext) => { context.selectedAddressRecord = null; }, "اختر عنوان التوصيل"],
    ["invalid quantity", (context: OrderDraftContext) => { context.marketSections[0].lines[0].quantity = "0"; }, "كمية المنتج يجب أن تكون 1 أو أكثر."],
    ["duplicate market", (context: OrderDraftContext) => { context.marketSections.push({ ...context.marketSections[0], id: "second" }); }, "هذا المحل مضاف بالفعل"],
  ])("rejects %s", (_label, mutate, message) => {
    const context = createContext();
    mutate(context);
    expect(validateOrderDraft(context)).toBe(message);
  });
});

function createContext(): OrderDraftContext {
  const sections: MarketSectionDraft[] = [{
    id: "section",
    marketId: "2",
    lines: [{ id: "line", variantId: "200", quantity: "2", unitPrice: "12.50" }],
    offers: [{ id: "offer", offerId: "11" }],
  }];
  const variants: ProductVariantOption[] = [{
    id: "200",
    productId: 20,
    productName: "منتج",
    variantLabel: "كبير",
    categoryName: "تصنيف",
    marketId: 2,
    marketName: "مدينة 10",
    label: "منتج - كبير",
    price: 12.5,
    available: true,
  }];
  const offers: BackendOffer[] = [{ id: 11, market_id: 2, service_city_ids: [10] }];
  return {
    selectedUser: "7",
    selectedAddress: "2",
    selectedAddressRecord: cityAddress,
    selectedCustomer: { id: 7, role: "client" },
    marketSections: sections,
    markets,
    eligibleMarkets: [markets[1]],
    variants,
    offers,
    paymentMethod: "cash",
    description: " ملاحظة ",
    deliveryNote: " اتصل أولًا ",
  };
}
