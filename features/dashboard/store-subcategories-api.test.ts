import { describe, expect, it, vi } from "vitest";

import { saveMarketSubcategories } from "./store-subcategories-api";

describe("market product sections API", () => {
  it("patches only the ordered product-section ids and normalizes the response", async () => {
    const apiFetch = vi.fn(async () => new Response(JSON.stringify({
      subcategories: [
        { id: 7, name_ar: "وجبات", name_en: "Meals", is_active: true, sort_order: 0 },
        { id: 9, name_ar: "مشروبات", name_en: "Drinks", is_active: true, sort_order: 1 },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await saveMarketSubcategories(apiFetch, "12", [7, 9]);

    expect(apiFetch).toHaveBeenCalledWith("home/markets/12/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcategory_ids: [7, 9] }),
    });
    expect(result.map((item) => item.id)).toEqual([7, 9]);
  });

  it("surfaces the backend reason when an in-use section cannot be removed", async () => {
    const apiFetch = vi.fn(async () => new Response(JSON.stringify({
      subcategory_ids: ["Move products to another subcategory before removing it from this market."],
    }), { status: 400, headers: { "Content-Type": "application/json" } }));

    await expect(saveMarketSubcategories(apiFetch, "12", [9])).rejects.toThrow(
      "انقل منتجات القسم إلى قسم آخر قبل إزالته من المحل.",
    );
  });
});
