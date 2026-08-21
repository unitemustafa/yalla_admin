import { describe, expect, it, vi } from "vitest";

import { createProduct, listProducts, productsPath } from "./api";

describe("product API", () => {
  it("keeps the archived list URL and normalizes paginated data", async () => {
    const apiFetch = vi.fn(async () =>
      Response.json({ results: [{ id: 7, name: "منتج", variants: [] }] }),
    );
    const products = await listProducts(apiFetch, true);
    expect(apiFetch).toHaveBeenCalledWith(`${productsPath}?archived=true`);
    expect(products[0]?.id).toBe(7);
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
