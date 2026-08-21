import { describe, expect, it } from "vitest";

import type { ItemRow } from "../products/types";
import {
  buildOfferPayload,
  marketsForOfferScope,
  packagePricing,
  productsForMarkets,
} from "./form-domain";
import { initialOfferFormState } from "./form-state";
import type { OfferMarket } from "./domain";

function product(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    index: "1",
    id: "10",
    image: "/product.png",
    name: "تفاح",
    description: "تفاح أحمر",
    category: "فاكهة",
    subcategory: "فاكهة",
    calories: "",
    price: "100",
    marketId: "4",
    featured: "لا",
    active: true,
    discountPercent: 10,
    variants: [{ id: 99, price: "100" }],
    ...overrides,
  };
}

const markets: OfferMarket[] = [
  { id: "4", name: "السوق العام", scope: "general", status: "active", serviceCityIds: [] },
  { id: "5", name: "سوق طرابلس", scope: "service_city", status: "active", serviceCityIds: ["2"] },
];

describe("offer form domain", () => {
  it("filters markets and products by the selected scope", () => {
    const state = {
      ...initialOfferFormState(),
      markets,
      appearsInGeneral: false,
      appearsInServiceCity: true,
      serviceCityIds: ["2"],
    };
    const scopedMarkets = marketsForOfferScope(state);
    expect(scopedMarkets.map((market) => market.id)).toEqual(["5"]);
    expect(productsForMarkets([
      product({ id: "10", marketId: "4" }),
      product({ id: "11", marketId: "5" }),
    ], scopedMarkets).map((item) => item.id)).toEqual(["11"]);
  });

  it("applies the product discount before the package discount", () => {
    const summary = packagePricing([
      { id: "line", itemId: "10", variantId: "99", quantity: 2, applyProductDiscount: true },
    ], [product()], "15");
    expect(summary).toMatchObject({ subtotal: 180, finalPrice: 153, saving: 27, discountRate: 15 });
  });

  it("builds the existing API payload without changing field names", () => {
    const state = {
      ...initialOfferFormState(),
      markets,
      title: "خصم الفاكهة",
      description: "عرض اليوم",
      selectedType: "خصم" as const,
      discountProductId: "10",
      discountVariantId: "99",
      discountQuantity: 2,
      discountPercent: "20",
      startDate: "2026-08-21",
      startTime: "10:00",
      endDate: "2026-08-22",
      endTime: "10:00",
      useLimits: "20",
      userLimit: "2",
    };
    const result = buildOfferPayload(state, [product()], [markets[0]], new Date("2026-08-21T08:00:00"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toMatchObject({
      market_id: 4,
      show_in_general: true,
      service_city_ids: [],
      product_ids: [10],
      items: [{ variant_id: 99, quantity: 2, apply_product_discount: true }],
      title: "خصم الفاكهة",
      description: "عرض اليوم",
      type: "discount",
      discount: "20.00",
      active_days: [],
      use_limits: 20,
      user_limit: 2,
      announcement_url: "",
      announcement_cta_label: "",
      announcement_priority: 0,
      announcement_display_seconds: 15,
      send_push_notification: false,
    });
    expect(new Date(result.payload.start_time).getTime()).toBe(new Date("2026-08-21T10:00:00").getTime());
  });

  it("validates announcement URLs and coupled usage limits", () => {
    const announcement = {
      ...initialOfferFormState(),
      title: "إعلان",
      selectedType: "إعلان" as const,
      announcementUrl: "http://example.com",
      startDate: "2026-08-21",
      startTime: "10:00",
      endDate: "2026-08-22",
      endTime: "10:00",
    };
    expect(buildOfferPayload(announcement, [], [], new Date("2026-08-21T08:00:00"))).toEqual({
      ok: false,
      message: "أدخل رابط HTTPS خارجيًا صحيحًا للإعلان.",
    });

    const discount = {
      ...announcement,
      selectedType: "خصم" as const,
      announcementUrl: "",
      discountProductId: "10",
      discountVariantId: "99",
      useLimits: "10",
      userLimit: "",
    };
    expect(buildOfferPayload(discount, [product()], [markets[0]], new Date("2026-08-21T08:00:00"))).toEqual({
      ok: false,
      message: "أدخل الحد لكل عميل عند تفعيل حدود الاستخدام.",
    });
  });
});
