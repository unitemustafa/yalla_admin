import { describe, expect, it } from "vitest";

import {
  cityDraft,
  cityMetrics,
  filterCities,
  payloadFromCityDraft,
  validateCityDraft,
} from "./domain";
import type { ServiceCity } from "./types";

const city: ServiceCity = {
  id: 7,
  name: "طرابلس",
  center_latitude: "32.8872000",
  center_longitude: "13.1913000",
  radius_km: "15.50",
  boundary_geojson: null,
  boundary_bbox: [13, 32, 14, 33],
  delivery_price: "4.00",
  is_active: true,
  archivedAt: null,
  deletionMode: "archive",
  delivery_area_count: 3,
  market_count: 4,
  offer_count: 2,
};

describe("cities domain", () => {
  it("normalizes an editable draft into the existing API payload", () => {
    const draft = cityDraft(city);
    expect(validateCityDraft(draft)).toBe(true);
    expect(payloadFromCityDraft({ ...draft, nameAr: "  طرابلس  " })).toMatchObject({
      name: "طرابلس",
      center_latitude: "32.8872000",
      center_longitude: "13.1913000",
      radius_km: "15.50",
      is_active: true,
    });
  });

  it("rejects invalid coordinates and radii", () => {
    expect(validateCityDraft({ ...cityDraft(city), latitude: "91" })).toBe(false);
    expect(validateCityDraft({ ...cityDraft(city), longitude: "181" })).toBe(false);
    expect(validateCityDraft({ ...cityDraft(city), radiusKm: "0" })).toBe(false);
  });

  it("filters cities and calculates relationship metrics", () => {
    const second = { ...city, id: 8, name: "بنغازي", is_active: false };
    expect(filterCities([city, second], "بنغ")).toEqual([second]);
    expect(cityMetrics([city, second])).toEqual({
      activeCount: 1,
      deliveryAreaTotal: 6,
      linkedMarkets: 8,
      linkedOffers: 4,
    });
  });
});
