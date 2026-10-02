import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeOrderRequest, orderRequestKey } from "./order-idempotency";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("admin checkout request identity", () => {
  it("keeps the same key after a lost response, including a page reload", async () => {
    const payload = { user_id: 7, address_id: 3, items: [{ variant_id: 2, quantity: 1 }] };
    const first = await orderRequestKey("admin-reload", payload);
    vi.resetModules();
    const reloaded = await import("./order-idempotency");
    const retry = await reloaded.orderRequestKey("admin-reload", { items: payload.items, address_id: 3, user_id: 7 });
    expect(retry.key).toBe(first.key);
    reloaded.completeOrderRequest(retry);
  });

  it("uses a new key only after success or a meaningful payload change", async () => {
    const original = await orderRequestKey("admin-new", { user_id: 4, quantity: 1 });
    expect(await orderRequestKey("admin-new", { quantity: 1, user_id: 4 })).toEqual(original);
    expect((await orderRequestKey("admin-new", { user_id: 4, quantity: 2 })).key).not.toBe(original.key);
    completeOrderRequest(original);
    expect((await orderRequestKey("admin-new", { user_id: 4, quantity: 1 })).key).not.toBe(original.key);
  });

  it("isolates pending keys between administrators and rejects anonymous creation", async () => {
    const first = await orderRequestKey("admin-isolation-A", { user_id: 4 });
    const second = await orderRequestKey("admin-isolation-B", { user_id: 4 });
    expect(second.key).not.toBe(first.key);
    await expect(orderRequestKey("", {})).rejects.toThrow();
  });
});
