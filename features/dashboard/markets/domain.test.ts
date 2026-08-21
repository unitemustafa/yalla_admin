import { describe, expect, it } from "vitest";

import {
  createMarketDraft,
  marketCityNames,
  marketPayload,
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

  it("builds the unchanged market payload contract", () => {
    const draft = createMarketDraft(market, [classification]);
    expect(marketPayload({ ...draft, name: " متجر المدينة ", sendStoreNotification: true }, false)).toMatchObject({
      classification_id: 2,
      name: "متجر المدينة",
      scope: "service_city",
      service_city_ids: [7],
      subcategory_ids: [5],
      market_type_ids: [9],
      send_notification: true,
    });
  });
});
