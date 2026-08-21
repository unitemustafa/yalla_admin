import { describe, expect, it } from "vitest";

import {
  activeOrderData,
  clampedPercent,
  productChartData,
  recordList,
  topShopData,
} from "./domain";

describe("overview domain", () => {
  it("clamps percentages and accepts formatted numeric strings", () => {
    expect(clampedPercent("1,234.5")).toBe(100);
    expect(clampedPercent(-2)).toBe(0);
    expect(clampedPercent("42.5")).toBe(42.5);
    expect(clampedPercent("not-a-number")).toBe(0);
  });

  it("keeps only object records", () => {
    const nestedArray: unknown[] = [];
    expect(recordList([null, "shop", 1, { id: 2 }, nestedArray])).toEqual([
      { id: 2 },
      nestedArray,
    ]);
    expect(recordList({ id: 2 })).toEqual([]);
  });

  it("adapts product aliases without changing input order", () => {
    expect(
      productChartData([
        {
          product_name: "123456789012345",
          total_revenue: "1,250.5",
          order_count: "4",
          quantity: 7,
        },
        { title: "ثان", revenue: 10 },
      ]),
    ).toEqual([
      {
        chartName: "12345678901234...",
        name: "123456789012345",
        revenue: 1250.5,
        orders: 4,
        sold: 7,
        key: "123456789012345-0",
      },
      {
        chartName: "ثان",
        name: "ثان",
        revenue: 10,
        orders: 0,
        sold: 0,
        key: "ثان-1",
      },
    ]);
  });

  it("adapts active order fallbacks, links, markets, and status", () => {
    expect(
      activeOrderData([
        {
          id: "order/id",
          customer: { first_name: "Ada", last_name: "Lovelace" },
          total: "1,420.00",
          status: "picked_up",
          market_count: 2,
          market_names_summary: "Market A, Market B",
        },
        {
          order_id: 8,
          user_name: "Client",
          code: "CUSTOM",
          amount: 25,
          status: "under_preparation",
        },
      ]),
    ).toEqual([
      {
        key: "ORD-order/id-0",
        code: "ORD-order/id",
        customerName: "Ada Lovelace",
        marketSummary: "Market A, Market B",
        marketCount: 2,
        href: "/orders/view/order%2Fid",
        amount: 1420,
        status: "تم الاستلام",
      },
      {
        key: "CUSTOM-1",
        code: "CUSTOM",
        customerName: "Client",
        marketSummary: "غير محدد",
        marketCount: 0,
        href: "/orders/view/8",
        amount: 25,
        status: "under_preparation",
      },
    ]);
  });

  it("sorts shops by revenue and recalculates their ranks", () => {
    expect(
      topShopData([
        {
          shop_name: "Lower",
          total_revenue: 10,
          order_count: 1,
          average_items_per_order: "2.5",
        },
        {
          market_name: "Higher",
          branch_name: "Central",
          zone: "general market",
          revenue: "20",
          orders_count: 3,
        },
      ]),
    ).toEqual([
      {
        key: "Higher-1",
        rank: 1,
        name: "Higher - Central",
        zone: "general market",
        revenue: 20,
        orders: 3,
        average: 0,
      },
      {
        key: "Lower-0",
        rank: 2,
        name: "Lower",
        zone: "",
        revenue: 10,
        orders: 1,
        average: 2.5,
      },
    ]);
  });
});
