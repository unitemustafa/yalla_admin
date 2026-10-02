import type { ApiFetch } from "../admin-api";
import { loadServiceCities } from "../cities/api";
import {
  apiResponseData,
  firstApiError,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";
import { courierOrderTimestamp } from "./domain";
import { assignedRepresentativeId, isActiveAssignedOrder } from "./order-rules";
import type { CourierOrder } from "./types";
import { activeCourierOrders, courierOrdersPage } from "./orders-data";

function errorMessage(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
}

function courierPayloadFormData(payload: Record<string, unknown>, avatarFile: File) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === "courier_profile" && value && typeof value === "object") {
      Object.entries(value).forEach(([profileKey, profileValue]) => {
        formData.set(`courier_profile.${profileKey}`, String(profileValue));
      });
      return;
    }
    formData.set(key, String(value));
  });
  formData.set("avatar_image", avatarFile);
  return formData;
}

export async function loadCouriersPageData(apiFetch: ApiFetch) {
  const [couriersResponse, activeOrders, cities] = await Promise.all([
    apiFetch("auth/representatives/"),
    activeCourierOrders(apiFetch),
    loadServiceCities(apiFetch, { errorFallback: "Could not load service cities." }),
  ]);
  const couriersData = await apiResponseData(couriersResponse);
  if (!couriersResponse.ok) throw new Error(errorMessage(couriersData, "Could not load couriers."));
  return {
    couriers: Array.isArray(couriersData) ? couriersData.filter(isBackendDashboardUser) : [],
    orders: activeOrders.orders,
    summaries: activeOrders.summaries,
    cities,
  };
}

export async function loadCourierFormData(apiFetch: ApiFetch, courierId?: string) {
  const cities = await loadServiceCities(apiFetch, {
    errorFallback: "Could not load service cities.",
  });
  if (!courierId) return { cities, courier: null };
  const response = await apiFetch(`auth/users/${encodeURIComponent(courierId)}/`);
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(errorMessage(data, "تعذر تحميل بيانات الطيار."));
  if (!isBackendDashboardUser(data) || data.role !== "representative") {
    throw new Error("حساب الطيار غير موجود.");
  }
  return { cities, courier: data };
}

export async function saveCourier(
  apiFetch: ApiFetch,
  courier: BackendDashboardUser | null,
  payload: Record<string, unknown>,
  avatarFile: File | null,
) {
  const response = await apiFetch(courier ? `auth/users/${courier.id}/` : "auth/users/", {
    method: courier ? "PATCH" : "POST",
    ...(avatarFile
      ? { body: courierPayloadFormData(payload, avatarFile) }
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  });
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(errorMessage(data, "Could not save courier."));
  if (!isBackendDashboardUser(data)) throw new Error("Incomplete backend response.");
  return data;
}

export async function removeCourierAvatar(apiFetch: ApiFetch, courierId: number | string) {
  const response = await apiFetch(`auth/users/${courierId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remove_avatar: true }),
  });
  const data = await apiResponseData(response);
  if (!response.ok || !isBackendDashboardUser(data)) {
    throw new Error(errorMessage(data, "تعذر حذف صورة الطيار."));
  }
  return data;
}

export async function refreshCouriers(apiFetch: ApiFetch) {
  const response = await apiFetch("auth/representatives/");
  const data = await apiResponseData(response);
  return response.ok && Array.isArray(data) ? data.filter(isBackendDashboardUser) : null;
}

export async function assignOrder(apiFetch: ApiFetch, orderId: string, courierId: number | string) {
  const response = await apiFetch(`orders/${orderId}/assignment/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ representative_id: courierId }),
  });
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(errorMessage(data, "تعذر إسناد الطلب."));
}

export async function changeCourierPassword(apiFetch: ApiFetch, courierId: number | string, password: string) {
  const response = await apiFetch(`auth/users/${courierId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(errorMessage(data, "تعذر تغيير كلمة المرور."));
}

export async function setCourierAvailability(apiFetch: ApiFetch, courierId: number | string, available: boolean) {
  const response = await apiFetch(`auth/users/${courierId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courier_profile: { is_available: available } }),
  });
  const data = await apiResponseData(response);
  if (!response.ok || !isBackendDashboardUser(data)) {
    throw new Error(errorMessage(data, "تعذر تحديث توفر الطيار."));
  }
  return data;
}

export async function loadCourierDetailData(apiFetch: ApiFetch, courierId: string, page = 1, search = "", signal?: AbortSignal) {
  const historyParams = new URLSearchParams({ representative_id: courierId, page: String(page), page_size: "25", include_courier_summary: "1" });
  if (search) historyParams.set("search", search);
  const deliveredParams = new URLSearchParams({ representative_id: courierId, status: "delivered", page: "1", page_size: "1", ordering: "-delivered_at" });
  const [courierResponse, history, active, delivered] = await Promise.all([
    apiFetch(`auth/users/${encodeURIComponent(courierId)}/`, { signal }),
    courierOrdersPage(apiFetch, historyParams, signal),
    activeCourierOrders(apiFetch, courierId, signal),
    courierOrdersPage(apiFetch, deliveredParams, signal),
  ]);
  const courierData = await apiResponseData(courierResponse);
  if (!courierResponse.ok) throw new Error(errorMessage(courierData, "تعذر تحميل بيانات الطيار."));
  if (!isBackendDashboardUser(courierData) || courierData.role !== "representative") {
    throw new Error("حساب الطيار غير موجود.");
  }
  const orders = (history.orders as CourierOrder[])
    .filter((order) => assignedRepresentativeId(order) === String(courierData.id))
    .sort((first, second) => courierOrderTimestamp(second) - courierOrderTimestamp(first));
  return { courier: courierData, orders, count: history.count,
    activeOrders: (active.orders as CourierOrder[]).filter((order) => isActiveAssignedOrder(order) && assignedRepresentativeId(order) === String(courierData.id)),
    latestDelivered: delivered.orders as CourierOrder[],
    summary: history.summaries.find((item) => String(item.assigned_representative_id) === courierId),
  };
}

export async function refreshCourier(apiFetch: ApiFetch, courierId: string) {
  const response = await apiFetch(`auth/users/${encodeURIComponent(courierId)}/`);
  const data = await apiResponseData(response);
  return response.ok && isBackendDashboardUser(data) && data.role === "representative" ? data : null;
}
