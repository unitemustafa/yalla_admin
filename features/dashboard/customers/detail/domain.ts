import type { CustomerRecentOrder } from "./types";

export const unavailableCustomerValue = "غير متاح";

export function recentOrdersFromBackend(value: unknown): CustomerRecentOrder[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      id: String(item.id ?? item.number ?? ""),
      number: String(item.number ?? item.id ?? ""),
      status: typeof item.status === "string" ? item.status : "",
      total: String(item.total ?? "0.00"),
      created_at: typeof item.created_at === "string" ? item.created_at : null,
    }))
    .filter((order) => order.id && order.number);
}
