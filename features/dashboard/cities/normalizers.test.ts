import { describe, expect, it } from "vitest";

import { cityFromResponse, deliveryAreaFromResponse } from "./normalizers";

describe("city API normalizers", () => {
  it("normalizes service-city aliases and deletion mode", () => {
    expect(
      cityFromResponse({
        id: "4",
        name_ar: "مصراتة",
        center_latitude: 32.37,
        delivery_price: 5,
        deletion_mode: "blocked",
      }, true),
    ).toMatchObject({
      id: 4,
      name: "مصراتة",
      center_latitude: "32.37",
      delivery_price: "5",
      deletionMode: null,
    });
  });

  it("rejects incomplete city and delivery-area records", () => {
    expect(cityFromResponse({ id: 1, name: "" })).toBeNull();
    expect(deliveryAreaFromResponse({ id: 2, name: "الوسط", delivery_price: 3 })).toBeNull();
  });

  it("does not assume an unavailable deletion mode allows deleting", () => {
    expect(cityFromResponse({ id: 1, name: "مدينة" })?.deletionMode).toBeNull();
    expect(cityFromResponse({ id: 1, name: "مدينة", deletion_mode: "delete" })?.deletionMode).toBe("delete");
  });
});
