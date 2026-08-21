import { describe, expect, it } from "vitest";

import { filterOrders, orderMetrics } from "./list-domain";
import type { BackendOrder } from "./types";

const orders: BackendOrder[] = [
  { id: 1, order_number: "ORD-1", status: "confirmed", delivery_type: "fixed_area", customer: { id: 1, name: "سارة" } },
  { id: 2, order_number: "ORD-2", status: "assigned", delivery_type: "manual_quote", assigned_representative_id: 8, customer: { id: 2, name: "أحمد" } },
  { id: 3, order_number: "ORD-3", status: "delivered", delivery_type: "delivery", customer: { id: 3, name: "منى" } },
];

describe("orders list domain", () => {
  it("filters manual quotes with delivery orders", () => {
    expect(filterOrders(orders, [], "", "all", "delivery").map((order) => order.id))
      .toEqual([2, 3]);
  });

  it("combines status and normalized text search", () => {
    expect(filterOrders(orders, [], "سارة", "confirmed", "all").map((order) => order.id))
      .toEqual([1]);
    expect(filterOrders(orders, [], "ORD-2", "confirmed", "all")).toEqual([]);
  });

  it("calculates list metrics", () => {
    expect(orderMetrics(orders)).toEqual({
      total: 3,
      assignmentReady: 1,
      assigned: 1,
      delivered: 1,
    });
  });
});
