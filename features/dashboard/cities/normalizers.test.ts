import { describe, expect, it } from "vitest";

import { cityFromResponse, deliveryAreaFromResponse } from "./normalizers";

describe("city API normalizers", () => {
  it("normalizes service-city aliases and archive metadata", () => {
    expect(
      cityFromResponse({
        id: "4",
        name_ar: "مصراتة",
        center_latitude: 32.37,
        delivery_price: 5,
        archived_at: "2026-01-01",
        deletion_mode: "archive",
      }, true),
    ).toMatchObject({
      id: 4,
      name: "مصراتة",
      center_latitude: "32.37",
      delivery_price: "5",
      archivedAt: "2026-01-01",
      deletionMode: "archive",
    });
  });

  it("rejects incomplete city and delivery-area records", () => {
    expect(cityFromResponse({ id: 1, name: "" })).toBeNull();
    expect(deliveryAreaFromResponse({ id: 2, name: "الوسط", delivery_price: 3 })).toBeNull();
  });
});
