import { describe, expect, it } from "vitest";

import {
  canMoveOrderToStatus,
  isAssignmentEligible,
  isClosedOrderStatus,
  orderTimelineEvents,
  routeActiveStatus,
} from "./status-domain";
import type { BackendOrder } from "./types";

describe("order status rules", () => {
  it("uses backend allowed statuses as the transition contract", () => {
    const order = createOrder({ allowed_statuses: ["confirmed", "cancelled"] });
    expect(canMoveOrderToStatus(order, "confirmed")).toBe(true);
    expect(canMoveOrderToStatus(order, "delivered")).toBe(false);
    expect(canMoveOrderToStatus(order, "pending")).toBe(false);
  });

  it("only allows assignment for approved confirmed unassigned orders", () => {
    expect(isAssignmentEligible(createOrder({ status: "confirmed", review_status: "approved" })))
      .toBe(true);
    expect(isAssignmentEligible(createOrder({ status: "confirmed", review_status: "pending_review" })))
      .toBe(false);
    expect(isAssignmentEligible(createOrder({ status: "confirmed", review_status: "approved", assigned_representative_id: 5 })))
      .toBe(false);
  });

  it("builds timeline entries from backend history", () => {
    const events = orderTimelineEvents(createOrder({
      status: "confirmed",
      history: [
        { id: 1, event_type: "order_created", created_at: "2026-01-01T10:00:00Z" },
        { id: 2, event_type: "status_changed", to_status: "confirmed", created_at: "2026-01-01T11:00:00Z" },
      ],
    }));
    expect(events.map((event) => event.label)).toEqual([
      "تم إنشاء الطلب",
      "تغيرت الحالة إلى مؤكد",
    ]);
    expect(events.at(-1)?.active).toBe(true);
  });

  it("keeps the last reached normal route step for exceptional endings", () => {
    const order = createOrder({
      status: "cancelled",
      history: [{ from_status: "assigned", to_status: "cancelled" }],
    });
    expect(routeActiveStatus(order)).toBe("assigned");
    expect(isClosedOrderStatus(order.status)).toBe(true);
  });
});

function createOrder(patch: Partial<BackendOrder> = {}): BackendOrder {
  return { id: 1, status: "pending", ...patch };
}
