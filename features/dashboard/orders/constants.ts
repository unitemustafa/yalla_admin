import { orderReviewStatusLabels, orderStatusLabels } from "../order-display";
import type { BackendOrderStatus } from "./types";

export const statusOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "delivered",
  "failed_delivery",
  "cancelled",
];

export const adminStatusActionOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "failed_delivery",
];

export const orderRouteStatuses: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "delivered",
];

export const ordersPageSize = 10;
export const paymentMethodOptions = [
  { value: "cash", label: "الدفع عند الاستلام" },
];

export const statusLabels: Record<BackendOrderStatus, string> = orderStatusLabels;
export const reviewStatusLabels: Record<string, string> = orderReviewStatusLabels;
