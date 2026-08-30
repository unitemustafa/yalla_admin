import { describe, expect, it, vi } from "vitest";

import { saveMarketType } from "./market-types-api";

describe("market types API", () => {
  it("mirrors the Arabic name into the compatibility field on edit", async () => {
    const apiFetch = vi.fn(async () => new Response(JSON.stringify({
      id: 12,
      classification_id: 3,
      name_ar: "برجر",
      name_en: "برجر",
      image: "/media/market-types/burger.webp",
      sort_order: 2,
      is_active: true,
      market_count: 4,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await saveMarketType(apiFetch, {
      id: 12,
      classification_id: 3,
      name_ar: "  برجر  ",
      sort_order: 2,
      is_active: true,
    });

    expect(apiFetch).toHaveBeenCalledWith("home/market-types/12/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classification_id: 3,
        name_ar: "برجر",
        name_en: "برجر",
        sort_order: 2,
        is_active: true,
      }),
    });
  });
});
