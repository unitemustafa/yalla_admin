import { describe, expect, it } from "vitest";

import { shopRowFromApi } from "./admin-api";

describe("admin API row normalizers", () => {
  it("keeps the market classification id and label", () => {
    const row = shopRowFromApi(
      {
        id: 4,
        name: "متجر المدينة",
        classification: { id: 12, name: "سوبر ماركت" },
        scope: "service_city",
        service_cities: [{ id: 3, name: "القاهرة" }],
      },
      0,
    );

    expect(row.categoryId).toBe("12");
    expect(row.category).toBe("سوبر ماركت");
    expect(row.serviceCityIds).toEqual(["3"]);
  });

  it("falls back to a flat classification id", () => {
    const row = shopRowFromApi(
      {
        id: 8,
        name: "متجر عام",
        classification_id: 21,
        classification_name: "متاجر عامة",
        scope: "general",
      },
      0,
    );

    expect(row.categoryId).toBe("21");
    expect(row.category).toBe("متاجر عامة");
  });
});
