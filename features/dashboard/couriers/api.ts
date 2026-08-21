import type { ApiFetch } from "../admin-api";
import { loadServiceCities } from "../cities/api";
import {
  apiResponseData,
  firstApiError,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";
import { courierOrderTimestamp } from "./domain";
import { assignedRepresentativeId } from "./order-rules";
import type { AdminOrder, CourierOrder } from "./types";

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
  const [couriersResponse, ordersResponse, cities] = await Promise.all([
    apiFetch("auth/representatives/"),
    apiFetch("orders/"),
    loadServiceCities(apiFetch, { errorFallback: "Could not load service cities." }),
  ]);
  const [couriersData, ordersData] = await Promise.all([
    apiResponseData(couriersResponse),
    apiResponseData(ordersResponse),
  ]);
  if (!couriersResponse.ok) throw new Error(errorMessage(couriersData, "Could not load couriers."));
  if (!ordersResponse.ok) throw new Error(errorMessage(ordersData, "Could not load orders."));
  return {
    couriers: Array.isArray(couriersData) ? couriersData.filter(isBackendDashboardUser) : [],
    orders: Array.isArray(ordersData) ? ordersData as AdminOrder[] : [],
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
  if (!response.ok) throw new Error(errorMessage(data, "تعذر تحميل بيانات المندوب."));
  if (!isBackendDashboardUser(data) || data.role !== "representative") {
    throw new Error("حساب المندوب غير موجود.");
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
    throw new Error(errorMessage(data, "تعذر حذف صورة المندوب."));
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
    throw new Error(errorMessage(data, "تعذر تحديث توفر المندوب."));
  }
  return data;
}

export async function loadCourierDetailData(apiFetch: ApiFetch, courierId: string) {
  const [courierResponse, ordersResponse] = await Promise.all([
    apiFetch(`auth/users/${encodeURIComponent(courierId)}/`),
    apiFetch("orders/"),
  ]);
  const [courierData, ordersData] = await Promise.all([
    apiResponseData(courierResponse),
    apiResponseData(ordersResponse),
  ]);
  if (!courierResponse.ok) throw new Error(errorMessage(courierData, "تعذر تحميل بيانات المندوب."));
  if (!ordersResponse.ok) throw new Error(errorMessage(ordersData, "تعذر تحميل طلبات المندوب."));
  if (!isBackendDashboardUser(courierData) || courierData.role !== "representative") {
    throw new Error("حساب المندوب غير موجود.");
  }
  const orders = Array.isArray(ordersData)
    ? (ordersData as CourierOrder[])
        .filter((order) => assignedRepresentativeId(order) === String(courierData.id))
        .sort((first, second) => courierOrderTimestamp(second) - courierOrderTimestamp(first))
    : [];
  return { courier: courierData, orders };
}

export async function refreshCourier(apiFetch: ApiFetch, courierId: string) {
  const response = await apiFetch(`auth/users/${encodeURIComponent(courierId)}/`);
  const data = await apiResponseData(response);
  return response.ok && isBackendDashboardUser(data) && data.role === "representative" ? data : null;
}
