import { describe, expect, it } from "vitest";

import { normalizeProduct, primaryProductImageUrl, productRowFromApi } from "./normalizers";

describe("product normalizers", () => {
  it("normalizes nested product data and orders images", () => {
    const product = normalizeProduct({
      id: 9,
      name: "قميص",
      market_id: "4",
      subcategory: { id: 6, name: "ملابس" },
      theme: "clothing",
      is_popular: true,
      is_available: true,
      additions: [2, "3", { id: 4 }, { id: "bad" }],
      images: [
        { id: 2, image: "/second.png", sort_order: 2 },
        { id: 1, url: "/primary.png", is_primary: true, sort_order: 1 },
        { image: "/missing-id.png" },
      ],
      attributes: [
        {
          id: 3,
          name: " اللون ",
          options: [{ id: 7, value: " أسود " }, { id: 8, value: "" }],
        },
      ],
      variants: [{ id: 11, price: "25.50", attribute_values: [] }],
    });

    expect(product.marketId).toBe(4);
    expect(product.additions).toEqual([2, 3, 4]);
    expect(product.images.map((image) => image.id)).toEqual([1, 2]);
    expect(product.attributes[0]?.options.map((option) => option.value)).toEqual(["أسود"]);
    expect(primaryProductImageUrl(product)).toBe("/primary.png");
  });

  it("builds a list row with the product price range and market scope", () => {
    const row = productRowFromApi(
      {
        id: 12,
        name: "منتج",
        market: {
          id: 5,
          name: "المحل",
          scope: "service_city",
          service_city_names: ["طرابلس"],
        },
        theme: "consumer",
        is_available: true,
        variants: [{ id: 1, price: "10" }, { id: 2, price: "15.5" }],
      },
      0,
    );

    expect(row.price).toBe("EGP 10.00 - EGP 15.50");
    expect(row.shopName).toBe("المحل");
    expect(row.visibilityMode).toBe("regions");
    expect(row.active).toBe(true);
  });
});
