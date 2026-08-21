import { describe, expect, it } from "vitest";

import {
  buildProductPayload,
  validateProductForm,
  variantCombinations,
} from "./domain";
import type { ProductFormValues } from "./types";

const baseValues: ProductFormValues = {
  name: " منتج ",
  description: " وصف ",
  selectedMarketId: "4",
  selectedSubcategoryId: "7",
  selectedAdditionIds: [2, Number.NaN, 3],
  theme: "clothing",
  isAvailable: true,
  isPopular: true,
  discount: "10",
  attributes: [],
  variantRows: [
    { tempId: "variant-1", price: "25", sku: "", selections: {} },
  ],
};

describe("product form domain", () => {
  it("validates the base price and required catalog choices", () => {
    expect(validateProductForm(baseValues)).toBeNull();
    expect(validateProductForm({ ...baseValues, name: "" })).toBe("اسم المنتج مطلوب");
    expect(validateProductForm({ ...baseValues, discount: "100" })).toBe("الخصم غير صالح");
    expect(
      validateProductForm({
        ...baseValues,
        variantRows: [{ ...baseValues.variantRows[0], price: "12.345" }],
      }),
    ).toBe("سعر المنتج غير صالح");
  });

  it("rejects duplicate variant combinations", () => {
    const attributes = [
      {
        clientId: "color",
        name: "اللون",
        options: [{ clientId: "black", value: "أسود", isActive: true }],
      },
    ];
    const duplicate = {
      ...baseValues,
      attributes,
      variantRows: [
        { tempId: "one", price: "20", sku: "", selections: { color: "black" } },
        { tempId: "two", price: "25", sku: "", selections: { color: "black" } },
      ],
    };
    expect(validateProductForm(duplicate)).toContain("يكرر تركيبة المتغير رقم 1");
  });

  it("builds all active option combinations", () => {
    expect(
      variantCombinations([
        {
          clientId: "size",
          name: "المقاس",
          options: [
            { clientId: "s", value: "S" },
            { clientId: "m", value: "M" },
          ],
        },
        {
          clientId: "color",
          name: "اللون",
          options: [
            { clientId: "black", value: "أسود" },
            { clientId: "red", value: "أحمر", isActive: false },
          ],
        },
      ]),
    ).toEqual([
      { size: "s", color: "black" },
      { size: "m", color: "black" },
    ]);
  });

  it("builds the API payload without changing its contract", () => {
    expect(buildProductPayload(baseValues, { includeVariants: true })).toEqual({
      market_id: 4,
      subcategory_id: 7,
      theme: "clothing",
      is_popular: true,
      is_available: true,
      name: "منتج",
      description: "وصف",
      discount: "10.00",
      additions: [2, 3],
      attributes: [],
      variants: [{ price: "25.00", selections: [] }],
    });
  });
});
