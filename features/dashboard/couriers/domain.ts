import type { ServiceCity } from "../cities/types";
import {
  getDeliveryDestination,
  getMarketCount,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  isMultiMarket,
} from "../order-display";
import {
  canonicalPhoneValue,
  displayLocalPhone,
  isValidEmail,
  isValidLocalPhone,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  passwordRules,
} from "../users/account-fields";
import {
  fullNameFromBackendUser,
  type BackendDashboardUser,
} from "../users/api-users";
import { assignedRepresentativeId, isActiveAssignedOrder } from "./order-rules";
import type {
  AdminOrder,
  CourierDraft,
  CourierFormErrors,
  CourierOrder,
  CourierOrderStatus,
} from "./types";

export const couriersPageSize = 10;
export const courierStatusPollMs = 10_000;
export const maxCourierAvatarSize = 5 * 1024 * 1024;
export const allowedCourierAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const emptyCourierDraft: CourierDraft = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  avatarUrl: "",
  vehicleType: "",
  plateNumber: "",
  serviceCity: "",
  maxActiveOrders: "1",
  isAvailable: "true",
};

export function draftFromCourier(user: BackendDashboardUser | null, cities: ServiceCity[]): CourierDraft {
  if (!user) return { ...emptyCourierDraft, serviceCity: String(cities[0]?.id ?? "") };
  return {
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    phone: displayLocalPhone(user.phone),
    password: "",
    avatarUrl: user.avatar_url ?? "",
    vehicleType: user.courier_profile?.vehicle_type ?? "",
    plateNumber: user.courier_profile?.plate_number ?? "",
    serviceCity: String(user.courier_profile?.service_city ?? cities[0]?.id ?? ""),
    maxActiveOrders: String(user.courier_profile?.max_active_orders ?? 1),
    isAvailable: user.courier_profile?.is_available === false ? "false" : "true",
  };
}

export function normalizeCourierDraftField(key: keyof CourierDraft, value: string) {
  if (key === "username") return normalizeUsername(value);
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return value.replace(/\D/g, "").slice(0, 11);
  if (key === "password") return value.replace(/\s/g, "");
  return value;
}

export function validateCourierDraft(draft: CourierDraft, isEditing: boolean) {
  const errors: CourierFormErrors = {};
  const email = normalizeEmail(draft.email);
  if (!draft.firstName.trim()) errors.firstName = "اكتب الاسم الأول.";
  if (!draft.username.trim()) errors.username = "اكتب اسم المستخدم.";
  else if (!isValidUsername(draft.username)) errors.username = "اسم المستخدم يبدأ بحرف ويكون من 3 إلى 150 حرف.";
  if (!draft.phone.trim()) errors.phone = "اكتب رقم الهاتف.";
  else if (!isValidLocalPhone(draft.phone)) errors.phone = "رقم الهاتف قصير.";
  if (!email) errors.email = "اكتب البريد الإلكتروني.";
  else if (!isValidEmail(email)) errors.email = "البريد الإلكتروني غير صحيح.";
  if (!isEditing || draft.password) {
    if (!draft.password) errors.password = "اكتب كلمة المرور.";
    else if (passwordRules(draft.password).some((rule) => !rule.done)) {
      errors.password = "كلمة المرور 8 أحرف على الأقل وبها حرف كبير ورقم ورمز خاص.";
    }
  }
  if (!draft.vehicleType.trim()) errors.vehicleType = "اكتب نوع المركبة.";
  if (!draft.plateNumber.trim()) errors.plateNumber = "اكتب رقم اللوحة.";
  if (!draft.serviceCity) errors.serviceCity = "اختر مدينة التشغيل.";
  if (!Number.isFinite(Number(draft.maxActiveOrders)) || Number(draft.maxActiveOrders) < 1) {
    errors.maxActiveOrders = "اكتب رقمًا صحيحًا أكبر من صفر.";
  }
  return errors;
}

export function courierPayload(draft: CourierDraft, courier: BackendDashboardUser | null) {
  const isEditing = Boolean(courier);
  const payload: Record<string, unknown> = {
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    username: normalizeUsername(draft.username),
    email: normalizeEmail(draft.email),
    phone: canonicalPhoneValue(draft.phone),
    role: "representative",
    is_active: isEditing ? courier?.is_active !== false : true,
    is_staff: false,
    is_superuser: false,
    courier_profile: {
      vehicle_type: draft.vehicleType.trim(),
      plate_number: draft.plateNumber.trim(),
      service_city: Number(draft.serviceCity),
      max_active_orders: Number(draft.maxActiveOrders),
      is_available: draft.isAvailable === "true",
    },
  };
  if (!isEditing && draft.password) payload.password = draft.password;
  return payload;
}

function normalizeCourierSearch(value: string) {
  return value.trim().toLocaleLowerCase("ar-EG");
}

export function orderServiceCityId(order: AdminOrder) {
  return String(order.service_city_id ?? order.service_city?.id ?? order.delivery_address?.service_city_id ?? order.delivery_address?.service_city?.id ?? "");
}

export function isAssignmentEligible(order: AdminOrder) {
  return order.status === "confirmed" && order.review_status === "approved" && !assignedRepresentativeId(order);
}

export function isReassignmentEligible(order: AdminOrder) {
  return order.status === "assigned" && Boolean(assignedRepresentativeId(order));
}

function orderCustomerName(order: AdminOrder) {
  return [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || "عميل";
}

export function assignmentOrderLabel(order: AdminOrder, courier: BackendDashboardUser) {
  const marketCount = getMarketCount(order);
  const orderLabel = [
    `#${order.id}`,
    orderCustomerName(order),
    getOrderScopeLabel(order),
    getOrderMarketsSummary(order),
    marketCount ? `${marketCount} محلات` : isMultiMarket(order) ? "متعدد المحلات" : "محل واحد",
    getDeliveryDestination(order),
    `EGP ${order.total_price}`,
  ].filter(Boolean).join(" - ");
  const currentlyAssigned = assignedRepresentativeId(order) === String(courier.id);
  const courierCityId = String(courier.courier_profile?.service_city ?? "");
  const orderCityId = orderServiceCityId(order);
  return [
    orderLabel,
    currentlyAssigned ? "مسند حالياً لهذا المندوب" : "",
    currentlyAssigned && courierCityId && orderCityId && courierCityId !== orderCityId
      ? "مدينة الطلب لا تطابق مدينة تشغيل المندوب."
      : "",
  ].filter(Boolean).join(" - ");
}

export function assignmentOrdersForCourier(
  orders: AdminOrder[],
  courier: BackendDashboardUser | null,
) {
  const courierId = String(courier?.id ?? "");
  const rows = new Map<string, AdminOrder>();
  if (courierId) {
    for (const order of orders) {
      if (isActiveAssignedOrder(order) && assignedRepresentativeId(order) === courierId) {
        rows.set(String(order.id), order);
      }
    }
  }
  for (const order of orders.filter(isAssignmentEligible)) rows.set(String(order.id), order);
  for (const order of orders.filter(isReassignmentEligible)) rows.set(String(order.id), order);
  return Array.from(rows.values());
}

export function filterAssignmentOrders(
  orders: AdminOrder[],
  courier: BackendDashboardUser | null,
  search: string,
) {
  const courierCityId = String(courier?.courier_profile?.service_city ?? "");
  const courierId = String(courier?.id ?? "");
  const cityRows = courierCityId
    ? orders.filter((order) => {
        if (assignedRepresentativeId(order) === courierId) return true;
        const orderCityId = orderServiceCityId(order);
        return !orderCityId || orderCityId === courierCityId;
      })
    : orders;
  const query = normalizeCourierSearch(search);
  if (!query || !courier) return cityRows;
  return cityRows.filter((order) =>
    normalizeCourierSearch(assignmentOrderLabel(order, courier)).includes(query),
  );
}

export function filterCouriers(
  couriers: BackendDashboardUser[],
  areaFilter: string,
  focusedCourier: string,
) {
  const areaRows = areaFilter === "all"
    ? couriers
    : couriers.filter((courier) => String(courier.courier_profile?.service_city ?? "") === areaFilter);
  const focused = normalizeCourierSearch(focusedCourier);
  if (!focused) return areaRows;
  return areaRows.filter((courier) =>
    [courier.id, courier.phone, courier.email, courier.username, fullNameFromBackendUser(courier)]
      .join(" ")
      .toLocaleLowerCase("ar-EG")
      .includes(focused),
  );
}

export function courierOrderStats(orders: AdminOrder[], courierId: number | string) {
  const representativeId = String(courierId);
  return {
    active: orders.filter((order) =>
      isActiveAssignedOrder(order) && assignedRepresentativeId(order) === representativeId,
    ).length,
    delivered: orders.filter((order) =>
      order.status === "delivered" && assignedRepresentativeId(order) === representativeId,
    ).length,
  };
}

export const courierOrderStatusLabels: Record<CourierOrderStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  delivered: "تم التسليم",
  failed_delivery: "تعذر التوصيل",
  cancelled: "ملغي",
};

export function courierOrderStatusTone(status: CourierOrderStatus) {
  if (status === "delivered") return "green" as const;
  if (status === "cancelled" || status === "failed_delivery") return "red" as const;
  if (status === "confirmed" || status === "assigned" || status === "picked_up") return "blue" as const;
  return "secondary" as const;
}

export function courierMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} EGP`;
}

export function courierDateTime(value: string | null | undefined) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function courierOrderNumber(order: CourierOrder) {
  return order.order_number?.trim() || `YM-${order.id}`;
}

export function courierCustomerName(order: CourierOrder) {
  if (order.customer?.name?.trim()) return order.customer.name.trim();
  return [order.customer?.first_name, order.customer?.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || `عميل #${order.customer?.id ?? "-"}`;
}

export function courierOrderTimestamp(order: CourierOrder) {
  const value = order.delivered_at ?? order.assigned_at ?? order.updated_at ?? order.created_at ?? "";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
