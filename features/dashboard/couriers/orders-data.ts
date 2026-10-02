import type { ApiFetch } from "../admin-api";
import { apiListData } from "../shared/api-data";
import { apiResponseData, firstApiError } from "../users/api-users";
import type { AdminOrder, CourierOrderSummary } from "./types";

export async function courierOrdersPage(apiFetch: ApiFetch, params: URLSearchParams, signal?: AbortSignal) {
  const response = await apiFetch(`orders/?${params}`, { signal });
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(firstApiError(data) ?? "تعذر تحميل طلبات الطيار.");
  const orders = apiListData<AdminOrder>(data);
  const record = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  if (!Array.isArray(data) && (!Array.isArray(record.results) ||
    typeof record.count !== "number" || !Number.isInteger(record.count) || record.count < 0)) {
    throw new Error("تعذر تحميل سجل الطلبات كاملًا. حاول مرة أخرى.");
  }
  if (params.get("include_courier_summary") === "1" && !Array.isArray(record.courier_summary)) {
    throw new Error("تعذر تحميل إحصاءات الطيارين كاملة. حاول مرة أخرى.");
  }
  return {
    orders,
    count: typeof record.count === "number" ? record.count : orders.length,
    summaries: Array.isArray(record.courier_summary) ? record.courier_summary as CourierOrderSummary[] : [],
  };
}

export async function activeCourierOrders(apiFetch: ApiFetch, representativeId?: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ scope: "active", page: "1", page_size: "100", include_courier_summary: "1", ordering: "-assigned_at" });
  if (representativeId) params.set("representative_id", representativeId);
  const first = await courierOrdersPage(apiFetch, params, signal);
  params.delete("include_courier_summary");
  const orders = [...first.orders];
  for (let page = 2; orders.length < first.count; page++) {
    params.set("page", String(page));
    const next = await courierOrdersPage(apiFetch, params, signal);
    if (!next.orders.length) throw new Error("تغيّرت قائمة الطلبات. حدّث الصفحة للمحاولة مرة أخرى.");
    orders.push(...next.orders);
  }
  return { ...first, orders };
}
