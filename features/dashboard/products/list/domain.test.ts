import { describe, expect, it } from "vitest";

import type { ItemRow } from "../types";
import { compareItems, matchesItemFilters } from "./domain";
import { defaultFilters } from "./types";

function item(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    index: "1",
    id: "10",
    image: "/product.png",
    name: "تفاح",
    description: "تفاح أحمر",
    category: "فاكهة",
    subcategory: "فاكهة",
    calories: "",
    price: "EGP 20.00",
    featured: "لا",
    active: true,
    visibilityMode: "general",
    ...overrides,
  };
}

describe("product list filters", () => {
  it("searches the explicit product and shop fields", () => {
    const row = item({ shopName: "سوق المدينة" });
    expect(matchesItemFilters(row, { ...defaultFilters, search: "المدينة" })).toBe(true);
    expect(matchesItemFilters(row, { ...defaultFilters, search: "برتقال" })).toBe(false);
  });

  it("combines city, shop, and status filters", () => {
    const row = item({
      active: false,
      marketId: "4",
      regionSlugs: ["tripoli"],
      visibilityMode: "regions",
    });
    expect(
      matchesItemFilters(row, {
        search: "",
        scope: "cities",
        cityIds: ["tripoli"],
        shopIds: ["4"],
        status: "inactive",
      }),
    ).toBe(true);
    expect(
      matchesItemFilters(row, {
        search: "",
        scope: "cities",
        cityIds: ["benghazi"],
        shopIds: ["4"],
        status: "inactive",
      }),
    ).toBe(false);
  });

  it("sorts by category then product name", () => {
    const rows = [
      item({ id: "1", category: "خضار", name: "جزر" }),
      item({ id: "2", category: "فاكهة", name: "موز" }),
      item({ id: "3", category: "فاكهة", name: "تفاح" }),
    ].sort(compareItems);
    expect(rows.map((row) => row.id)).toEqual(["1", "3", "2"]);
  });
});
