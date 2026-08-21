import {
  cleanText,
  getDeliveryAreaName as orderDeliveryAreaName,
  getDeliveryPriceLabel,
  getDashboardOrderTypeLabel,
  getManualArea,
  getOrderMarketsSummary,
  getServiceCityName as orderServiceCityName,
  isGeneralOrder,
} from "../order-display";
import { fullNameFromBackendUser, type BackendDashboardUser } from "../users/api-users";
import { paymentMethodOptions, reviewStatusLabels } from "./constants";
import type { BackendOrder, BackendOrderStatus } from "./types";

export type BadgeTone = "blue" | "green" | "red" | "secondary";

export function statusTone(status: BackendOrderStatus): BadgeTone {
  if (status === "delivered") return "green";
  if (status === "cancelled" || status === "failed_delivery") return "red";
  if (["confirmed", "assigned", "picked_up"].includes(status)) return "blue";
  return "secondary";
}

export function deliveryTypeLabel(order: BackendOrder) {
  return getDashboardOrderTypeLabel(order);
}

export function isDeliveryOrder(order: BackendOrder) {
  return (
    order.fulfillment_type === "external_shipping" ||
    order.delivery_type === "delivery" ||
    order.delivery_type === "manual_quote"
  );
}

export function deliveryTypeTone(order: BackendOrder): BadgeTone {
  if (order.delivery_type === "fixed_area") return "green";
  if (isDeliveryOrder(order)) return "blue";
  if (order.delivery_price_status === "fixed") return "green";
  return "secondary";
}

export function deliveryFeeLabel(order: BackendOrder) {
  if (order.delivery_label?.trim()) return order.delivery_label;
  return getDeliveryPriceLabel(order);
}

export function fulfillmentLabel(order: BackendOrder) {
  if (order.fulfillment_type === "direct") return "توصيل مباشر";
  if (order.external_shipping_status === "quoted") return "شحن خارجي - تم التسعير";
  if (order.fulfillment_type === "external_shipping") {
    return "شحن خارجي - بانتظار التسعير";
  }
  return deliveryTypeLabel(order);
}

export function paymentMethodLabel(value: string) {
  return paymentMethodOptions.find((option) => option.value === value)?.label ?? value;
}

export function reviewStatusLabel(value: string | null | undefined) {
  const status = cleanText(value);
  return status ? reviewStatusLabels[status] ?? status : "-";
}

export function reviewStatusTone(value: string | null | undefined): BadgeTone {
  if (value === "approved") return "green";
  if (value === "rejected") return "red";
  if (value === "pending_review") return "blue";
  return "secondary";
}

export function money(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  const formatted = Number.isFinite(number)
    ? number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";
  return `${formatted} EGP`;
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function customerName(order: BackendOrder) {
  if (order.customer?.name?.trim()) return order.customer.name.trim();
  return (
    [order.customer?.first_name, order.customer?.last_name]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ") || "عميل غير معروف"
  );
}

export function orderNumber(order: BackendOrder) {
  return order.order_number || `#${order.id}`;
}

export function marketName(order: BackendOrder) {
  return getOrderMarketsSummary(order);
}

export function serviceCityName(order: BackendOrder) {
  return orderServiceCityName(order) || "-";
}

export function deliveryAreaName(order: BackendOrder) {
  if (isGeneralOrder(order)) return getManualArea(order);
  return orderDeliveryAreaName(order) || cleanText(order.delivery_address?.manual_area) || "-";
}

function representativeLookupName(user: BackendDashboardUser) {
  return fullNameFromBackendUser(user).replace(/^مستخدم #/, "مندوب #");
}

export function representativeName(order: BackendOrder) {
  const representative = order.assigned_representative;
  if (!representative) {
    const representativeId = assignedRepresentativeId(order);
    return representativeId ? `مندوب #${representativeId}` : "لم يتم تعيين مندوب";
  }
  if (representative.name?.trim()) return representative.name.trim();
  return (
    [representative.first_name, representative.last_name]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ") || "مندوب غير معروف"
  );
}

export function assignedRepresentativeId(order: BackendOrder) {
  return order.assigned_representative?.id ?? order.assigned_representative_id ?? null;
}

export function representativeNameWithLookup(
  order: BackendOrder,
  representatives: Map<string, BackendDashboardUser>,
) {
  const representativeId = assignedRepresentativeId(order);
  if (representativeId) {
    const representative = representatives.get(String(representativeId));
    if (representative) return representativeLookupName(representative);
  }
  return representativeName(order);
}

export function representativeHref(order: BackendOrder) {
  const representativeId = assignedRepresentativeId(order);
  return representativeId ? `/delivery/couriers/${representativeId}` : "/delivery/couriers";
}

export function customerHref(order: BackendOrder) {
  const customerId = order.customer?.id ?? order.user_id;
  return customerId ? `/customers/${customerId}` : "/customers";
}

export function orderLocationCoordinates(order: BackendOrder) {
  const rawLatitude = order.delivery_address?.latitude;
  const rawLongitude = order.delivery_address?.longitude;
  if (
    rawLatitude === null || rawLatitude === undefined || rawLatitude === "" ||
    rawLongitude === null || rawLongitude === undefined || rawLongitude === ""
  ) {
    return null;
  }
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  if (
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return null;
  }
  return { latitude: latitude.toFixed(7), longitude: longitude.toFixed(7) };
}

export function orderMapUrl(order: BackendOrder) {
  const coordinates = orderLocationCoordinates(order);
  if (!coordinates) return null;
  const query = encodeURIComponent(`${coordinates.latitude},${coordinates.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
