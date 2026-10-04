import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BackendOrder } from "../types";
import { DeliveryPriceCard } from "./delivery-price-card";

function renderQuote(overrides: Partial<BackendOrder> = {}) {
  const order = { id: 1, status: "confirmed", delivery_type: "delivery", delivery_price: "75.50", external_shipping_status: "quoted", ...overrides } as BackendOrder;
  return renderToStaticMarkup(createElement(DeliveryPriceCard, { order, value: "75.50", saving: false, onChange: () => {}, onSave: () => {} }));
}

describe("delivery quote approval controls", () => {
  it("does not offer approval again after the price is approved", () => {
    const markup = renderQuote();
    expect(markup).not.toContain("إرسال للعميل للموافقة");
    expect(markup).not.toContain("اعتماد السعر من الإدارة");
    expect(markup).not.toContain("حفظ واعتماد مباشرة");
  });

  it("shows pending approval without offering a duplicate request", () => {
    const markup = renderQuote({ external_shipping_status: "awaiting_customer_approval" });
    expect(markup).toContain("في انتظار موافقة العميل");
    expect(markup).not.toContain("إرسال للعميل للموافقة");
    expect(markup).toContain("اعتماد السعر من الإدارة");
  });

  it("disables administration approval for a closed pending quote", () => {
    const markup = renderQuote({ external_shipping_status: "awaiting_customer_approval", status: "cancelled" });
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?اعتماد السعر من الإدارة/);
  });

  it("offers save and approval for an unpriced delivery order", () => {
    const markup = renderQuote({ delivery_price: null });
    expect(markup).toContain("إرسال للعميل للموافقة");
    expect(markup).toContain("حفظ واعتماد مباشرة");
  });
});
