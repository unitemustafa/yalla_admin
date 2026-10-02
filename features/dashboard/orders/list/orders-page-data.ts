import { apiListData } from "../../shared/api-data";
import { ordersPageSize } from "../constants";
import { orderMetrics, type OrderDeliveryFilter } from "../list-domain";
import type { BackendOrder, BackendOrderStatus } from "../types";

export function ordersListPath(input: { page: number; status: "all" | BackendOrderStatus; search: string; deliveryType: OrderDeliveryFilter }) {
  const params = new URLSearchParams({ page: String(input.page), page_size: String(ordersPageSize) });
  if (input.status !== "all") params.set("status", input.status);
  if (input.search) params.set("search", input.search);
  if (input.deliveryType !== "all") params.set("delivery_type", input.deliveryType);
  return `orders/?${params}`;
}

export function parseOrdersPage(data: unknown) {
  const orders = apiListData<BackendOrder>(data);
  const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const serverMetrics = record.metrics && typeof record.metrics === "object" ? record.metrics as Record<string, unknown> : null;
  const fallback = orderMetrics(orders);
  if (!Array.isArray(data) && (
    !Array.isArray(record.results) || typeof record.count !== "number" || !Number.isInteger(record.count) || record.count < 0 || !serverMetrics ||
    ["total", "assignmentReady", "assigned", "delivered"].some((key) => {
      const value = serverMetrics[key];
      return typeof value !== "number" || !Number.isInteger(value) || value < 0;
    })
  )) throw new Error("تعذر تحميل إحصاءات الطلبات كاملة. حاول مرة أخرى.");
  function count(value: unknown, otherwise = 0) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : otherwise;
  }
  return {
    orders,
    count: count(record.count, orders.length),
    metrics: serverMetrics ? {
      total: count(serverMetrics.total), assignmentReady: count(serverMetrics.assignmentReady),
      assigned: count(serverMetrics.assigned), delivered: count(serverMetrics.delivered),
    } : fallback,
  };
}
