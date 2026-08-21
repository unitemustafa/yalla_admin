import { describe, expect, it } from "vitest";

import {
  aggregatedOrderOffers,
  orderItemSubtotal,
  sectionTotal,
} from "./detail-domain";
import type { BackendOrder } from "./types";

describe("order detail calculations", () => {
  it("prefers an explicit section total and otherwise subtracts the discount", () => {
    expect(sectionTotal({ total_price: "18.25" })).toBe("18.25 EGP");
    expect(sectionTotal({ subtotal_price: "20", discount: "2.5" })).toBe("17.50 EGP");
  });

  it("uses the backend item subtotal and falls back to unit price times quantity", () => {
    expect(orderItemSubtotal({ id: 1, quantity: 2, unit_price: "5", subtotal: "8" }))
      .toBe("8.00 EGP");
    expect(orderItemSubtotal({ id: 1, quantity: 2, unit_price: "5" }))
      .toBe("10.00 EGP");
  });

  it("aggregates the same grouped offer once across market sections", () => {
    const order: BackendOrder = {
      id: 1,
      status: "confirmed",
      market_sections: [
        { id: 1, offers: [{ id: 1, offer_id: 9, discount_amount: "2.50" }] },
        { id: 2, offers: [{ id: 2, offer_id: 9, discount_amount: "3.50" }] },
      ],
    };
    expect(aggregatedOrderOffers(order)).toMatchObject([
      { offer_id: 9, section_id: null, discount_amount: "6" },
    ]);
  });
});
