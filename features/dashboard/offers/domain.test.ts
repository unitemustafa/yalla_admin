import { describe, expect, it } from "vitest";

import { offerCardFromApi, offerDateLifecycle, offerMarketFromApi } from "./domain";

describe("offer normalizers", () => {
  it("normalizes market scope and covered city identifiers", () => {
    expect(offerMarketFromApi({
      id: 7,
      name: "سوق المدينة",
      scope: "service_city",
      service_cities: [{ id: 3 }, { id: 4 }],
    })).toMatchObject({
      id: "7",
      name: "سوق المدينة",
      scope: "service_city",
      serviceCityIds: ["3", "4"],
    });
  });

  it("normalizes products, cities, and effective status", () => {
    const card = offerCardFromApi({
      id: 8,
      type: "flash",
      status: "active",
      effective_status: "scheduled",
      product_ids: [10, 11],
      service_city_ids: [2],
      service_cities: [{ id: 2, name: "طرابلس" }],
      start_time: "2026-08-22T10:00:00+02:00",
      end_time: "2026-08-23T10:00:00+02:00",
    });
    expect(card).toMatchObject({
      id: "8",
      type: "فلاش",
      apiType: "flash",
      effectiveStatus: "scheduled",
      status: "مجدول",
      serviceCityIds: ["2"],
      serviceCityName: "طرابلس",
      productIds: ["10", "11"],
    });
  });

  it("classifies offer dates at a fixed instant", () => {
    const now = new Date("2026-08-21T12:00:00Z").getTime();
    expect(offerDateLifecycle("2026-08-20T00:00:00Z", "2026-08-22T00:00:00Z", now)).toBe("current");
    expect(offerDateLifecycle("2026-08-23T00:00:00Z", "2026-08-24T00:00:00Z", now)).toBe("scheduled");
    expect(offerDateLifecycle("2026-08-18T00:00:00Z", "2026-08-19T00:00:00Z", now)).toBe("expired");
  });
});
