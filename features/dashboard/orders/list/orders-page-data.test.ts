import { describe, expect, it } from "vitest";
import { ordersListPath, parseOrdersPage } from "./orders-page-data";
import { ordersPageSize } from "../constants";

describe("server-paginated admin history", () => {
  it("sends page and filters to the server instead of downloading the whole history", () => {
    const path = ordersListPath({ page: 3, status: "delivered", search: "YM-12 & محل", deliveryType: "fixed_area" });
    const params = new URL(path, "https://example.test").searchParams;
    expect(params.get("page")).toBe("3");
    expect(params.get("page_size")).toBe(String(ordersPageSize));
    expect(params.get("search")).toBe("YM-12 & محل");
    expect(params.get("status")).toBe("delivered");
    expect(params.get("delivery_type")).toBe("fixed_area");
  });
  it("retains total history counts and metrics independently of the current page", () => {
    const data = parseOrdersPage({ results: [{ id: 2, status: "delivered" }], count: 1001,
      metrics: { total: 1001, assignmentReady: 2, assigned: 3, delivered: 800 } });
    expect(data.orders).toHaveLength(1);
    expect(data.count).toBe(1001);
    expect(data.metrics.delivered).toBe(800);
  });
  it("reports an incomplete backend response instead of presenting page totals as all-time totals", () => {
    expect(() => parseOrdersPage({ results: [{ id: 2, status: "delivered" }], count: 1001 })).toThrow("إحصاءات");
  });
});
