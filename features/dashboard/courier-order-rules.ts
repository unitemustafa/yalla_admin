type AssignedRepresentativeShape =
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
  "assigned",
  "picked_up",
]);

export function assignedRepresentativeId(order: CourierOrderRuleLike) {
  const representative = order.assigned_representative;
  if (typeof representative === "number" || typeof representative === "string") {
    return String(representative);
  }
  return String(representative?.id ?? order.assigned_representative_id ?? "");
}

export function isActiveAssignedOrder(order: CourierOrderRuleLike) {
  return activeAssignedStatuses.has(String(order.status ?? ""));
}
