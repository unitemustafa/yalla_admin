import { describe, expect, it } from "vitest";

import type { ShopRow } from "../../admin-api";
import type { ItemRow } from "../types";
import { compareItems, deriveItemFilterOptions, matchesItemFilters } from "./domain";
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

function market(overrides: Partial<ShopRow> = {}): ShopRow {
  return {
    id: "1",
    name: "المحل",
    categoryId: "10",
    category: "سوبر ماركت",
    branch: "القاهرة",
    products: "1",
    active: true,
    scope: "service_city",
    serviceCityIds: ["cairo"],
    serviceCityNames: ["القاهرة"],
    ...overrides,
  };
}

describe("product list filters", () => {
  it("searches the explicit product and shop fields", () => {
    const row = item({ shopName: "سوق المدينة" });
    expect(matchesItemFilters(row, { ...defaultFilters, search: "المدينة" })).toBe(true);
    expect(matchesItemFilters(row, { ...defaultFilters, search: "برتقال" })).toBe(false);
  });

  it("combines city, market category, and shop filters", () => {
    const row = item({
      active: false,
      marketId: "4",
      marketCategoryId: "8",
      regionSlugs: ["tripoli"],
      visibilityMode: "regions",
    });
    expect(
      matchesItemFilters(row, {
        search: "",
        scope: "cities",
        cityId: "tripoli",
        categoryId: "8",
        shopId: "4",
      }),
    ).toBe(true);
    expect(
      matchesItemFilters(row, {
        search: "",
        scope: "cities",
        cityId: "benghazi",
        categoryId: "8",
        shopId: "4",
      }),
    ).toBe(false);
  });

  it("matches an unclassified market through its fallback category", () => {
    const row = item({ marketCategoryId: "", marketId: "7" });
    expect(
      matchesItemFilters(row, {
        ...defaultFilters,
        categoryId: "__unclassified__",
        shopId: "7",
      }),
    ).toBe(true);
  });

  it("derives cities, categories, and shops only from products matching the search", () => {
    const rows = [
      item({ id: "1", name: "زيت زيتون", marketId: "1", marketCategoryId: "10" }),
      item({ id: "2", name: "زيت ذرة", marketId: "2", marketCategoryId: "20" }),
      item({ id: "3", name: "سكر", marketId: "3", marketCategoryId: "10" }),
    ];
    const markets = [
      market(),
      market({
        id: "2",
        name: "صيدلية الجيزة",
        categoryId: "20",
        category: "صيدلية",
        serviceCityIds: ["giza"],
        serviceCityNames: ["الجيزة"],
      }),
      market({ id: "3", name: "بقالة أخرى" }),
    ];

    const options = deriveItemFilterOptions({
      rows,
      markets,
      search: "زيت",
      scope: "cities",
      cityId: "cairo",
      categoryId: "10",
    });

    expect(options.cityOptions.map((option) => option.id)).toEqual(["giza", "cairo"]);
    expect(options.categoryOptions).toEqual([{ id: "10", name: "سوبر ماركت" }]);
    expect(options.eligibleMarkets.map((option) => option.id)).toEqual(["1"]);
  });

  it("supports general markets and the unclassified category fallback", () => {
    const rows = [item({ name: "زيت", marketId: "5", marketCategoryId: "" })];
    const markets = [
      market({
        id: "5",
        name: "متجر عام",
        categoryId: "",
        category: "غير مصنف",
        scope: "general",
        serviceCityIds: [],
        serviceCityNames: [],
      }),
    ];

    const options = deriveItemFilterOptions({
      rows,
      markets,
      search: "زيت",
      scope: "general",
      cityId: "",
      categoryId: "__unclassified__",
    });

    expect(options.cityOptions).toEqual([]);
    expect(options.categoryOptions).toEqual([
      { id: "__unclassified__", name: "غير مصنف" },
    ]);
    expect(options.eligibleMarkets.map((option) => option.id)).toEqual(["5"]);
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
