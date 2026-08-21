import { safeNumber } from "../shared/money";
import { translateOrderStatus } from "../admin-api";
import {
  getMarketCount,
  getOrderMarketsSummary,
  type DashboardOrderLike,
} from "../order-display";
import type {
  ActiveOrderItem,
  BackendRecord,
  DashboardOverview,
  ProductChartItem,
  TopShopItem,
} from "./types";

export const dashboardEmptyState: DashboardOverview = {
  currency: "EGP",
  revenue: { total: 0, percentage: 0 },
  orders: { total: 0, completed: 0, incomplete: 0, completion_rate: 0 },
  customers: { new: 0, returning: 0, return_rate: 0 },
  top_products: [],
  active_orders: [],
  top_shops: [],
};

function valueText(
  record: BackendRecord | undefined,
  keys: string[],
  fallback = "",
) {
  if (!record) return fallback;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function firstValue(record: BackendRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && !value.trim()) continue;
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function fullNameFromNested(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const record = value as BackendRecord;
  const name = valueText(record, ["name"]);
  const fullName = [
    valueText(record, ["first_name"]),
    valueText(record, ["last_name"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || fullName || valueText(record, ["username"]);
}

export function clampedPercent(value: unknown) {
  return Math.min(Math.max(safeNumber(value), 0), 100);
}

export function recordList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is BackendRecord => Boolean(item && typeof item === "object"),
      )
    : [];
}

export function productChartData(items: BackendRecord[]): ProductChartItem[] {
  return items.map((item, index) => {
    const name = valueText(item, ["name", "product_name", "title"], "منتج");

    return {
      chartName: name.length > 14 ? `${name.slice(0, 14).trimEnd()}...` : name,
      name,
      revenue: safeNumber(firstValue(item, ["revenue", "total_revenue"])),
      orders: safeNumber(firstValue(item, ["orders_count", "order_count"])),
      sold: safeNumber(firstValue(item, ["quantity_sold", "quantity"])),
      key: `${name}-${index}`,
    };
  });
}

export function activeOrderData(items: BackendRecord[]): ActiveOrderItem[] {
  return items.map((order, index) => {
    const nestedCustomerName =
      fullNameFromNested(order.customer) || fullNameFromNested(order.user);
    const customerName =
      valueText(order, ["customer_name", "user_name"]) ||
      nestedCustomerName ||
      "عميل";
    const code =
      valueText(order, ["number", "order_number", "code", "description"]) ||
      `ORD-${valueText(order, ["id"], String(index + 1))}`;
    const orderId = valueText(order, ["id", "order_id"]);
    const orderLike = order as DashboardOrderLike;
    const marketSummary =
      valueText(order, ["market_names_summary"]) ||
      getOrderMarketsSummary(orderLike);
    const marketCount = getMarketCount(orderLike);

    return {
      key: `${code}-${index}`,
      code,
      customerName,
      marketSummary,
      marketCount,
      href: orderId ? `/orders/view/${encodeURIComponent(orderId)}` : "/orders",
      amount: safeNumber(firstValue(order, ["total_price", "total", "amount"])),
      status: translateOrderStatus(order.status),
    };
  });
}

export function topShopData(items: BackendRecord[]): TopShopItem[] {
  return items
    .map((shop, index) => {
      const name = valueText(shop, ["name", "market_name", "shop_name"], "محل");
      const branch = valueText(shop, ["branch", "branch_name"]);
      const zone = valueText(shop, ["zone"]);
      const revenue = safeNumber(firstValue(shop, ["revenue", "total_revenue"]));
      const orders = safeNumber(firstValue(shop, ["orders_count", "order_count"]));
      const average = safeNumber(firstValue(shop, ["average_items_per_order"]));

      return {
        key: `${name}-${index}`,
        rank: index + 1,
        name: branch ? `${name} - ${branch}` : name,
        zone,
        revenue,
        orders,
        average: Number.isFinite(average) ? average : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue)
    .map((shop, index) => ({ ...shop, rank: index + 1 }));
}
