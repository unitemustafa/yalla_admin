import { describe, expect, it } from "vitest";

import { offerCardFromApi } from "./domain";
import { filterOffers, offerListStats, translateOfferErrorMessage } from "./list-domain";

function offer(overrides: Record<string, unknown> = {}) {
  return offerCardFromApi({
    id: 1,
    title: "خصم طرابلس",
    description: "خصم الفاكهة",
    type: "discount",
    status: "active",
    show_in_general: false,
    service_city_ids: [2],
    service_cities: [{ id: 2, name: "طرابلس" }],
    start_time: "2026-08-20T00:00:00+02:00",
    end_time: "2026-08-22T00:00:00+02:00",
    ...overrides,
  });
}

describe("offer list domain", () => {
  it("combines search, type, and city filters", () => {
    const rows = [
      offer(),
      offer({ id: 2, title: "عرض عام", type: "delivery", show_in_general: true, service_city_ids: [] }),
    ];
    expect(filterOffers(rows, "طرابلس", "discount", "2").map((row) => row.id)).toEqual(["1"]);
    expect(filterOffers(rows, "", "all", "general").map((row) => row.id)).toEqual(["2"]);
  });

  it("calculates active, scheduled, and expired metrics from dates", () => {
    const rows = [
      offer(),
      offer({ id: 2, start_time: "2026-08-23T00:00:00+02:00", end_time: "2026-08-24T00:00:00+02:00" }),
      offer({ id: 3, start_time: "2026-08-18T00:00:00+02:00", end_time: "2026-08-19T00:00:00+02:00" }),
    ];
    expect(offerListStats(rows, new Date("2026-08-21T12:00:00+02:00").getTime())).toEqual({
      active: 1,
      scheduled: 1,
      expired: 1,
    });
  });

  it("localizes the backend in-use deletion error", () => {
    expect(translateOfferErrorMessage("Cannot delete offer while orders are using it"))
      .toBe("لا يمكن حذف العرض لأنه مستخدم في طلبات حالية.");
  });
});
