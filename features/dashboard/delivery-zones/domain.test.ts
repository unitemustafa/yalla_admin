import { describe, expect, it } from "vitest";

import {
  createZoneDraft,
  deliveryZoneMetrics,
  filterDeliveryZones,
  validateZoneDraft,
  zoneFromDraft,
} from "./domain";
import type { DeliveryZone } from "./types";

const boundary = {
  type: "Polygon" as const,
  coordinates: [[[13, 32], [14, 32], [14, 33], [13, 32]]],
};

const zone: DeliveryZone = {
  id: "2",
  cityId: "7",
  cityName: "طرابلس",
  name: "وسط المدينة",
  fixedDeliveryPrice: 4.5,
  etaMinMinutes: 20,
  etaMaxMinutes: 30,
  boundaryGeojson: boundary,
  status: "active",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("delivery-zone domain", () => {
  it("validates polygon, price, city and ETA rules", () => {
    expect(validateZoneDraft(createZoneDraft(zone))).toEqual({});
    expect(validateZoneDraft({ ...createZoneDraft(zone), etaMaxMinutes: "10" })).toHaveProperty("etaMaxMinutes");
    expect(validateZoneDraft({ ...createZoneDraft(zone), boundaryGeojson: null })).toHaveProperty("boundaryGeojson");
  });

  it("builds a stable API model from the draft", () => {
    expect(zoneFromDraft(createZoneDraft(zone), zone, new Date("2026-08-21T10:00:00Z"))).toMatchObject({
      id: "2",
      name: "وسط المدينة",
      fixedDeliveryPrice: 4.5,
      updatedAt: "2026-08-21",
    });
  });

  it("filters by city/status text and calculates price metrics", () => {
    const second = { ...zone, id: "3", cityName: "بنغازي", fixedDeliveryPrice: 9, status: "inactive" as const };
    expect(filterDeliveryZones([zone, second], "بنغازي")).toEqual([second]);
    expect(deliveryZoneMetrics([zone, second])).toEqual({ count: 2, lowestPrice: 4.5, highestPrice: 9 });
  });
});
