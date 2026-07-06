export type AssignedRepresentativeShape =
  | number
  | string
  | { id?: number | string | null }
  | null
  | undefined;

export type CourierOrderRuleLike = {
  status?: string | null;
  assigned_representative?: AssignedRepresentativeShape;
  assigned_representative_id?: number | string | null;
};

const activeAssignedStatuses = new Set([
  "confirmed",
  "under_preparation",
  "ready",
  "picked_up",
  "on_the_way",
]);

const terminalStatuses = new Set([
  "delivered",
  "cancelled",
  "failed_delivery",
]);

export function assignedRepresentativeId(order: CourierOrderRuleLike) {
  const representative = order.assigned_representative;
  if (typeof representative === "number" || typeof representative === "string") {
    return String(representative);
  }
  return String(representative?.id ?? order.assigned_representative_id ?? "");
}

export function isTerminalOrder(order: CourierOrderRuleLike) {
  return terminalStatuses.has(String(order.status ?? ""));
}

export function isActiveAssignedOrder(order: CourierOrderRuleLike) {
  return activeAssignedStatuses.has(String(order.status ?? ""));
}
