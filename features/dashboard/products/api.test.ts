import { describe, expect, it, vi } from "vitest";

import { createProduct, listProducts, productsPath } from "./api";

describe("product API", () => {
  it("loads current products and normalizes paginated data", async () => {
    const apiFetch = vi.fn(async () =>
      Response.json({ results: [
        { id: 7, name: "منتج", variants: [], deletion_mode: "blocked" },
        { id: 8, name: "منتج جديد", variants: [], deletion_mode: "delete" },
      ] }),
    );
    const products = await listProducts(apiFetch);
    expect(apiFetch).toHaveBeenCalledWith(productsPath);
    expect(products[0]?.id).toBe(7);
    expect(products[0]?.deletionMode).toBeNull();
    expect(products[1]?.deletionMode).toBe("delete");
  });

  it("sends the existing JSON product payload", async () => {
    const apiFetch = vi.fn(async () =>
      Response.json({ id: 8, name: "منتج", variants: [{ id: 1, price: "20" }] }),
    );
    await createProduct(apiFetch, {
      name: "منتج",
      is_available: true,
      variants: [{ price: "20.00", selections: [] }],
    });
    expect(apiFetch).toHaveBeenCalledWith(
      productsPath,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "منتج",
          is_available: true,
          variants: [{ price: "20.00", selections: [] }],
        }),
      }),
    );
  });
});
