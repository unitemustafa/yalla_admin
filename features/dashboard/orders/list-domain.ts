import { getDeliveryDestination, getMarketCount, getOrderScopeLabel } from "../order-display";
import type { BackendDashboardUser } from "../users/api-users";
import { assignedRepresentativeId, customerName, marketName, orderNumber, representativeNameWithLookup } from "./formatters";
import type { BackendOrder, BackendOrderStatus } from "./types";

export type OrderDeliveryFilter = "all" | "fixed_area" | "delivery";

export function filterOrders(
  orders: BackendOrder[],
  representatives: BackendDashboardUser[],
  query: string,
  status: "all" | BackendOrderStatus,
  deliveryType: OrderDeliveryFilter,
) {
  const normalized = query.trim().toLowerCase();
  const representativeMap = new Map(
    representatives.map((representative) => [String(representative.id), representative]),
  );
  return orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    const matchesDeliveryType =
      deliveryType === "all" ||
      order.delivery_type === deliveryType ||
      (deliveryType === "delivery" && order.delivery_type === "manual_quote");
    const matchesQuery =
      !normalized ||
      [
        order.id,
        orderNumber(order),
        customerName(order),
        order.customer?.phone,
        marketName(order),
        getOrderScopeLabel(order),
        getDeliveryDestination(order),
        getMarketCount(order),
        representativeNameWithLookup(order, representativeMap),
        order.delivery_price,
        order.total_price,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    return matchesStatus && matchesDeliveryType && matchesQuery;
  });
}

export function orderMetrics(orders: BackendOrder[]) {
  return {
    total: orders.length,
    assignmentReady: orders.filter(
      (order) => order.status === "confirmed" && !assignedRepresentativeId(order),
    ).length,
    assigned: orders.filter(
      (order) => order.status === "assigned" && Boolean(assignedRepresentativeId(order)),
    ).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
  };
}
