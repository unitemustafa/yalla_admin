import type { BackendDashboardUser } from "../users/api-users";
import { orderRouteStatuses, statusLabels } from "./constants";
import { assignedRepresentativeId, money } from "./formatters";
import type { BackendOrder, BackendOrderEvent, BackendOrderStatus } from "./types";

function hasAssignedRepresentative(order: BackendOrder) {
  return Boolean(assignedRepresentativeId(order));
}

export function isAssignmentEligible(order: BackendOrder) {
  return (
    order.status === "confirmed" &&
    order.review_status === "approved" &&
    !hasAssignedRepresentative(order)
  );
}

export function isReassignmentEligible(order: BackendOrder) {
  return order.status === "assigned" && hasAssignedRepresentative(order);
}

export function orderRouteIndex(status: BackendOrderStatus) {
  if (status === "failed_delivery") return orderRouteStatuses.length;
  if (status === "cancelled") return orderRouteStatuses.length + 1;
  const index = orderRouteStatuses.indexOf(status);
  return index >= 0 ? index : 0;
}

function allowedStatusesForOrder(order: BackendOrder) {
  return new Set(order.allowed_statuses ?? []);
}

export function canMoveOrderToStatus(order: BackendOrder, nextStatus: BackendOrderStatus) {
  return order.status !== nextStatus && allowedStatusesForOrder(order).has(nextStatus);
}

function orderEventLabel(event: BackendOrderEvent, order: BackendOrder) {
  const toStatusLabel = event.to_status
    ? statusLabels[event.to_status]
    : statusLabels[order.status];
  switch (event.event_type) {
    case "order_created": return "تم إنشاء الطلب";
    case "review_approved": return "تمت الموافقة على الطلب";
    case "review_rejected": return "تم رفض الطلب";
    case "assigned": return "تم تعيين طيار";
    case "unassigned": return "تم إلغاء إسناد الطيار";
    case "delivery_price_changed": return "تم تحديث سعر التوصيل";
    case "delivery_quote_sent": return "تم إرسال سعر التوصيل للعميل";
    case "delivery_quote_accepted": return "وافق العميل على سعر التوصيل";
    case "cancelled": return "تم إلغاء الطلب";
    case "status_changed": return `تغيرت الحالة إلى ${toStatusLabel}`;
    default: return toStatusLabel ? `حدث طلب: ${toStatusLabel}` : "حدث طلب";
  }
}

function orderEventDetail(event: BackendOrderEvent) {
  if (event.note?.trim()) return event.note.trim();
  if (["delivery_price_changed", "delivery_quote_sent", "delivery_quote_accepted"].includes(event.event_type ?? "")) {
    const toPrice = event.metadata?.to_delivery_price ?? event.metadata?.delivery_price;
    if (typeof toPrice === "string" || typeof toPrice === "number") {
      return `سعر التوصيل: ${money(toPrice)}`;
    }
  }
  const actorName = event.actor?.name?.trim();
  return actorName ? `بواسطة ${actorName}` : "";
}

export type OrderTimelineEvent = {
  key: string;
  label: string;
  detail: string;
  time: string;
  active: boolean;
  cancelled: boolean;
};

export function orderTimelineEvents(order: BackendOrder): OrderTimelineEvent[] {
  if (order.history?.length) {
    return order.history
      .filter((event): event is BackendOrderEvent & { created_at: string } => Boolean(event.created_at))
      .map((event, index, events) => ({
        key: `${event.id ?? event.event_type ?? "event"}-${index}`,
        label: orderEventLabel(event, order),
        detail: orderEventDetail(event),
        time: event.created_at,
        active: index === events.length - 1,
        cancelled: event.event_type === "cancelled" || event.event_type === "review_rejected",
      }));
  }

  const events: Array<OrderTimelineEvent | null> = [
    order.created_at
      ? { key: "created", label: "تم إنشاء الطلب", detail: "", time: order.created_at, active: order.status === "pending", cancelled: false }
      : null,
    order.approved_at
      ? { key: "approved", label: "تمت الموافقة على الطلب", detail: "", time: order.approved_at, active: order.review_status === "approved", cancelled: false }
      : null,
    order.assigned_at
      ? { key: "assigned", label: "تم إسناد طيار", detail: "", time: order.assigned_at, active: order.status === "assigned", cancelled: false }
      : null,
    order.delivered_at
      ? { key: "delivered", label: "تم تسليم الطلب", detail: "", time: order.delivered_at, active: order.status === "delivered", cancelled: false }
      : null,
  ];

  if (order.rejected_at) {
    events.push({
      key: "cancelled",
      label: "تم إلغاء الطلب",
      detail: order.rejection_reason?.trim() || "",
      time: order.rejected_at,
      active: order.status === "cancelled",
      cancelled: true,
    });
  } else if (order.status === "cancelled" && order.updated_at) {
    events.push({ key: "cancelled", label: "تم إلغاء الطلب", detail: "", time: order.updated_at, active: true, cancelled: true });
  } else if (order.status === "failed_delivery" && order.updated_at) {
    events.push({ key: "failed_delivery", label: "تعذر التوصيل", detail: "", time: order.updated_at, active: true, cancelled: true });
  }

  if (order.updated_at && !isExceptionalTerminalStatus(order.status) && !order.delivered_at) {
    events.push({ key: "current", label: `الحالة الحالية: ${statusLabels[order.status]}`, detail: "", time: order.updated_at, active: true, cancelled: false });
  }
  return events.filter((event): event is OrderTimelineEvent => Boolean(event));
}

export function orderHistoryStatuses(order: BackendOrder) {
  const statuses = new Set<BackendOrderStatus>();
  for (const event of order.history ?? []) {
    if (event.from_status) statuses.add(event.from_status);
    if (event.to_status) statuses.add(event.to_status);
  }
  statuses.add(order.status);
  return statuses;
}

export function routeActiveStatus(order: BackendOrder) {
  if (orderRouteStatuses.includes(order.status)) return order.status;
  const reachedStatuses = orderHistoryStatuses(order);
  for (let index = orderRouteStatuses.length - 1; index >= 0; index -= 1) {
    const status = orderRouteStatuses[index];
    if (reachedStatuses.has(status)) return status;
  }
  return "pending";
}

export function isExceptionalTerminalStatus(status: BackendOrderStatus) {
  return status === "cancelled" || status === "failed_delivery";
}

export function isClosedOrderStatus(status: BackendOrderStatus) {
  return status === "delivered" || isExceptionalTerminalStatus(status);
}

export function representativeMap(user: BackendDashboardUser | null) {
  return user
    ? new Map([[String(user.id), user]])
    : new Map<string, BackendDashboardUser>();
}
