import {
  deliveryLaterLabel,
  getDeliveryAreaName as orderDeliveryAreaName,
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDashboardOrderTypeLabel,
  getManualArea,
  getManualCity,
  getOrderMarketsSummary,
  getServiceCityName as orderServiceCityName,
  isGeneralOrder,
  isServiceCityOrder,
  type DashboardOrderLike,
} from "../order-display";
import { firstApiError } from "../users/api-users";
import { isRecord, recordValue } from "../orders/api";
import type { ApiRecord, RepresentativeListResult } from "./types";

export function textValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function textAt(record: ApiRecord, paths: string[][], fallback = "-") {
  for (const path of paths) {
    const value = textValue(recordValue(record, path));
    if (value) return value;
  }
  return fallback;
}

export function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function numberAt(record: ApiRecord, paths: string[][], fallback = 0) {
  for (const path of paths) {
    const value = numericValue(recordValue(record, path));
    if (value !== null) return value;
  }
  return fallback;
}

function boolValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "available", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "unavailable", "inactive"].includes(normalized)) return false;
  }
  return null;
}

export function apiRecordList(value: unknown): ApiRecord[] {
  const list =
    Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value.results)
        ? value.results
        : isRecord(value) && Array.isArray(value.data)
          ? value.data
          : isRecord(value) && isRecord(value.data) && Array.isArray(value.data.results)
            ? value.data.results
            : [];
  return list.filter(isRecord);
}

export function blockerOrders(value: unknown) {
  return isRecord(value) && Array.isArray(value.orders) ? value.orders.filter(isRecord) : [];
}

export function orderId(order: ApiRecord | null) {
  return order ? textAt(order, [["id"], ["order_id"], ["orderId"]], "") : "";
}

export function orderLike(order: ApiRecord): DashboardOrderLike {
  return order;
}

export function customerName(order: ApiRecord) {
  const customer = recordValue(order, ["customer"]);
  if (isRecord(customer)) {
    const direct = textAt(customer, [["name"], ["full_name"], ["fullName"]], "");
    if (direct) return direct;
    const split = [
      textAt(customer, [["first_name"], ["firstName"]], ""),
      textAt(customer, [["last_name"], ["lastName"]], ""),
    ].filter(Boolean).join(" ");
    if (split) return split;
  }
  return textAt(order, [["customer_name"], ["customerName"], ["client_name"]]);
}

export function marketName(order: ApiRecord) {
  return getOrderMarketsSummary(orderLike(order));
}

export function marketBranch(order: ApiRecord) {
  return textAt(order, [["market", "branch"], ["branch"], ["market_branch"]]);
}

export function serviceCityName(order: ApiRecord) {
  return orderServiceCityName(orderLike(order)) || "-";
}

function deliveryAreaName(order: ApiRecord) {
  return orderDeliveryAreaName(orderLike(order)) || getManualArea(orderLike(order)) || "";
}

export function moneyLabel(value: unknown, missing = "-") {
  const number = numericValue(value);
  if (number === null) return textValue(value) || missing;
  return `${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

export function dateTimeLabel(value: unknown) {
  const text = textValue(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function deliveryDetails(order: ApiRecord) {
  const typedOrder = orderLike(order);
  const fixedArea = isServiceCityOrder(typedOrder) && Boolean(orderDeliveryAreaName(typedOrder));
  if (isGeneralOrder(typedOrder)) {
    return { type: "دليفري يدوي", city: getManualCity(typedOrder), area: getManualArea(typedOrder), price: deliveryLaterLabel, destination: getDeliveryDestination(typedOrder), tone: "blue" as const };
  }
  if (fixedArea) {
    return { type: "توصيل ثابت", city: serviceCityName(order), area: deliveryAreaName(order) || "-", price: getDeliveryPriceLabel(typedOrder), destination: getDeliveryDestination(typedOrder), tone: "green" as const };
  }
  return { type: getDashboardOrderTypeLabel(typedOrder), city: serviceCityName(order), area: deliveryAreaName(order) || "-", price: deliveryLaterLabel, destination: getDeliveryDestination(typedOrder), tone: "blue" as const };
}

export function representativeListFromApprove(value: unknown): RepresentativeListResult {
  if (!isRecord(value) || !Array.isArray(value.available_representatives)) {
    return { present: false, representatives: [] };
  }
  return { present: true, representatives: value.available_representatives.filter(isRecord) };
}

export function representativeListFromResponse(value: unknown) {
  if (isRecord(value) && Array.isArray(value.representatives)) {
    return value.representatives.filter(isRecord);
  }
  return apiRecordList(value);
}

export function representativeId(representative: ApiRecord) {
  return textAt(representative, [["representative_id"], ["id"], ["user_id"], ["user", "id"]], "");
}

export function representativeName(representative: ApiRecord) {
  const direct = textAt(representative, [["name"], ["full_name"], ["fullName"], ["user", "name"]], "");
  if (direct) return direct;
  const split = [
    textAt(representative, [["first_name"], ["user", "first_name"]], ""),
    textAt(representative, [["last_name"], ["user", "last_name"]], ""),
  ].filter(Boolean).join(" ");
  return split || `مندوب #${representativeId(representative) || "-"}`;
}

export function representativePhone(representative: ApiRecord) {
  return textAt(representative, [["phone"], ["user", "phone"]]);
}

export function representativeCity(representative: ApiRecord) {
  return textAt(representative, [["service_city", "name"], ["service_city"], ["service_city_name"], ["delivery_area_name"], ["city", "name"]]);
}

export function representativeLoad(representative: ApiRecord) {
  const active = textAt(representative, [["active_order_count"], ["current_order_count"], ["active_orders"], ["current_orders_count"]], "");
  const capacity = textAt(representative, [["max_active_orders"], ["capacity"]], "");
  return active && capacity ? `${active} / ${capacity}` : active || capacity || "-";
}

export function representativeAvailability(representative: ApiRecord) {
  const availability = boolValue(recordValue(representative, ["is_available"]) ?? recordValue(representative, ["available"]) ?? recordValue(representative, ["availability"]));
  if (availability === true) return { label: "متاح", tone: "green" as const };
  if (availability === false) return { label: "غير متاح", tone: "red" as const };
  return { label: textAt(representative, [["availability"], ["status"]], "غير محدد"), tone: "secondary" as const };
}

export function localizedApiError(value: unknown, fallback: string) {
  if (isRecord(value) && "representative_id" in value) {
    const message = firstApiError(value.representative_id);
    if (message) return message;
  }
  const message = firstApiError(value);
  if (!message) return fallback;
  const normalized = message.toLowerCase();
  if (normalized.includes("already") && normalized.includes("review")) return "تمت مراجعة الطلب بالفعل. حدّث التنبيه.";
  if (normalized.includes("approved before assignment") || normalized.includes("must be approved")) return "يجب قبول الطلب قبل إسناده للمندوب.";
  if (normalized.includes("same service city") || normalized.includes("service city")) return "المندوب ليس في نفس مدينة خدمة الطلب.";
  if (normalized.includes("unauthorized") || normalized.includes("authentication")) return "انتهت الجلسة أو لا تملك صلاحية تنفيذ هذا الإجراء.";
  return message;
}
