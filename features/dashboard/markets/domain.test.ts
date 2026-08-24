import { describe, expect, it } from "vitest";

import {
  createMarketDraft,
  marketCityNames,
  marketDraftCanSubmit,
  marketPayload,
  missingMarketCreatePrerequisite,
  normalizeClassification,
  validateMarketDraft,
} from "./domain";
import type { Market } from "./types";

const market: Market = {
  id: 3,
  name: "متجر المدينة",
  status: "active",
  scope: "service_city",
  classification: { id: 2, name: "مطاعم" },
  service_city_ids: [7, "7"],
  service_cities: [{ id: 7, name: "طرابلس" }],
  subcategories: [{ id: 5, name_ar: "وجبات", name_en: "Meals", description_ar: "", description_en: "", image: null, is_active: true, market_count: 1, product_count: 1, sort_order: 1 }],
  market_types: [{ id: 9, classification_id: 2, name_ar: "سريع", name_en: "Fast", image: null, sort_order: 1, is_active: true, market_count: 1 }],
  delivery_time_min_minutes: 20,
  delivery_time_max_minutes: 30,
};
const classification = { id: 2, name: "مطاعم" };

describe("market domain", () => {
  it("normalizes classifications and de-duplicates city coverage", () => {
    expect(normalizeClassification({ id: "2", name: " مطاعم ", classification_type: "popular" })).toEqual({ id: 2, name: "مطاعم", classification_type: "popular" });
    expect(marketCityNames(market, [])).toEqual(["طرابلس"]);
  });

  it("validates create-only media and delivery-time requirements", () => {
    const draft = createMarketDraft(market, [classification]);
    expect(validateMarketDraft(draft, { editing: true, hasImage: false, hasCover: false })).toBeNull();
    expect(validateMarketDraft({ ...draft, deliveryTimeMax: "10" }, { editing: false, hasImage: true, hasCover: true })).toContain("وقت توصيل");
  });

  it("allows saving a market without product sections in its draft", () => {
    const draft = createMarketDraft(market, [classification]);

    expect(
      validateMarketDraft(draft, {
        editing: false,
        hasImage: true,
        hasCover: true,
      }),
    ).toBeNull();
    expect(
      marketDraftCanSubmit(draft, {
        editing: false,
        hasImage: true,
        hasCover: true,
      }),
    ).toBe(true);
    expect(draft).not.toHaveProperty("selectedSubcategoryIds");
  });

  it("builds a market payload without product sections", () => {
    const draft = createMarketDraft(market, [classification]);
    const payload = marketPayload({ ...draft, name: " متجر المدينة ", sendStoreNotification: true }, false);
    expect(payload).toMatchObject({
      classification_id: 2,
      name: "متجر المدينة",
      scope: "service_city",
      service_city_ids: [7],
      market_type_ids: [9],
      send_notification: true,
    });
    expect(payload).not.toHaveProperty("subcategory_ids");
  });

  it("defaults new markets to a classification with an active secondary type", () => {
    const draft = createMarketDraft(undefined, [
      { id: 1, name: "بدون فئات ثانوية" },
      classification,
    ], market.market_types ?? []);
    expect(draft.classificationId).toBe("2");
  });

  it("requires primary and active secondary classifications before creating a market", () => {
    expect(missingMarketCreatePrerequisite([], [])).toBe("classification");
    expect(missingMarketCreatePrerequisite([classification], [])).toBe("market-type");
    expect(missingMarketCreatePrerequisite([classification], market.market_types ?? [])).toBeNull();
    expect(missingMarketCreatePrerequisite([classification], [
      { ...(market.market_types?.[0] ?? { id: 9, classification_id: 2, name_ar: "سريع", name_en: "Fast", image: null, sort_order: 1, market_count: 0 }), is_active: false },
    ])).toBe("market-type");
  });
});
