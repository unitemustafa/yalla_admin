import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderReviewDetails } from "./order-review-details";

describe("OrderReviewDetails", () => {
  it("shows the products and offers returned for each market section", () => {
    const html = renderToStaticMarkup(createElement(OrderReviewDetails, { order: {
      id: 5,
      order_scope: "general",
      market_count: 1,
      market_sections: [{
        id: 7,
        market: { id: 3, name: "سوق الخير" },
        subtotal_price: "200.00",
        discount: "20.00",
        total_price: "180.00",
        items: [{ id: 11, product_name: "أرز", variant_name: "كيلو", quantity: 2, unit_price: "100.00" }],
        offers: [{ id: 12, offer: { title: "خصم السوق" }, discount_amount: "20.00" }],
      }],
    } }));

    expect(html).toContain("سوق الخير");
    expect(html).toContain("أرز");
    expect(html).toContain("كيلو");
    expect(html).toContain("الكمية: 2");
    expect(html).toContain("خصم السوق");
    expect(html).toContain("180.00");
  });
});
