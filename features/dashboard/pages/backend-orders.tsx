"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { PageLoadError, PageLoadingState } from "../load-error-card";
import { cn } from "@/lib/utils";
import { AppSelect, Badge, Button, Card, CurrencyText, Field, Input, PageTitle, Pagination } from "../primitives";
import { useSnackbar } from "../snackbar";
import {
  cleanText,
  formatEgyptPhoneForDisplay,
  dashboardOrdersChangedEvent,
  deliveryLaterLabel,
  formatOrderMoney,
  getDeliveryAreaName as orderDeliveryAreaName,
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDashboardOrderOfferTitles,
  getDashboardOrderTypeLabel,
  getManualArea,
  getManualCity,
  getMarketCount,
  getMarketSections,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  getServiceCityName as orderServiceCityName,
  isGeneralOrder,
  isMultiMarket,
  notifyDashboardOrdersChanged,
  numberValue,
  objectName,
  orderReviewStatusLabels,
  orderOfferTitle,
  orderStatusLabels,
  type OrderMarketSectionLike,
} from "../order-display";
import {
  apiResponseData,
  firstApiError,
  fullNameFromBackendUser,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";

type BackendOrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed_delivery"
  | "cancelled";

type BackendReviewStatus = "pending_review" | "approved" | "rejected";

type BackendDeliveryType = "fixed_area" | "delivery" | "manual_quote" | string;

type BackendAddress = {
  id: number;
  name?: string | null;
  line1?: string | null;
  street?: string | null;
  details?: string | null;
  manual_city?: string | null;
  manual_area?: string | null;
  service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
  service_city_id?: number | string | null;
  delivery_area?: { id: number; name?: string | null; delivery_price?: string | null } | null;
  delivery_area_id?: number | string | null;
  delivery_type?: BackendDeliveryType | null;
  delivery_price_preview?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  is_default?: boolean | null;
};

type BackendOrder = {
  id: number;
  user_id?: number | string | null;
  delivery_address_id?: number | string | null;
  assigned_representative_id?: number | string | null;
  market_id?: number | string | null;
  order_number?: string | null;
  market?: { id: number; name?: string | null; branch?: string | null } | null;
  customer?: {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  delivery_address?: BackendAddress | null;
  assigned_representative?: {
    id: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar?: string | null;
    avatar_url?: string | null;
    service_city_id?: number | string | null;
    service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
    is_available?: boolean | null;
    vehicle_type?: string | null;
    plate_number?: string | null;
  } | null;
  history?: BackendOrderEvent[];
  allowed_statuses?: BackendOrderStatus[];
  payment_method?: string | null;
  delivery_type?: BackendDeliveryType | null;
  delivery_price_status?: "fixed" | "pending_quote" | string | null;
  service_city?: { id: number; name?: string | null; name_ar?: string | null } | null;
  service_city_id?: number | string | null;
  delivery_area?: { id: number; name?: string | null; delivery_price?: string | null } | null;
  delivery_area_id?: number | string | null;
  custom_delivery_area?: string | null;
  delivery_label?: string | null;
  order_scope?: "general" | "service_city" | string | null;
  is_multi_market?: boolean | null;
  market_count?: number | string | null;
  market_names_summary?: string | null;
  market_sections?: OrderMarketSectionLike[] | null;
  grouped_items?: unknown;
  grouped_offers?: unknown;
  pickup_stops?: Array<{
    market_id?: number | string | null;
    market?: { id?: number | string | null; name?: string | null; branch?: string | null; status?: string | null } | null;
    pickup_status?: string | null;
    picked_up_at?: string | null;
    sort_order?: number | string | null;
  }> | null;
  has_offer?: boolean | null;
  offer_titles?: string[] | null;
  discount?: string | null;
  description?: string | null;
  delivery_note?: string | null;
  status: BackendOrderStatus;
  review_status?: BackendReviewStatus | string | null;
  delivery_price?: string | null;
  subtotal_price?: string | null;
  total_price?: string | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: BackendOrderItem[];
  offers?: BackendOrderOffer[];
};

type BackendOrderEvent = {
  id?: number | string | null;
  event_type?: string | null;
  from_status?: BackendOrderStatus | null;
  to_status?: BackendOrderStatus | null;
  actor?: {
    id?: number | string | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type BackendOrderItem = {
  id: number;
  section_id?: number | string | null;
  variant_id?: number | string | null;
  quantity: number;
  unit_price: string;
  subtotal?: string | number | null;
  product_name?: string | null;
  variant_name?: string | null;
  product?: {
    id?: number | string | null;
    name?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
  variant?: {
    id: number;
    price?: string;
    sku?: string;
    product?: {
      id: number;
      name?: string;
      market?: { id: number; name?: string };
    };
  } | null;
};

type BackendOrderOffer = {
  id?: number | string | null;
  section_id?: number | string | null;
  offer_id?: number | string | null;
  title?: string | null;
  offer_title?: string | null;
  discount_amount?: string | null;
  created_at?: string | null;
  offer?: {
    id?: number | string | null;
    title?: string | null;
    description?: string | null;
    type?: string | null;
    discount?: string | number | null;
  } | null;
};

type BackendServiceCityRef = {
  id?: number | string | null;
  name?: string | null;
  name_ar?: string | null;
};

type BackendDeliveryAreaRef = {
  id?: number | string | null;
  name?: string | null;
  service_city_id?: number | string | null;
  service_city?: BackendServiceCityRef | null;
  delivery_price?: string | number | null;
};

type BackendVariantAttribute = {
  attribute?: { name?: string | null } | null;
  option?: { value?: string | null } | null;
  value?: string | null;
};

type BackendProduct = {
  id: number;
  name: string;
  market_id?: number | string | null;
  market?: { id?: number | string | null; name?: string | null } | null;
  category?: { id: number; name?: string | null; type?: string | null } | null;
  is_available?: boolean;
  variants?: Array<{
    id: number | string;
    price: string | number;
    sku?: string | null;
    name?: string | null;
    label?: string | null;
    attribute_values?: BackendVariantAttribute[] | null;
  }>;
};

type BackendProductVariant = NonNullable<BackendProduct["variants"]>[number];

type BackendMarket = {
  id: number;
  name?: string | null;
  branch?: string | null;
  scope?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  service_city_ids?: Array<number | string>;
  service_cities?: BackendServiceCityRef[];
  delivery_area_ids?: Array<number | string>;
  deliveryAreaIds?: Array<number | string>;
  delivery_areas?: Array<number | string | BackendDeliveryAreaRef>;
};

type BackendOffer = {
  id: number;
  title?: string | null;
  type?: string | null;
  discount?: string | number | null;
  discount_amount?: string | number | null;
  status?: string | null;
  show_in_general?: boolean | null;
  scope?: string | null;
  service_city_id?: number | string | null;
  service_city?: BackendServiceCityRef | null;
  service_city_ids?: Array<number | string>;
  service_cities?: BackendServiceCityRef[];
  market_id?: number | string | null;
  market?: { id?: number | string | null; name?: string | null; scope?: string | null } | null;
  product_ids?: Array<number | string>;
  products?: Array<{
    id?: number | string | null;
    market_id?: number | string | null;
    market?: { id?: number | string | null; scope?: string | null } | null;
  }>;
};

type RepresentativeOption = {
  id: string;
  name: string;
  phone?: string | null;
};

type OrderLineDraft = {
  id: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
};

type OrderOfferDraft = {
  id: string;
  offerId: string;
};

type MarketSectionDraft = {
  id: string;
  marketId: string;
  lines: OrderLineDraft[];
  offers: OrderOfferDraft[];
};

type ProductVariantOption = {
  id: string;
  productId: number;
  productName: string;
  variantLabel: string;
  categoryName: string;
  marketId?: number;
  marketName: string;
  sku?: string | null;
  label: string;
  price: number;
  available: boolean;
};

const statusOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "delivered",
  "failed_delivery",
  "cancelled",
];

const adminStatusActionOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "failed_delivery",
];

const orderRouteStatuses: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "delivered",
];

const ordersPageSize = 10;
const paymentMethodOptions = [{ value: "cash", label: "الدفع عند الاستلام" }];

const statusLabels: Record<BackendOrderStatus, string> = orderStatusLabels;
const reviewStatusLabels: Record<string, string> = orderReviewStatusLabels;

function statusTone(status: BackendOrderStatus): "blue" | "green" | "red" | "secondary" {
  if (status === "delivered") return "green";
  if (status === "cancelled" || status === "failed_delivery") return "red";
  if (status === "confirmed" || status === "assigned" || status === "picked_up") return "blue";
  return "secondary";
}

function deliveryTypeLabel(order: BackendOrder) {
  return getDashboardOrderTypeLabel(order);
}

function isDeliveryOrder(order: BackendOrder) {
  return order.delivery_type === "delivery" || order.delivery_type === "manual_quote";
}

function deliveryTypeTone(order: BackendOrder): "blue" | "green" | "red" | "secondary" {
  if (order.delivery_type === "fixed_area") return "green";
  if (isDeliveryOrder(order)) return "blue";
  if (order.delivery_price_status === "fixed") return "green";
  return "secondary";
}

function deliveryFeeLabel(order: BackendOrder) {
  if (order.delivery_label?.trim()) return order.delivery_label;
  return getDeliveryPriceLabel(order);
}

function paymentMethodLabel(value: string) {
  return paymentMethodOptions.find((option) => option.value === value)?.label ?? value;
}

function reviewStatusLabel(value: string | null | undefined) {
  const status = cleanText(value);
  return status ? reviewStatusLabels[status] ?? status : "-";
}

function reviewStatusTone(value: string | null | undefined): "blue" | "green" | "red" | "secondary" {
  if (value === "approved") return "green";
  if (value === "rejected") return "red";
  if (value === "pending_review") return "blue";
  return "secondary";
}

function draftLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftOfferId() {
  return `offer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return `${Number.isFinite(number) ? number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"} EGP`;
}

function dateTime(value: string | null | undefined) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function customerName(order: BackendOrder) {
  if (order.customer?.name?.trim()) return order.customer.name.trim();
  return [order.customer?.first_name, order.customer?.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || "عميل غير معروف";
}

function DeliveryTypeBadge({ order }: { order: BackendOrder }) {
  const deliveryOrder = isDeliveryOrder(order);
  const Icon = deliveryOrder ? Truck : MapPin;

  return (
    <Badge tone={deliveryTypeTone(order)}>
      <span className="inline-flex flex-row-reverse items-center gap-1.5">
        <Icon className="size-3.5" />
        {deliveryTypeLabel(order)}
      </span>
    </Badge>
  );
}

function OrderDeliveryIcon({ order }: { order: BackendOrder }) {
  const deliveryOrder = isDeliveryOrder(order);
  const Icon = deliveryOrder ? Truck : MapPin;

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        deliveryOrder && "bg-red-500/10 text-red-600 dark:text-red-300",
      )}
      title={deliveryTypeLabel(order)}
      aria-label={deliveryTypeLabel(order)}
    >
      <Icon className="size-5" />
    </span>
  );
}

function orderNumber(order: BackendOrder) {
  return order.order_number || `#${order.id}`;
}

function apiListData<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as { results?: unknown; data?: unknown };
  if (Array.isArray(record.results)) return record.results as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (record.data && typeof record.data === "object") {
    const nested = record.data as { results?: unknown };
    if (Array.isArray(nested.results)) return nested.results as T[];
  }

  return [];
}

function apiOrderData(value: unknown): BackendOrder | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? first as BackendOrder : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { data?: unknown };
  if (record.data) {
    return apiOrderData(record.data);
  }
  if ("order" in record) {
    return apiOrderData((record as { order?: unknown }).order);
  }
  return value as BackendOrder;
}

function marketName(order: BackendOrder) {
  return getOrderMarketsSummary(order);
}

function serviceCityName(order: BackendOrder) {
  return orderServiceCityName(order) || "-";
}

function deliveryAreaName(order: BackendOrder) {
  if (isGeneralOrder(order)) return getManualArea(order);
  return orderDeliveryAreaName(order) || cleanText(order.delivery_address?.manual_area) || "-";
}

function assignedRepresentativeId(order: BackendOrder) {
  return order.assigned_representative?.id ?? order.assigned_representative_id ?? null;
}

function fieldApiError(record: Record<string, unknown>, field: string) {
  return field in record ? firstApiError(record[field]) : null;
}

function hasAssignedRepresentative(order: BackendOrder) {
  return Boolean(assignedRepresentativeId(order));
}

function isAssignmentEligible(order: BackendOrder) {
  return order.status === "confirmed" &&
    order.review_status === "approved" &&
    !hasAssignedRepresentative(order);
}

function isReassignmentEligible(order: BackendOrder) {
  return order.status === "assigned" && hasAssignedRepresentative(order);
}

function apiError(value: unknown, fallback: string) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if ("payment_method" in record) {
      return "طريقة الدفع مطلوبة";
    }
    if ("requires_region_selection" in record) {
      return fallback.includes("إنشاء")
        ? "حدث تعارض في عقد الباك: إنشاء طلب الأدمن يطلب اختيار منطقة تصفح. يحتاج إصلاح في الباك أو تحديث نسخة السيرفر."
        : "لا يمكن إنشاء الطلب من مسار المعاينة. تحقق أن الصفحة لا تستخدم orders/preview.";
    }
    if ("requires_address_selection" in record) {
      return "اختر عنوان توصيل صالح للعميل";
    }
    const itemMessage = fieldApiError(record, "items");
    if (itemMessage) return itemMessage;
    const offerMessage = fieldApiError(record, "offers");
    if (offerMessage) return offerMessage;
    const representativeMessage = fieldApiError(record, "representative_id");
    if (representativeMessage) {
      return representativeMessage;
    }
  }

  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("only client users can access their orders")) {
    return "تعذر إنشاء الطلب من مسار العميل. العملاء المعروضون هنا عملاء فقط، تأكد أن جلسة لوحة التحكم بصلاحية أدمن ثم أعد المحاولة.";
  }
  const normalizedMessage = normalized.trim().replace(/[.!؟?]+$/u, "");
  if (normalizedMessage === "payment_method") {
    return "طريقة الدفع مطلوبة";
  }
  if (normalizedMessage === "this field is required") {
    return "هذا الحقل مطلوب.";
  }
  if (normalizedMessage === "true") {
    return fallback;
  }
  if (normalizedMessage === "none") {
    return fallback;
  }

  return message;
}

function orderRouteIndex(status: BackendOrderStatus) {
  if (status === "failed_delivery") return orderRouteStatuses.length;
  if (status === "cancelled") return orderRouteStatuses.length + 1;
  const index = orderRouteStatuses.indexOf(status);
  return index >= 0 ? index : 0;
}

function allowedStatusesForOrder(order: BackendOrder) {
  if (Array.isArray(order.allowed_statuses)) {
    return new Set(order.allowed_statuses);
  }
  return new Set<BackendOrderStatus>();
}

function canMoveOrderToStatus(order: BackendOrder, nextStatus: BackendOrderStatus) {
  if (order.status === nextStatus) return false;
  return allowedStatusesForOrder(order).has(nextStatus);
}

function orderEventLabel(event: BackendOrderEvent, order: BackendOrder) {
  const toStatusLabel = event.to_status ? statusLabels[event.to_status] : statusLabels[order.status];
  switch (event.event_type) {
    case "order_created":
      return "تم إنشاء الطلب";
    case "review_approved":
      return "تمت الموافقة على الطلب";
    case "review_rejected":
      return "تم رفض الطلب";
    case "assigned":
      return "تم تعيين مندوب";
    case "unassigned":
      return "تم إلغاء إسناد المندوب";
    case "delivery_price_changed":
      return "تم تحديث سعر التوصيل";
    case "cancelled":
      return "تم إلغاء الطلب";
    case "status_changed":
      return `تغيرت الحالة إلى ${toStatusLabel}`;
    default:
      return toStatusLabel ? `حدث طلب: ${toStatusLabel}` : "حدث طلب";
  }
}

function orderEventDetail(event: BackendOrderEvent) {
  if (event.note?.trim()) return event.note.trim();
  if (event.event_type === "delivery_price_changed") {
    const toPrice = event.metadata?.to_delivery_price;
    if (typeof toPrice === "string" || typeof toPrice === "number") {
      return `سعر التوصيل: ${money(toPrice)}`;
    }
  }
  const actorName = event.actor?.name?.trim();
  return actorName ? `بواسطة ${actorName}` : "";
}

function orderTimelineEvents(order: BackendOrder) {
  if (Array.isArray(order.history) && order.history.length > 0) {
    return order.history
      .filter((event) => event.created_at)
      .map((event, index, events) => ({
        key: `${event.id ?? event.event_type ?? "event"}-${index}`,
        label: orderEventLabel(event, order),
        detail: orderEventDetail(event),
        time: event.created_at as string,
        active: index === events.length - 1,
        cancelled: event.event_type === "cancelled" || event.event_type === "review_rejected",
      }));
  }

  return [
    order.created_at
      ? { key: "created", label: "تم إنشاء الطلب", detail: "", time: order.created_at, active: order.status === "pending", cancelled: false }
      : null,
    order.approved_at
      ? { key: "approved", label: "تمت الموافقة على الطلب", detail: "", time: order.approved_at, active: order.review_status === "approved", cancelled: false }
      : null,
    order.assigned_at
      ? { key: "assigned", label: "تم إسناد مندوب", detail: "", time: order.assigned_at, active: order.status === "assigned", cancelled: false }
      : null,
    order.delivered_at
      ? { key: "delivered", label: "تم تسليم الطلب", detail: "", time: order.delivered_at, active: order.status === "delivered", cancelled: false }
      : null,
    order.rejected_at
      ? { key: "cancelled", label: "تم إلغاء الطلب", detail: order.rejection_reason?.trim() || "", time: order.rejected_at, active: order.status === "cancelled", cancelled: true }
      : order.status === "cancelled" && order.updated_at
        ? { key: "cancelled", label: "تم إلغاء الطلب", detail: "", time: order.updated_at, active: true, cancelled: true }
        : order.status === "failed_delivery" && order.updated_at
          ? { key: "failed_delivery", label: "تعذر التوصيل", detail: "", time: order.updated_at, active: true, cancelled: true }
        : null,
    order.updated_at && !["cancelled", "failed_delivery"].includes(order.status) && !order.delivered_at
      ? { key: "current", label: `الحالة الحالية: ${statusLabels[order.status]}`, detail: "", time: order.updated_at, active: true, cancelled: false }
      : null,
  ].filter((event): event is { key: string; label: string; detail: string; time: string; active: boolean; cancelled: boolean } => Boolean(event));
}

function orderHistoryStatuses(order: BackendOrder) {
  const statuses = new Set<BackendOrderStatus>();
  if (Array.isArray(order.history)) {
    for (const event of order.history) {
      if (event.from_status) statuses.add(event.from_status);
      if (event.to_status) statuses.add(event.to_status);
    }
  }
  statuses.add(order.status);
  return statuses;
}

function routeActiveStatus(order: BackendOrder) {
  if (orderRouteStatuses.includes(order.status)) return order.status;
  const reachedStatuses = orderHistoryStatuses(order);
  for (let index = orderRouteStatuses.length - 1; index >= 0; index -= 1) {
    const status = orderRouteStatuses[index];
    if (reachedStatuses.has(status)) return status;
  }
  return "pending";
}

function isExceptionalTerminalStatus(status: BackendOrderStatus) {
  return status === "cancelled" || status === "failed_delivery";
}

function isClosedOrderStatus(status: BackendOrderStatus) {
  return status === "delivered" || isExceptionalTerminalStatus(status);
}

function representativeName(order: BackendOrder) {
  const representative = order.assigned_representative;
  if (!representative) {
    const representativeId = assignedRepresentativeId(order);
    return representativeId ? `مندوب #${representativeId}` : "لم يتم تعيين مندوب";
  }
  if (representative.name?.trim()) return representative.name.trim();
  return [representative.first_name, representative.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || "مندوب غير معروف";
}

function representativeLookupName(user: BackendDashboardUser) {
  return fullNameFromBackendUser(user).replace(/^مستخدم #/, "مندوب #");
}

function representativeNameWithLookup(
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

function recordValue(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function textFromRecord(record: Record<string, unknown>, paths: string[][]) {
  for (const path of paths) {
    const value = recordValue(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function representativeOptionsFromResponse(value: unknown): RepresentativeOption[] {
  const rawList =
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as { representatives?: unknown }).representatives)
      ? ((value as { representatives: unknown[] }).representatives)
      : apiListData<unknown>(value);

  return rawList
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((representative) => {
      const id = textFromRecord(representative, [["representative_id"], ["id"], ["user_id"], ["user", "id"]]);
      const directName = textFromRecord(representative, [["name"], ["full_name"], ["fullName"], ["user", "name"]]);
      const splitName = [
        textFromRecord(representative, [["first_name"], ["user", "first_name"]]),
        textFromRecord(representative, [["last_name"], ["user", "last_name"]]),
      ]
        .filter(Boolean)
        .join(" ");
      const phone = textFromRecord(representative, [["phone"], ["user", "phone"]]);
      return {
        id,
        name: directName || splitName || (id ? `مندوب #${id}` : "مندوب"),
        phone: phone || null,
      };
    })
    .filter((representative) => representative.id);
}

function customerDisplayName(user: BackendDashboardUser) {
  return fullNameFromBackendUser(user) || `عميل #${user.id}`;
}

function customerSearchText(user: BackendDashboardUser) {
  return [
    customerDisplayName(user),
    user.username,
    user.email,
    user.phone,
    user.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function addressLabel(address: BackendAddress) {
  return address.name?.trim() || address.line1?.trim() || `عنوان #${address.id}`;
}

function toNumberId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueNumberIds(values: unknown[]) {
  const ids: number[] = [];
  for (const value of values) {
    const id = toNumberId(value);
    if (id !== null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function getAddressServiceCityId(address: BackendAddress | null | undefined) {
  return toNumberId(address?.service_city_id ?? address?.service_city?.id);
}

function getAddressOrderScope(address: BackendAddress | null | undefined): "general" | "service_city" {
  return getAddressServiceCityId(address) !== null ? "service_city" : "general";
}

function isGeneralAddress(address: BackendAddress | null | undefined) {
  return getAddressOrderScope(address) === "general";
}

function getMarketScope(market: BackendMarket | null | undefined) {
  const explicitScope = cleanText(market?.scope).toLowerCase();
  if (explicitScope === "service_city") return "service_city";
  if (explicitScope === "general") return "general";
  return market && marketServiceCityIds(market).length > 0 ? "service_city" : "general";
}

function marketServiceCityIds(market: BackendMarket) {
  const values: unknown[] = [];
  if (Array.isArray(market.service_city_ids)) values.push(...market.service_city_ids);
  if (Array.isArray(market.service_cities)) {
    for (const city of market.service_cities) values.push(city.id);
  }
  if (Array.isArray(market.delivery_areas)) {
    for (const area of market.delivery_areas) {
      if (area && typeof area === "object") {
        values.push(area.service_city_id ?? area.service_city?.id);
      }
    }
  }
  return uniqueNumberIds(values);
}

function marketServesCity(market: BackendMarket, cityId: number | null) {
  if (cityId === null) return false;
  return marketServiceCityIds(market).includes(cityId);
}

function marketIsActive(market: BackendMarket) {
  if (market.is_active === false) return false;
  if (!market.status) return true;
  return market.status === "active";
}

function filterMarketsForAddress(markets: BackendMarket[], address: BackendAddress | null) {
  if (!address) return [];
  if (isGeneralAddress(address)) {
    return markets.filter((market) => getMarketScope(market) === "general" && marketIsActive(market));
  }

  const cityId = getAddressServiceCityId(address);
  return markets.filter(
    (market) =>
      getMarketScope(market) === "service_city" &&
      marketIsActive(market) &&
      marketServesCity(market, cityId),
  );
}

function productMarketId(product: BackendProduct) {
  return toNumberId(product.market_id ?? product.market?.id);
}

function filterProductsForMarket(products: BackendProduct[], marketId: string) {
  const selectedMarketId = toNumberId(marketId);
  if (selectedMarketId === null) return [];
  return products.filter(
    (product) =>
      productMarketId(product) === selectedMarketId &&
      product.is_available !== false,
  );
}

function offerMarketId(offer: BackendOffer) {
  return toNumberId(offer.market_id ?? offer.market?.id);
}

function offerServiceCityIds(offer: BackendOffer) {
  const values: unknown[] = [];
  if (Array.isArray(offer.service_city_ids)) values.push(...offer.service_city_ids);
  if (Array.isArray(offer.service_cities)) {
    for (const city of offer.service_cities) values.push(city.id);
  }
  return uniqueNumberIds(values);
}

function offerShowsInGeneral(offer: BackendOffer) {
  return offer.show_in_general === true;
}

function getOfferScope(offer: BackendOffer) {
  if (offerShowsInGeneral(offer)) return "general";
  if (offerServiceCityIds(offer).length > 0) return "service_city";
  return "general";
}

function offerMatchesMarket(offer: BackendOffer, marketId: string) {
  const selectedMarketId = toNumberId(marketId);
  if (selectedMarketId === null) return false;
  const directMarketId = offerMarketId(offer);
  return directMarketId !== null && directMarketId === selectedMarketId;
}

function filterOffersForMarketAndAddress(
  offers: BackendOffer[],
  marketId: string,
  address: BackendAddress | null,
) {
  if (!address || !marketId) return [];

  if (isGeneralAddress(address)) {
    return offers.filter(
      (offer) =>
        offerShowsInGeneral(offer) &&
        offerMatchesMarket(offer, marketId),
    );
  }

  const cityId = getAddressServiceCityId(address);
  return offers.filter(
    (offer) =>
      !offerShowsInGeneral(offer) &&
      cityId !== null &&
      offerServiceCityIds(offer).includes(cityId) &&
      offerMatchesMarket(offer, marketId),
  );
}

function variantAttributeLabel(attribute: BackendVariantAttribute) {
  const attributeName = cleanText(attribute.attribute?.name);
  const optionValue = cleanText(attribute.option?.value) || cleanText(attribute.value);
  return [attributeName, optionValue].filter(Boolean).join(": ");
}

function getVariantPrice(variant: { price?: string | number | null }) {
  const price = Number(variant.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function getVariantLabel(variant: BackendProductVariant) {
  const explicit = cleanText(variant.label) || cleanText(variant.name);
  if (explicit) return explicit;
  const attributes = Array.isArray(variant.attribute_values)
    ? variant.attribute_values.map(variantAttributeLabel).filter(Boolean)
    : [];
  if (attributes.length > 0) return attributes.join("، ");
  return cleanText(variant.sku) || `Variant #${variant.id}`;
}

function marketLabel(market: BackendMarket) {
  return [market.name?.trim() || `محل #${market.id}`, market.branch?.trim()]
    .filter(Boolean)
    .join(" - ");
}

function offerLabel(offer: BackendOffer) {
  return [
    offer.title?.trim() || `عرض #${offer.id}`,
    offer.type,
    money(offer.discount),
  ].filter(Boolean).join(" - ");
}

function emptyMarketSection(): MarketSectionDraft {
  return {
    id: draftSectionId(),
    marketId: "",
    lines: [],
    offers: [],
  };
}

function marketSectionHasContent(section: MarketSectionDraft) {
  return (
    section.lines.some((line) => line.variantId) ||
    section.offers.some((offer) => offer.offerId)
  );
}

function representativeHref(order: BackendOrder) {
  const representative = order.assigned_representative;
  const representativeId = representative?.id ?? order.assigned_representative_id;
  if (!representativeId) return "/delivery/couriers";
  return `/delivery/couriers/${representativeId}`;
}

function customerHref(order: BackendOrder) {
  const customerId = order.customer?.id ?? order.user_id;
  if (!customerId) return "/customers";
  return `/customers/${customerId}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function orderCopyText(order: BackendOrder) {
  return [
    orderNumber(order),
    customerName(order),
    order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`,
  ].join("\n");
}

export function BackendOrdersPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [representatives, setRepresentatives] = useState<BackendDashboardUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BackendOrderStatus>("all");
  const [deliveryType, setDeliveryType] = useState<"all" | "fixed_area" | "delivery">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders(nextStatus: "all" | BackendOrderStatus = status) {
    setLoading(true);
    setError(null);
    try {
      const ordersPath =
        nextStatus === "all"
          ? "orders/"
          : `orders/?status=${encodeURIComponent(nextStatus)}`;
      const ordersResponse = await apiFetch(ordersPath);
      const ordersData = await apiResponseData(ordersResponse);
      if (!ordersResponse.ok) throw new Error(apiError(ordersData, "تعذر تحميل الطلبات."));
      setOrders(apiListData<BackendOrder>(ordersData));
      try {
        const representativesResponse = await apiFetch("auth/representatives/");
        const representativesData = await apiResponseData(representativesResponse);
        if (representativesResponse.ok) {
          setRepresentatives(
            Array.isArray(representativesData)
              ? representativesData.filter(isBackendDashboardUser)
              : [],
          );
        }
      } catch {
        setRepresentatives([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل الطلبات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleOrdersChanged() {
      void loadOrders(status);
    }

    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    return () => window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const representativeMap = new Map(representatives.map((representative) => [String(representative.id), representative]));
    return orders.filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const matchesDeliveryType =
        deliveryType === "all" ||
        order.delivery_type === deliveryType ||
        (deliveryType === "delivery" && order.delivery_type === "manual_quote");
      const matchesQuery =
        !normalized ||
        [
          order.id,
          orderNumber(order),
          customerName(order),
          order.customer?.phone,
          marketName(order),
          getOrderScopeLabel(order),
          getDeliveryDestination(order),
          getMarketCount(order),
          representativeNameWithLookup(order, representativeMap),
          order.delivery_price,
          order.total_price,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesDeliveryType && matchesQuery;
    });
  }, [orders, query, status, deliveryType, representatives]);

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ordersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ordersPageSize;
  const pagedOrders = visibleOrders.slice(pageStartIndex, pageStartIndex + ordersPageSize);

  const assignmentReadyCount = orders.filter((order) => order.status === "confirmed" && !assignedRepresentativeId(order)).length;
  const assignedCount = orders.filter((order) => order.status === "assigned" && Boolean(assignedRepresentativeId(order))).length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

  async function copyOrderNumberFromList(order: BackendOrder) {
    try {
      await copyText(orderCopyText(order));
      showSnackbar({ message: `تم نسخ بيانات الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ بيانات الطلب.", tone: "danger" });
    }
  }

  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle
        title="الطلبات"
        description="عرض وإدارة كل الطلبات الواردة من يلا ماركت والداشبورد"
        size="compact"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void loadOrders()}>
              <RefreshCw className="size-4" />
              تحديث
            </Button>
            <Link
              href="/orders/create"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <Plus className="size-4" />
              إنشاء طلب
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric title="إجمالي الطلبات" value={orders.length} />
        <Metric title="جاهزة للإسناد" value={assignmentReadyCount} />
        <Metric title="مسندة لمندوب" value={assignedCount} />
        <Metric title="تم التسليم" value={deliveredCount} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="h-12 ps-9"
              placeholder="بحث برقم الطلب أو العميل أو المحل..."
            />
          </label>
          <AppSelect
            value={status}
            onValueChange={(value) => {
              const nextStatus = value as "all" | BackendOrderStatus;
              setStatus(nextStatus);
              setCurrentPage(1);
              void loadOrders(nextStatus);
            }}
            options={[
              { value: "all", label: "كل الحالات" },
              ...statusOptions.map((value) => ({
                value,
                label: statusLabels[value],
              })),
            ]}
            ariaLabel="فلترة حالة الطلب"
            dir="rtl"
            className="h-12"
          />
          <AppSelect
            value={deliveryType}
            onValueChange={(value) => {
              setDeliveryType(value as "all" | "fixed_area" | "delivery");
              setCurrentPage(1);
            }}
            options={[
              { value: "all", label: "كل أنواع التوصيل" },
              { value: "fixed_area", label: "مدينة ثابتة" },
              { value: "delivery", label: "دليفري" },
            ]}
            ariaLabel="فلترة نوع التوصيل"
            dir="rtl"
            className="h-12"
          />
        </div>

        {loading ? (
          <PageLoadingState className="min-h-64" />
        ) : error ? (
          <PageLoadError onRetry={() => void loadOrders()} />
        ) : visibleOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات مطابقة.
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            {pagedOrders.map((order, index) => {
              const deliveryOrder = isDeliveryOrder(order);

              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/orders/view/${order.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/orders/view/${order.id}`);
                    }
                  }}
                  className={cn(
                    "grid cursor-pointer gap-4 rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/35 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.1fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)_minmax(180px,0.8fr)_minmax(190px,0.9fr)] xl:items-center",
                    deliveryOrder &&
                      "border-red-400/40 bg-red-500/5 hover:border-red-400/60 hover:bg-red-500/10",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary"
                    >
                      {pageStartIndex + index + 1}
                    </span>
                    <OrderDeliveryIcon order={order} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          dir="ltr"
                          className={cn(
                            "truncate font-bold text-primary",
                            deliveryOrder && "text-red-600 dark:text-red-300",
                          )}
                        >
                          {orderNumber(order)}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyOrderNumberFromList(order);
                          }}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          aria-label={`نسخ بيانات الطلب ${orderNumber(order)}`}
                          title="نسخ بيانات الطلب"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
                        <Badge tone={reviewStatusTone(order.review_status)}>{reviewStatusLabel(order.review_status)}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={customerHref(order)}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-grid max-w-full gap-0.5 font-semibold text-primary hover:underline"
                    >
                      <span className="truncate">{customerName(order)}</span>
                      <span className="truncate text-start text-xs font-normal text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
                        {formatEgyptPhoneForDisplay(order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`)}
                      </span>
                    </Link>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-muted-foreground">محلات الطلب</div>
                    <div className="mt-1 truncate font-semibold">{marketName(order)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getMarketCount(order).toLocaleString("en-US")} {getMarketCount(order) > 1 ? "محلات" : "محل"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-muted-foreground">نوع الطلب</div>
                    <div className="mt-1"><DeliveryTypeBadge order={order} /></div>
                    {getDashboardOrderOfferTitles(order).length > 0 ? (
                      <div
                        className="mt-2 line-clamp-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                        title={getDashboardOrderOfferTitles(order).join("، ")}
                      >
                        {getDashboardOrderOfferTitles(order).length === 1 ? "العرض" : "العروض"}: {getDashboardOrderOfferTitles(order).join("، ")}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 text-xs">
                    <div className="grid gap-1.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">المنتجات</span>
                        <CurrencyText className="font-semibold tabular-nums">{money(order.subtotal_price)}</CurrencyText>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">التوصيل</span>
                        <CurrencyText className="font-semibold tabular-nums">{deliveryFeeLabel(order)}</CurrencyText>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">الخصم</span>
                        <CurrencyText className="font-semibold tabular-nums">{money(order.discount)}</CurrencyText>
                      </div>
                      <div className="flex justify-between gap-2 border-t pt-1">
                        <span className="font-bold">الإجمالي</span>
                        <CurrencyText className="font-extrabold tabular-nums">{money(order.total_price)}</CurrencyText>
                      </div>
                      <div className="truncate pt-1 text-muted-foreground">
                        {dateTime(order.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="overflow-hidden rounded-md border bg-card shadow-sm">
              <Pagination
                text={`عرض ${pagedOrders.length} من ${visibleOrders.length} نتيجة`}
                pages={`${safeCurrentPage} / ${totalPages}`}
                previousDisabled={safeCurrentPage === 1}
                nextDisabled={safeCurrentPage === totalPages}
                onPrevious={() =>
                  setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
                }
                onNext={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, Math.min(page, totalPages) + 1),
                  )
                }
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString("en-US")}</div>
    </Card>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
      <div className="font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}

export function BackendCreateOrderPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<BackendDashboardUser[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [markets, setMarkets] = useState<BackendMarket[]>([]);
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [addresses, setAddresses] = useState<BackendAddress[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [marketSections, setMarketSections] = useState<MarketSectionDraft[]>([]);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [createAddressOpen, setCreateAddressOpen] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [pickerTarget, setPickerTarget] = useState<{ sectionId: string; lineId: string } | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productAvailabilityFilter, setProductAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, productsResponse, marketsResponse, offersResponse] = await Promise.all([
        apiFetch("auth/users/"),
        apiFetch("catalog/products/"),
        apiFetch("home/markets/"),
        apiFetch("offers/"),
      ]);
      const [usersData, productsData, marketsData, offersData] = await Promise.all([
        apiResponseData(usersResponse),
        apiResponseData(productsResponse),
        apiResponseData(marketsResponse),
        apiResponseData(offersResponse),
      ]);
      if (!usersResponse.ok) throw new Error(apiError(usersData, "تعذر تحميل العملاء."));
      if (!productsResponse.ok) throw new Error(apiError(productsData, "تعذر تحميل المنتجات."));
      if (!marketsResponse.ok) throw new Error(apiError(marketsData, "تعذر تحميل المحلات."));
      if (!offersResponse.ok) throw new Error(apiError(offersData, "تعذر تحميل العروض."));
      setUsers(
        apiListData<BackendDashboardUser>(usersData)
          .filter(isBackendDashboardUser)
          .filter((user) => user.role === "client"),
      );
      setProducts(apiListData<BackendProduct>(productsData));
      setMarkets(apiListData<BackendMarket>(marketsData));
      setOffers(apiListData<BackendOffer>(offersData));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات إنشاء الطلب.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAddresses(userId: string) {
    setSelectedAddress("");
    setAddresses([]);
    setMarketSections([]);
    setPickerTarget(null);
    if (!userId) return;
    const response = await apiFetch(`addresses/?user_id=${encodeURIComponent(userId)}`);
    const data = await apiResponseData(response);
    if (!response.ok) {
      showSnackbar({ message: apiError(data, "تعذر تحميل عناوين العميل."), tone: "danger" });
      return;
    }
    const rows = apiListData<BackendAddress>(data);
    setAddresses(rows);
    setSelectedAddress(rows[0]?.id ? String(rows[0].id) : "");
  }

  function selectCustomer(userId: string) {
    setSelectedUser(userId);
    setCustomerPickerOpen(false);
    setCustomerQuery("");
    setCreateAddressOpen(false);
    setMarketSections([]);
    setPickerTarget(null);
    resetAddressDraft();
    void loadAddresses(userId);
  }

  function resetAddressDraft() {
    setAddressName("");
  }

  async function createAddress() {
    if (!selectedUser || !addressName.trim()) return;

    setSavingAddress(true);
    try {
      const body: Record<string, string | number | boolean> = {
        user_id: Number(selectedUser),
        name: addressName.trim(),
        isDefault: addresses.length === 0,
      };
      const response = await apiFetch("addresses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إضافة عنوان العميل."));

      const rows = apiListData<BackendAddress>(data);
      setAddresses(rows);
      setSelectedAddress(rows[0]?.id ? String(rows[0].id) : "");
      setMarketSections([]);
      setPickerTarget(null);
      setCreateAddressOpen(false);
      resetAddressDraft();
      showSnackbar({ message: "تمت إضافة عنوان العميل.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر إضافة عنوان العميل.",
        tone: "danger",
      });
    } finally {
      setSavingAddress(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variants = useMemo<ProductVariantOption[]>(() => {
    return products.flatMap((product) =>
      (product.variants ?? []).map((variant) => ({
        id: String(variant.id),
        productId: product.id,
        productName: product.name,
        variantLabel: getVariantLabel(variant),
        categoryName: product.category?.name?.trim() || "بدون تصنيف",
        marketName:
          product.market?.name?.trim() ||
          markets.find((market) => toNumberId(market.id) === productMarketId(product))?.name?.trim() ||
          "بدون محل",
        label: `${product.name} - ${getVariantLabel(variant)} - ${money(variant.price)}${variant.sku ? ` - ${variant.sku}` : ""}`,
        price: getVariantPrice(variant),
        marketId: productMarketId(product) ?? undefined,
        sku: variant.sku,
        available: product.is_available !== false,
      })),
    );
  }, [markets, products]);

  const selectedCustomer = useMemo(
    () => users.find((user) => String(user.id) === selectedUser) ?? null,
    [selectedUser, users],
  );

  const selectedAddressRecord = useMemo(
    () => addresses.find((address) => String(address.id) === selectedAddress) ?? null,
    [addresses, selectedAddress],
  );

  const eligibleMarkets = useMemo(
    () => filterMarketsForAddress(markets, selectedAddressRecord),
    [markets, selectedAddressRecord],
  );

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => customerSearchText(user).includes(normalizedQuery));
  }, [customerQuery, users]);

  const selectedMarketIds = marketSections
    .map((section) => section.marketId)
    .filter(Boolean);
  const selectedMarketIdSet = new Set(selectedMarketIds);
  const hasDuplicateMarkets = selectedMarketIdSet.size !== selectedMarketIds.length;
  const nonEmptyMarketSections = marketSections.filter(marketSectionHasContent);
  const selectedMarketRecords = nonEmptyMarketSections
    .map((section) => eligibleMarkets.find((market) => String(market.id) === section.marketId))
    .filter((market): market is BackendMarket => Boolean(market));
  const selectedMarketSummary = selectedMarketRecords.map(marketLabel).join("، ");
  const selectedProductLines = marketSections.flatMap((section) =>
    section.lines
      .filter((line) => line.variantId)
      .map((line) => ({ section, line })),
  );
  const selectedOfferLines = marketSections.flatMap((section) =>
    section.offers
      .filter((offer) => offer.offerId)
      .map((offer) => ({ section, offer })),
  );
  const hasSelectedOrderContent = selectedProductLines.length > 0 || selectedOfferLines.length > 0;
  const subtotal = selectedProductLines.reduce((sum, { line }) => {
    const variant = variants.find((item) => item.id === line.variantId);
    return sum + (variant?.price ?? 0) * Math.max(1, Number(line.quantity) || 1);
  }, 0);
  function buildOrderPayload() {
    const firstSelectedMarketId =
      nonEmptyMarketSections.map((section) => section.marketId).find(Boolean) ??
      selectedMarketIds[0];
    if (!selectedUser || !selectedAddress || !hasSelectedOrderContent) return null;

    return {
      user_id: Number(selectedUser),
      delivery_address_id: Number(selectedAddress),
      market_id: firstSelectedMarketId ? Number(firstSelectedMarketId) : undefined,
      service_city_id: selectedAddressRecord?.service_city_id
        ? Number(selectedAddressRecord.service_city_id)
        : undefined,
      payment_method: paymentMethod.trim() || "cash",
      description: description.trim(),
      delivery_note: deliveryNote.trim(),
      items: selectedProductLines.map(({ line }) => ({
        variant_id: Number(line.variantId),
        quantity: Number(line.quantity),
      })),
      offers: selectedOfferLines.map(({ offer }) => ({
        offer_id: Number(offer.offerId),
      })),
    };
  }

  const activePickerSection = pickerTarget
    ? marketSections.find((section) => section.id === pickerTarget.sectionId) ?? null
    : null;
  const activePickerMarket = activePickerSection?.marketId
    ? eligibleMarkets.find((market) => String(market.id) === activePickerSection.marketId) ?? null
    : null;
  const activePickerVariantIds = useMemo(() => {
    const marketProductIds = new Set(
      filterProductsForMarket(products, activePickerSection?.marketId ?? "").map((product) => product.id),
    );
    return new Set(variants.filter((variant) => marketProductIds.has(variant.productId)).map((variant) => variant.id));
  }, [activePickerSection?.marketId, products, variants]);
  const productCategories = useMemo(() => {
    return Array.from(
      new Set(
        variants
          .filter((variant) => activePickerVariantIds.has(variant.id))
          .map((variant) => variant.categoryName),
      ),
    )
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, "ar"));
  }, [activePickerVariantIds, variants]);
  const filteredVariants = useMemo(() => {
    const normalizedQuery = productQuery.trim().toLowerCase();

    return variants.filter((variant) => {
      if (!activePickerVariantIds.has(variant.id)) return false;
      const matchesQuery =
        !normalizedQuery ||
        [variant.productName, variant.variantLabel, variant.sku, variant.marketName, variant.categoryName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesCategory =
        productCategoryFilter === "all" || variant.categoryName === productCategoryFilter;
      const matchesAvailability =
        productAvailabilityFilter === "all" ||
        (productAvailabilityFilter === "available" ? variant.available : !variant.available);

      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [activePickerVariantIds, productAvailabilityFilter, productCategoryFilter, productQuery, variants]);
  const selectedAddressIsGeneral = selectedAddressRecord ? isGeneralAddress(selectedAddressRecord) : false;
  const addressScopeLabel = selectedAddressIsGeneral ? "عام" : "مدينة خدمة";
  const addressDeliveryTypeLabel = selectedAddressRecord
    ? selectedAddressIsGeneral
      ? "دليفري"
      : selectedAddressRecord.delivery_area
        ? "مدينة ثابتة"
        : "دليفري"
    : "-";
  const addressDeliveryPriceLabel = selectedAddressRecord
    ? selectedAddressRecord.delivery_area
      ? money(selectedAddressRecord.delivery_price_preview ?? selectedAddressRecord.delivery_area.delivery_price)
      : "يحدد لاحقاً"
    : "-";

  function resetProductPicker() {
    setPickerTarget(null);
    setProductQuery("");
    setProductCategoryFilter("all");
    setProductAvailabilityFilter("all");
  }

  function selectAddress(addressId: string) {
    setSelectedAddress(addressId);
    setMarketSections([]);
    resetProductPicker();
  }

  function addMarketSection() {
    if (!selectedAddressRecord) {
      showSnackbar({ message: "اختر عنوان التوصيل", tone: "danger" });
      return;
    }
    if (marketSections.some((section) => !section.marketId && section.lines.length === 0 && section.offers.length === 0)) {
      showSnackbar({ message: "أكمل القسم الفارغ الحالي قبل إضافة محل آخر.", tone: "danger" });
      return;
    }
    if (marketSections.length >= eligibleMarkets.length) {
      showSnackbar({ message: "لا توجد محلات متاحة أخرى لهذا العنوان.", tone: "danger" });
      return;
    }
    setMarketSections((current) => [...current, emptyMarketSection()]);
  }

  function removeMarketSection(sectionId: string) {
    setMarketSections((current) => current.filter((section) => section.id !== sectionId));
    if (pickerTarget?.sectionId === sectionId) resetProductPicker();
  }

  function updateSectionMarket(sectionId: string, marketId: string) {
    const duplicate = marketSections.some((section) => section.id !== sectionId && section.marketId === marketId);
    if (duplicate) {
      showSnackbar({ message: "هذا المحل مضاف بالفعل", tone: "danger" });
      return;
    }
    setMarketSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, marketId, lines: [], offers: [] }
          : section,
      ),
    );
    if (pickerTarget?.sectionId === sectionId) resetProductPicker();
  }

  function marketOptionsForSection(sectionId: string) {
    const selectedByOtherSections = new Set(
      marketSections
        .filter((section) => section.id !== sectionId)
        .map((section) => section.marketId)
        .filter(Boolean),
    );
    return eligibleMarkets.map((market) => ({
      value: String(market.id),
      label: marketLabel(market),
      disabled: selectedByOtherSections.has(String(market.id)),
    }));
  }

  function addLine(sectionId: string) {
    const section = marketSections.find((item) => item.id === sectionId);
    if (!section?.marketId) {
      showSnackbar({ message: "اختر المحل أولاً.", tone: "danger" });
      return;
    }
    setMarketSections((current) =>
      current.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              lines: [...item.lines, { id: draftLineId(), variantId: "", quantity: "1", unitPrice: "" }],
            }
          : item,
      ),
    );
  }

  function updateLine(sectionId: string, lineId: string, patch: Partial<OrderLineDraft>) {
    setMarketSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              lines: section.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
            }
          : section,
      ),
    );
  }

  function removeLine(sectionId: string, lineId: string) {
    setMarketSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, lines: section.lines.filter((line) => line.id !== lineId) }
          : section,
      ),
    );
    if (pickerTarget?.sectionId === sectionId && pickerTarget.lineId === lineId) resetProductPicker();
  }

  function addOffer(sectionId: string) {
    const section = marketSections.find((item) => item.id === sectionId);
    if (!section?.marketId) {
      showSnackbar({ message: "اختر المحل أولاً.", tone: "danger" });
      return;
    }
    setMarketSections((current) =>
      current.map((item) =>
        item.id === sectionId
          ? { ...item, offers: [...item.offers, { id: draftOfferId(), offerId: "" }] }
          : item,
      ),
    );
  }

  function updateOffer(sectionId: string, offerLineId: string, offerId: string) {
    setMarketSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              offers: section.offers.map((offer) => (offer.id === offerLineId ? { ...offer, offerId } : offer)),
            }
          : section,
      ),
    );
  }

  function removeOffer(sectionId: string, offerLineId: string) {
    setMarketSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, offers: section.offers.filter((offer) => offer.id !== offerLineId) }
          : section,
      ),
    );
  }

  function invalidMarketMessage(market: BackendMarket) {
    if (!selectedAddressRecord) return "اختر عنوان التوصيل";
    if (selectedAddressIsGeneral && getMarketScope(market) === "service_city") {
      return "لا يمكن دمج محلات عامة مع محلات مدينة في نفس الطلب";
    }
    if (!selectedAddressIsGeneral && getMarketScope(market) === "general") {
      return "لا يمكن دمج محلات عامة مع محلات مدينة في نفس الطلب";
    }
    return "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب";
  }

  function invalidOfferMessage(offer: BackendOffer) {
    if (selectedAddressIsGeneral && getOfferScope(offer) === "service_city") {
      return "لا يمكن استخدام عرض مدينة داخل طلب عام";
    }
    if (!selectedAddressIsGeneral && getOfferScope(offer) === "general") {
      return "لا يمكن استخدام عرض عام داخل طلب مدينة";
    }
    return "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب";
  }

  function validateOrderDraft() {
    if (!selectedUser || !selectedCustomer) return "اختر العميل";
    if (!selectedAddressRecord) return "اختر عنوان التوصيل";
    if (marketSections.length === 0) return "اختر محل واحد على الأقل";
    if (marketSections.some((section) => !section.marketId)) return "اختر محل واحد على الأقل";
    if (hasDuplicateMarkets) return "هذا المحل مضاف بالفعل";
    if (!paymentMethod.trim()) return "طريقة الدفع مطلوبة";

    for (const section of marketSections) {
      const market = markets.find((item) => String(item.id) === section.marketId);
      if (!market) return "اختر محل واحد على الأقل";
      const allowed = eligibleMarkets.some((item) => String(item.id) === section.marketId);
      if (!allowed) return invalidMarketMessage(market);
    }

    if (!hasSelectedOrderContent) {
      return "أضف منتجاً أو عرضاً واحداً على الأقل";
    }

    for (const { section, line } of selectedProductLines) {
      const variantId = Number(line.variantId);
      if (!Number.isFinite(variantId) || variantId <= 0) {
        return "اختر المنتج";
      }
      const variant = variants.find((item) => item.id === line.variantId);
      if (!variant || String(variant.marketId ?? "") !== section.marketId) {
        return "لا يمكن دمج منتجات من مدن مختلفة في نفس الطلب";
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return "كمية المنتج يجب أن تكون 1 أو أكثر.";
      }
    }

    for (const { section, offer } of selectedOfferLines) {
      const selectedOffer = offers.find((item) => String(item.id) === offer.offerId);
      if (!selectedOffer) return "أكمل بيانات العروض أو احذف العرض غير المكتمل.";
      const allowedOffers = filterOffersForMarketAndAddress(offers, section.marketId, selectedAddressRecord);
      if (!allowedOffers.some((item) => item.id === selectedOffer.id)) {
        return invalidOfferMessage(selectedOffer);
      }
    }

    return null;
  }

  const validationMessage = validateOrderDraft();
  const deliveryPreviewAmount = selectedAddressRecord
    ? numberValue(selectedAddressRecord.delivery_price_preview ?? selectedAddressRecord.delivery_area?.delivery_price) ?? 0
    : 0;
  const summaryDeliveryLabel = selectedAddressRecord ? addressDeliveryPriceLabel : "-";
  const summaryTotalLabel = money(subtotal + deliveryPreviewAmount);
  const summaryProductsLabel =
    selectedProductLines.length
      ? `${selectedProductLines.length}`
      : "لا توجد منتجات مختارة";
  const submitBlockMessage = validationMessage;

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const draftError = validateOrderDraft();
    if (draftError) {
      showSnackbar({ message: draftError, tone: "danger" });
      return;
    }
    const createPayload = buildOrderPayload();
    if (!createPayload) {
      showSnackbar({ message: "أكمل بيانات الطلب قبل الحفظ.", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch("orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إنشاء الطلب."));
      const responseOrder = Array.isArray(data) ? data[0] : data;
      const createdOrder = apiOrderData(responseOrder) ?? apiOrderData(data);
      if (!createdOrder?.id) throw new Error("تم إنشاء الطلب لكن استجابة الباك غير مكتملة.");

      let orderForToast = createdOrder;
      let detailLoaded = false;
      try {
        const detailResponse = await apiFetch(`orders/${encodeURIComponent(String(createdOrder.id))}/`);
        const detailData = await apiResponseData(detailResponse);
        if (detailResponse.ok) {
          orderForToast = apiOrderData(detailData) ?? createdOrder;
          detailLoaded = Boolean(apiOrderData(detailData));
        }
      } catch {
        detailLoaded = false;
      }

      notifyDashboardOrdersChanged(createdOrder.id);
      showSnackbar({
        message: detailLoaded
          ? `تم إنشاء الطلب. الإجمالي ${money(orderForToast.total_price)}، التوصيل ${deliveryFeeLabel(orderForToast)}.`
          : "تم إنشاء الطلب، وسيتم تحميل تفاصيله من صفحة الطلب.",
        tone: "success",
      });
      router.push(`/orders/view/${createdOrder.id}`);
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر إنشاء الطلب.",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="px-6 py-8">
      <PageTitle
        title="إنشاء طلب"
        description="إنشاء طلب لعميل موجود وإرساله لمسار الطلبات الحقيقي"
        size="compact"
        actions={
          <Link
            href="/orders"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
            الرجوع للطلبات
          </Link>
        }
      />

      {loading ? (
        <PageLoadingState className="min-h-64" />
      ) : error ? (
        <PageLoadError onRetry={() => void loadInitialData()} />
      ) : (
        <form onSubmit={submitOrder} className="mt-6 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-5 xl:sticky xl:top-6">
            <div className="grid gap-4">
              <Field label="العميل">
                <input required type="hidden" value={selectedUser} readOnly />
                <button
                  type="button"
                  onClick={() => setCustomerPickerOpen(true)}
                  className={cn(
                    "flex h-14 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60",
                    !selectedCustomer && "text-muted-foreground",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {selectedCustomer ? customerDisplayName(selectedCustomer) : "اختر العميل"}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {selectedCustomer
                        ? [selectedCustomer.username ? `@${selectedCustomer.username}` : "", selectedCustomer.phone]
                            .filter(Boolean)
                            .join(" - ")
                        : "ابحث بالاسم أو اسم المستخدم"}
                    </span>
                  </span>
                  <Search className="size-4 shrink-0 text-primary" />
                </button>
              </Field>

              <Field label="عنوان التوصيل">
                <input required type="hidden" value={selectedAddress} readOnly />
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <AppSelect
                      value={selectedAddress}
                      onValueChange={selectAddress}
                      placeholder="اختر العنوان"
                      ariaLabel="اختيار عنوان التوصيل"
                      className="h-12 bg-input"
                      disabled={!selectedUser}
                      options={addresses.map((address) => ({
                        value: String(address.id),
                        label: addressLabel(address),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 shrink-0"
                      disabled={!selectedUser}
                      onClick={() => setCreateAddressOpen((open) => !open)}
                    >
                      <Plus className="size-4" />
                      عنوان
                    </Button>
                  </div>
                  {createAddressOpen ? (
                    <div className="grid gap-2 rounded-md border bg-muted/15 p-3">
                      <Input
                        value={addressName}
                        onChange={(event) => setAddressName(event.target.value)}
                        placeholder="اسم / وصف العنوان"
                        className="h-12"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={savingAddress}
                          onClick={() => {
                            setCreateAddressOpen(false);
                            resetAddressDraft();
                          }}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="button"
                          disabled={savingAddress || !addressName.trim()}
                          onClick={() => void createAddress()}
                        >
                          {savingAddress ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                          إضافة
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Field>

              {selectedAddressRecord ? (
                <div className="grid gap-3 rounded-md border bg-muted/10 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={selectedAddressIsGeneral ? "secondary" : "blue"}>{addressScopeLabel}</Badge>
                    <Badge tone={selectedAddressRecord.delivery_area ? "green" : "secondary"}>{addressDeliveryTypeLabel}</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryPill
                      label="مدينة الخدمة"
                      value={
                        selectedAddressRecord.service_city?.name_ar?.trim() ||
                        selectedAddressRecord.service_city?.name?.trim() ||
                        (selectedAddressRecord.service_city_id ? `City #${selectedAddressRecord.service_city_id}` : "-")
                      }
                    />
                    <SummaryPill
                      label="منطقة التوصيل"
                      value={selectedAddressRecord.delivery_area?.name?.trim() || "-"}
                    />
                    {selectedAddressRecord.manual_city?.trim() ? (
                      <SummaryPill label="manual_city" value={selectedAddressRecord.manual_city.trim()} />
                    ) : null}
                    {selectedAddressRecord.manual_area?.trim() ? (
                      <SummaryPill label="manual_area" value={selectedAddressRecord.manual_area.trim()} />
                    ) : null}
                    <SummaryPill
                      label="delivery_type"
                      value={
                        selectedAddressRecord.delivery_type
                          ? `${selectedAddressRecord.delivery_type} - ${addressDeliveryTypeLabel}`
                          : addressDeliveryTypeLabel
                      }
                    />
                    <SummaryPill label="delivery_price_preview" value={addressDeliveryPriceLabel} />
                  </div>
                </div>
              ) : null}

              <Field label="طريقة الدفع">
                <AppSelect
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  placeholder="طريقة الدفع"
                  ariaLabel="طريقة الدفع"
                  className="h-12 bg-input"
                  options={paymentMethodOptions}
                />
              </Field>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">محلات الطلب</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedAddressRecord
                        ? `${eligibleMarkets.length.toLocaleString("en-US")} محل متاح لهذا العنوان`
                        : "اختر عنوان التوصيل قبل إضافة المحلات."}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedAddressRecord || eligibleMarkets.length <= marketSections.length}
                    onClick={addMarketSection}
                  >
                    <Plus className="size-4" />
                    إضافة محل
                  </Button>
                </div>
                {marketSections.length === 0 ? (
                  <div className="rounded-md border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    لم يتم اختيار محلات بعد
                  </div>
                ) : null}
                {marketSections.map((section, sectionIndex) => {
                  const sectionMarket = eligibleMarkets.find((market) => String(market.id) === section.marketId) ?? null;
                  const sectionOffers = filterOffersForMarketAndAddress(offers, section.marketId, selectedAddressRecord);
                  const sectionSubtotal = section.lines.reduce((sum, line) => {
                    const variant = variants.find((item) => item.id === line.variantId);
                    return sum + (variant?.price ?? 0) * Math.max(1, Number(line.quantity) || 1);
                  }, 0);
                  const selectedSectionOffersCount = section.offers.filter((offer) => offer.offerId).length;

                  return (
                    <section key={section.id} className="grid gap-4 rounded-lg border bg-muted/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold">محل {sectionIndex + 1}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {sectionMarket ? marketLabel(sectionMarket) : "اختر المحل لهذا القسم"}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          onClick={() => removeMarketSection(section.id)}
                          aria-label={`حذف المحل ${sectionIndex + 1}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>

                      <Field label="اختر المحل">
                        <AppSelect
                          value={section.marketId}
                          onValueChange={(marketId) => updateSectionMarket(section.id, marketId)}
                          placeholder="اختر المحل"
                          ariaLabel={`اختيار المحل ${sectionIndex + 1}`}
                          className="h-12 bg-input"
                          options={marketOptionsForSection(section.id)}
                        />
                      </Field>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">المنتجات</div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!section.marketId}
                            onClick={() => addLine(section.id)}
                          >
                            <Plus className="size-4" />
                            إضافة منتج
                          </Button>
                        </div>
                        {section.lines.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            لا توجد منتجات مختارة
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {section.lines.map((line, index) => {
                              const selectedVariant = variants.find((variant) => variant.id === line.variantId);

                              return (
                                <div
                                  key={line.id}
                                  className="grid gap-3 rounded-md border bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_130px_130px_44px] md:items-center"
                                >
                                  <input type="hidden" value={line.variantId} readOnly />
                                  <button
                                    type="button"
                                    disabled={!section.marketId}
                                    onClick={() => {
                                      setPickerTarget({ sectionId: section.id, lineId: line.id });
                                      setProductQuery("");
                                      setProductCategoryFilter("all");
                                      setProductAvailabilityFilter("all");
                                    }}
                                    className={cn(
                                      "flex h-14 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60",
                                      !selectedVariant && "text-muted-foreground",
                                    )}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate font-semibold">
                                        {selectedVariant?.productName ?? "اختر المنتج"}
                                      </span>
                                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                                        {selectedVariant
                                          ? `${selectedVariant.variantLabel} - ${money(selectedVariant.price)}${selectedVariant.sku ? ` - ${selectedVariant.sku}` : ""}`
                                          : "منتجات هذا المحل فقط"}
                                      </span>
                                    </span>
                                    <Search className="size-4 shrink-0 text-primary" />
                                  </button>
                                  <Input
                                    readOnly
                                    value={selectedVariant ? money(selectedVariant.price) : ""}
                                    className="h-14 text-center text-sm font-semibold"
                                    placeholder="سعر الوحدة"
                                  />
                                  <Input
                                    min={1}
                                    type="number"
                                    value={line.quantity}
                                    onChange={(event) => updateLine(section.id, line.id, { quantity: event.target.value })}
                                    className="h-14 text-center text-base font-semibold"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-11"
                                    onClick={() => removeLine(section.id, line.id)}
                                    aria-label={`حذف المنتج ${index + 1}`}
                                  >
                                    <Trash2 className="size-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">العروض</div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!section.marketId || sectionOffers.length === 0}
                            onClick={() => addOffer(section.id)}
                          >
                            <Plus className="size-4" />
                            إضافة عرض
                          </Button>
                        </div>
                        {section.offers.length === 0 ? (
                          <div className="rounded-md border bg-background/60 px-3 py-3 text-sm text-muted-foreground">
                            لا توجد عروض مختارة
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {section.offers.map((offerLine, index) => (
                              <div
                                key={offerLine.id}
                                className="grid gap-3 rounded-md border bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_44px] md:items-center"
                              >
                                <AppSelect
                                  value={offerLine.offerId}
                                  onValueChange={(offerId) => updateOffer(section.id, offerLine.id, offerId)}
                                  placeholder="اختر العرض"
                                  ariaLabel={`اختيار العرض ${index + 1}`}
                                  className="h-12 bg-input"
                                  options={sectionOffers.map((offer) => ({
                                    value: String(offer.id),
                                    label: offerLabel(offer),
                                  }))}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-11"
                                  onClick={() => removeOffer(section.id, offerLine.id)}
                                  aria-label={`حذف العرض ${index + 1}`}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2 text-xs md:grid-cols-3">
                        <SummaryPill label="إجمالي منتجات القسم" value={money(sectionSubtotal)} />
                        <SummaryPill
                          label="العروض"
                          value={selectedSectionOffersCount ? `${selectedSectionOffersCount}` : "لا توجد عروض مختارة"}
                        />
                        <SummaryPill
                          label="الخصم"
                          value={selectedSectionOffersCount ? "يحسبه الباك" : money(0)}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>

              <Field label="ملاحظات">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-36 rounded-md border bg-input px-3 py-3 text-sm"
                />
              </Field>

              <Field label="ملاحظة التوصيل">
                <textarea
                  value={deliveryNote}
                  onChange={(event) => setDeliveryNote(event.target.value)}
                  className="min-h-24 rounded-md border bg-input px-3 py-3 text-sm"
                />
              </Field>
            </div>
          </Card>

          <Card className="flex h-full flex-col p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <ShoppingCart className="size-4 text-primary" />
              ملخص الطلب
            </div>
            <div className="flex flex-1 flex-col">
              <SummaryRow label="عدد المحلات" value={selectedMarketRecords.length ? `${selectedMarketRecords.length}` : "لم يتم اختيار محلات بعد"} />
              <SummaryRow label="أسماء المحلات" value={selectedMarketSummary || "لم يتم اختيار محلات بعد"} />
              <SummaryRow label="إجمالي المنتجات" value={summaryProductsLabel} />
              <SummaryRow label="عدد العروض" value={selectedOfferLines.length ? `${selectedOfferLines.length}` : "لا توجد عروض مختارة"} />
              <SummaryRow label="طريقة الدفع" value={paymentMethod ? paymentMethodLabel(paymentMethod) : "-"} />
              <SummaryRow label="نوع التوصيل" value={selectedAddressRecord ? addressDeliveryTypeLabel : "-"} />
              <SummaryRow label="سعر التوصيل" value={summaryDeliveryLabel} />
              <SummaryRow label="الإجمالي المتوقع" value={summaryTotalLabel} strong />
              <div className="mt-auto border-t pt-4" />
            </div>
            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={saving || Boolean(submitBlockMessage)}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
              حفظ الطلب
            </Button>
            {submitBlockMessage ? (
              <div className="mt-3 rounded-md border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                {submitBlockMessage}
              </div>
            ) : null}
          </Card>
          <ProductVariantPicker
            open={pickerTarget !== null}
            variants={filteredVariants}
            allVariantsCount={activePickerVariantIds.size}
            selectedVariantId={
              pickerTarget
                ? activePickerSection?.lines.find((line) => line.id === pickerTarget.lineId)?.variantId ?? ""
                : ""
            }
            query={productQuery}
            onQueryChange={setProductQuery}
            marketFilter="all"
            onMarketFilterChange={() => undefined}
            marketOptions={activePickerMarket ? [{ value: String(activePickerMarket.id), label: marketLabel(activePickerMarket) }] : []}
            categoryFilter={productCategoryFilter}
            onCategoryFilterChange={setProductCategoryFilter}
            categoryOptions={productCategories}
            availabilityFilter={productAvailabilityFilter}
            onAvailabilityFilterChange={setProductAvailabilityFilter}
            showMarketFilter={false}
            onClose={resetProductPicker}
            onSelect={(variantId) => {
              const variant = variants.find((item) => item.id === variantId);
              if (pickerTarget && variant) {
                updateLine(pickerTarget.sectionId, pickerTarget.lineId, {
                  variantId,
                  unitPrice: variant.price.toFixed(2),
                });
              }
              resetProductPicker();
            }}
          />
          <CustomerPicker
            open={customerPickerOpen}
            customers={filteredCustomers}
            allCustomersCount={users.length}
            selectedCustomerId={selectedUser}
            query={customerQuery}
            onQueryChange={setCustomerQuery}
            onClose={() => setCustomerPickerOpen(false)}
            onSelect={selectCustomer}
          />
        </form>
      )}
    </div>
  );
}

function CustomerPicker({
  open,
  customers,
  allCustomersCount,
  selectedCustomerId,
  query,
  onQueryChange,
  onClose,
  onSelect,
}: {
  open: boolean;
  customers: BackendDashboardUser[];
  allCustomersCount: number;
  selectedCustomerId: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (customerId: string) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-picker-title"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="customer-picker-title" className="text-base font-bold">
              اختيار العميل
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ابحث بالاسم أو اسم المستخدم أو رقم الهاتف.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="إغلاق اختيار العميل"
            className="size-9 rounded-full bg-muted/30"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="border-b bg-muted/15 p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="اسم العميل أو اسم المستخدم..."
              className="h-11 ps-9"
              autoFocus
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {customers.length > 0 ? (
            <div className="grid gap-2">
              {customers.map((customer) => {
                const selected = String(customer.id) === selectedCustomerId;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => onSelect(String(customer.id))}
                    className={cn(
                      "flex min-h-20 items-center justify-between gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45",
                      selected && "border-primary/55 bg-primary/10",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{customerDisplayName(customer)}</span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        {customer.username ? <span dir="ltr">@{customer.username}</span> : null}
                        {customer.phone ? <span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(customer.phone)}</span> : null}
                        {customer.email ? <span dir="ltr">{customer.email}</span> : null}
                      </span>
                    </span>
                    {selected ? (
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Check className="size-4" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">لا يوجد عملاء مطابقون</div>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/10 px-5 py-3 text-xs text-muted-foreground">
          ظاهر {customers.length} من {allCustomersCount} عميل
        </div>
      </div>
    </div>
  );
}

function ProductVariantPicker({
  open,
  variants,
  allVariantsCount,
  selectedVariantId,
  query,
  onQueryChange,
  marketFilter,
  onMarketFilterChange,
  marketOptions,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  availabilityFilter,
  onAvailabilityFilterChange,
  showMarketFilter = true,
  onClose,
  onSelect,
}: {
  open: boolean;
  variants: ProductVariantOption[];
  allVariantsCount: number;
  selectedVariantId: string;
  query: string;
  onQueryChange: (value: string) => void;
  marketFilter: string;
  onMarketFilterChange: (value: string) => void;
  marketOptions: Array<{ value: string; label: string }>;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryOptions: string[];
  availabilityFilter: "all" | "available" | "unavailable";
  onAvailabilityFilterChange: (value: "all" | "available" | "unavailable") => void;
  showMarketFilter?: boolean;
  onClose: () => void;
  onSelect: (variantId: string) => void;
}) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-variant-picker-title"
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="product-variant-picker-title" className="text-base font-bold">
              اختيار منتج للطلب
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ابحث بالاسم أو الكود، والنتائج مقصورة على محل هذا القسم.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="إغلاق اختيار المنتج"
            className="size-9 rounded-full bg-muted/30"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className={cn(
          "grid gap-3 border-b bg-muted/15 p-4",
          showMarketFilter
            ? "lg:grid-cols-[minmax(260px,1fr)_200px_190px_170px]"
            : "lg:grid-cols-[minmax(260px,1fr)_190px_170px]",
        )}>
          <label className="grid gap-2 text-sm font-medium">
            بحث
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="اسم المنتج أو الكود أو المحل..."
                className="h-10 ps-9"
                autoFocus
              />
            </div>
          </label>

          {showMarketFilter ? (
            <label className="grid gap-2 text-sm font-medium">
              المحل
              <AppSelect
                value={marketFilter}
                onValueChange={onMarketFilterChange}
                ariaLabel="فلتر المحل"
                className="h-10 bg-input"
                options={[{ value: "all", label: "كل المحلات" }, ...marketOptions]}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-medium">
            التصنيف
            <AppSelect
              value={categoryFilter}
              onValueChange={onCategoryFilterChange}
              ariaLabel="فلتر التصنيف"
              className="h-10 bg-input"
              options={[
                { value: "all", label: "كل التصنيفات" },
                ...categoryOptions.map((category) => ({ value: category, label: category })),
              ]}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            الحالة
            <AppSelect
              value={availabilityFilter}
              onValueChange={(value) => onAvailabilityFilterChange(value as "all" | "available" | "unavailable")}
              ariaLabel="فلتر حالة المنتج"
              className="h-10 bg-input"
              options={[
                { value: "all", label: "كل الحالات" },
                { value: "available", label: "متاح" },
                { value: "unavailable", label: "غير متاح" },
              ]}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {variants.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {variants.map((variant) => {
                const selected = variant.id === selectedVariantId;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelect(variant.id)}
                    className={cn(
                      "group grid min-h-36 gap-3 rounded-md border bg-card p-4 text-start shadow-sm transition hover:border-primary/45 hover:bg-accent/45",
                      selected && "border-primary/55 bg-primary/10",
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{variant.productName}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {variant.variantLabel}{variant.sku ? ` - ${variant.sku}` : ""}
                        </span>
                      </span>
                      {selected ? (
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-muted/60 px-2 py-1">{variant.marketName}</span>
                      <span className="rounded-md bg-muted/60 px-2 py-1">{variant.categoryName}</span>
                      <span className={cn("rounded-md px-2 py-1 font-semibold", variant.available ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-destructive/10 text-destructive")}>
                        {variant.available ? "متاح" : "غير متاح"}
                      </span>
                    </span>
                    <CurrencyText className="text-base font-extrabold tabular-nums">{money(variant.price)}</CurrencyText>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border bg-muted/10 px-4 text-center">
              <Search className="mb-3 size-8 text-muted-foreground" />
              <div className="text-sm font-semibold">لا توجد منتجات مطابقة</div>
              <p className="mt-1 text-xs text-muted-foreground">جرّب تغيير البحث أو الفلاتر.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            ظاهر {variants.length} من {allVariantsCount} منتج
          </div>
          <Button type="button" variant="outline" className="h-10" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  const content =
    typeof value === "string" || typeof value === "number" ? (
      <CurrencyText className="tabular-nums">{value}</CurrencyText>
    ) : (
      value
    );

  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 text-sm", strong && "text-base font-bold")}>
      <span className="text-muted-foreground">{label}</span>
      {content}
    </div>
  );
}

function sectionTotal(section: OrderMarketSectionLike) {
  const explicitTotal = numberValue(section.total_price);
  if (explicitTotal !== null) return money(explicitTotal);

  const subtotal = numberValue(section.subtotal_price) ?? 0;
  const discount = numberValue(section.discount) ?? 0;
  return money(Math.max(0, subtotal - discount));
}

function orderItemSubtotal(item: BackendOrderItem) {
  if (item.subtotal !== null && item.subtotal !== undefined && item.subtotal !== "") {
    return formatOrderMoney(item.subtotal, money(0));
  }
  const unitPrice = numberValue(item.unit_price) ?? 0;
  const quantity = numberValue(item.quantity) ?? 0;
  return money(unitPrice * quantity);
}

function orderItemDisplayName(item: BackendOrderItem) {
  return (
    cleanText(item.product_name) ||
    cleanText(item.product?.name) ||
    cleanText(item.variant?.product?.name) ||
    "منتج غير مسمى"
  );
}

function orderItemVariantLabel(item: BackendOrderItem) {
  return cleanText(item.variant_name) || cleanText(item.variant?.sku) || "-";
}

function sectionMarketDisplayName(section: OrderMarketSectionLike) {
  return objectName(section.market) || (section.market_id ? `محل #${section.market_id}` : "محل غير محدد");
}

function MarketSectionsCard({ order }: { order: BackendOrder }) {
  const sections = getMarketSections(order);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-5 py-4">
        <div>
          <div className="font-semibold">محلات الطلب</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {getOrderMarketsSummary(order)}
          </div>
        </div>
        <Badge tone={isMultiMarket(order) ? "green" : "secondary"}>
          {isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}
        </Badge>
      </div>

      {sections.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          لا توجد منتجات أو محلات في استجابة الطلب.
        </div>
      ) : (
        <div className="grid gap-4 p-5">
          {sections.map((section, sectionIndex) => {
            const items = (section.items ?? []) as BackendOrderItem[];
            const offers = (section.offers ?? []) as BackendOrderOffer[];
            return (
              <section key={`${section.id ?? section.market_id ?? sectionIndex}`} className="overflow-hidden rounded-lg border bg-card">
                <div className="border-b bg-muted/15 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold">{sectionMarketDisplayName(section)}</h3>
                        {cleanText(section.market?.branch) ? (
                          <Badge tone="secondary">{cleanText(section.market?.branch)}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-3">
                      <SummaryPill label="إجمالي المنتجات" value={money(section.subtotal_price)} />
                      <SummaryPill label="الخصم" value={money(section.discount)} />
                      <SummaryPill label="الإجمالي النهائي" value={sectionTotal(section)} />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="w-16 px-4 py-3 text-start">#</th>
                        <th className="px-4 py-3 text-start">المنتج</th>
                        <th className="px-4 py-3 text-start">المتغير</th>
                        <th className="px-4 py-3 text-start">السعر</th>
                        <th className="px-4 py-3 text-start">الكمية</th>
                        <th className="px-4 py-3 text-start">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-5 text-center text-muted-foreground">
                            لا توجد منتجات مباشرة لهذا المحل.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={`${item.id ?? item.variant_id ?? index}`} className="border-b last:border-0">
                            <td className="px-4 py-4 text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-4 font-medium">{orderItemDisplayName(item)}</td>
                            <td className="px-4 py-4 text-muted-foreground">{orderItemVariantLabel(item)}</td>
                            <td className="px-4 py-4"><CurrencyText>{money(item.unit_price)}</CurrencyText></td>
                            <td className="px-4 py-4">{cleanText(item.quantity) || "-"}</td>
                            <td className="px-4 py-4"><CurrencyText>{orderItemSubtotal(item)}</CurrencyText></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {offers.length > 0 ? (
                  <div className="border-t p-4">
                    <div className="mb-3 font-semibold">عروض المحل</div>
                    <div className="grid gap-2">
                      {offers.map((offer, index) => (
                        <div key={`${offer.id ?? offer.offer_id ?? index}`} className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2 text-sm">
                          <span className="font-medium">{orderOfferTitle(offer)}</span>
                          <span className="text-muted-foreground">
                            {money(offer.discount_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function BackendOrderDetailPage({ orderId }: { orderId: string }) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deliveryPriceDraft, setDeliveryPriceDraft] = useState("");
  const [savingDeliveryPrice, setSavingDeliveryPrice] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(true);
  const [representativeOpen, setRepresentativeOpen] = useState(false);
  const [representativeUser, setRepresentativeUser] = useState<BackendDashboardUser | null>(null);
  const [representativeOptions, setRepresentativeOptions] = useState<RepresentativeOption[]>([]);
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState("");
  const [representativesLoading, setRepresentativesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`orders/${encodeURIComponent(orderId)}/`);
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل تفاصيل الطلب."));
      const nextOrder = apiOrderData(data);
      if (!nextOrder) throw new Error("تعذر قراءة تفاصيل الطلب من استجابة الباك.");
      setOrder(nextOrder);
      setDeliveryPriceDraft(nextOrder.delivery_price ?? "");
      setRepresentativeOptions([]);
      setSelectedRepresentativeId("");
      const representativeId = assignedRepresentativeId(nextOrder);
      if (representativeId && !nextOrder.assigned_representative?.name) {
        try {
          const representativeResponse = await apiFetch(`auth/users/${encodeURIComponent(String(representativeId))}/`);
          const representativeData = await apiResponseData(representativeResponse);
          setRepresentativeUser(
            representativeResponse.ok &&
              isBackendDashboardUser(representativeData) &&
              representativeData.role === "representative"
              ? representativeData
              : null,
          );
        } catch {
          setRepresentativeUser(null);
        }
      } else {
        setRepresentativeUser(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(nextStatus: BackendOrderStatus) {
    if (!order || order.status === nextStatus) return;
    if (!canMoveOrderToStatus(order, nextStatus)) {
      showSnackbar({ message: "هذه الحركة غير متاحة لهذا الطلب الآن.", tone: "danger" });
      return;
    }
    setSavingStatus(true);
    try {
      const response = await apiFetch(`orders/${order.id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحديث حالة الطلب."));
      setOrder(apiOrderData(data) ?? (data as BackendOrder));
      notifyDashboardOrdersChanged(order.id);
      showSnackbar({ message: "تم تحديث حالة الطلب.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحديث حالة الطلب.",
        tone: "danger",
      });
    } finally {
      setSavingStatus(false);
    }
  }

  async function unassignRepresentative() {
    if (!order || !isReassignmentEligible(order)) return;
    setSavingAssignment(true);
    try {
      const response = await apiFetch(`orders/${order.id}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: null }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إلغاء إسناد الطلب."));
      setOrder(apiOrderData(data) ?? (data as BackendOrder));
      await loadOrder();
      showSnackbar({ message: "تم إلغاء إسناد المندوب.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر إلغاء الإسناد.",
        tone: "danger",
      });
    } finally {
      setSavingAssignment(false);
    }
  }

  async function loadRepresentativeOptions(targetOrder = order) {
    if (!targetOrder || (!isAssignmentEligible(targetOrder) && !isReassignmentEligible(targetOrder))) return;
    setRepresentativesLoading(true);
    try {
      const response = await apiFetch(`admin/orders/${targetOrder.id}/service-city-representatives/`);
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل المندوبين المتاحين."));
      const options = representativeOptionsFromResponse(data);
      setRepresentativeOptions(options);
      if (options.length === 0) {
        showSnackbar({ message: "لا يوجد مندوبين متاحين لهذا الطلب حاليًا.", tone: "danger" });
      }
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تحميل المندوبين المتاحين.",
        tone: "danger",
      });
    } finally {
      setRepresentativesLoading(false);
    }
  }

  async function assignSelectedRepresentative() {
    if (!order || !selectedRepresentativeId || (!isAssignmentEligible(order) && !isReassignmentEligible(order))) return;
    setSavingAssignment(true);
    try {
      const representativeIdValue = Number(selectedRepresentativeId);
      const response = await apiFetch(`orders/${order.id}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          representative_id: Number.isFinite(representativeIdValue)
            ? representativeIdValue
            : selectedRepresentativeId,
        }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إسناد الطلب للمندوب."));
      const nextOrder = apiOrderData(data) ?? (data as BackendOrder);
      setOrder(nextOrder);
      setRepresentativeOptions([]);
      setSelectedRepresentativeId("");
      await loadOrder();
      showSnackbar({ message: "تم إسناد الطلب للمندوب.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر إسناد الطلب للمندوب.",
        tone: "danger",
      });
    } finally {
      setSavingAssignment(false);
    }
  }

  async function updateDeliveryPrice() {
    if (!order || savingDeliveryPrice) return;
    const parsedPrice = Number(deliveryPriceDraft);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showSnackbar({ message: "سعر التوصيل يجب أن يكون رقمًا غير سالب.", tone: "danger" });
      return;
    }

    setSavingDeliveryPrice(true);
    try {
      const response = await apiFetch(`orders/${order.id}/delivery-price/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_price: parsedPrice.toFixed(2) }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر حفظ سعر التوصيل."));
      await loadOrder();
      notifyDashboardOrdersChanged(order.id);
      showSnackbar({ message: "تم حفظ سعر التوصيل وتحديث الإجمالي.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر حفظ سعر التوصيل.",
        tone: "danger",
      });
    } finally {
      setSavingDeliveryPrice(false);
    }
  }

  async function copyOrderNumber() {
    if (!order) return;
    try {
      await copyText(orderCopyText(order));
      showSnackbar({ message: `تم نسخ بيانات الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ بيانات الطلب.", tone: "danger" });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    function handleOrdersChanged(event: Event) {
      const detail = (event as CustomEvent<{ orderId?: string | number }>).detail;
      if (!detail?.orderId || String(detail.orderId) === String(orderId)) {
        void loadOrder();
      }
    }

    window.addEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    return () => window.removeEventListener(dashboardOrdersChangedEvent, handleOrdersChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const representativeMap = useMemo(
    () =>
      representativeUser
        ? new Map([[String(representativeUser.id), representativeUser]])
        : new Map<string, BackendDashboardUser>(),
    [representativeUser],
  );

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="px-6 py-8">
        <PageLoadError onRetry={() => void loadOrder()} />
      </div>
    );
    /*
    return <div className="px-6 py-8 text-sm text-destructive">{error ?? "الطلب غير موجود."}</div>;
    */
  }

  const deliveryPriceLocked = order.delivery_price !== null && order.delivery_price !== undefined && order.delivery_price !== "";
  const orderApprovedForAssignment = isAssignmentEligible(order);
  const canEditDeliveryPrice = isDeliveryOrder(order) || !deliveryPriceLocked;

  return (
    <div dir="rtl" className="px-6 py-8">
      <div className="flex min-h-14 flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold leading-8 tracking-normal">
            طلب{" "}
            <span dir="ltr" className="inline-block text-primary">
              {orderNumber(order)}
            </span>
          </h1>
          <div className="mt-2 grid gap-1 text-sm leading-5">
            <Link
              href={customerHref(order)}
              className="w-fit max-w-full truncate font-semibold text-primary hover:underline"
            >
              {customerName(order)}
            </Link>
            <span className="w-fit max-w-full truncate text-start text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
              {formatEgyptPhoneForDisplay(order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {marketName(order)} - {dateTime(order.created_at)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void copyOrderNumber()}>
              <Copy className="size-4" />
              نسخ بيانات الطلب
            </Button>
            <Link
              href="/orders"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
              الرجوع للطلبات
            </Link>
        </div>
      </div>

      <OrderRouteCard order={order} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <MarketSectionsCard order={order} />
          <FinancialSummaryCard order={order} />
        </div>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="mb-3 font-semibold">حالة الطلب</div>
            <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
            {adminStatusActionOptions.some((option) => canMoveOrderToStatus(order, option)) ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {adminStatusActionOptions
                  .filter((option) => canMoveOrderToStatus(order, option))
                  .map((option) => {
                    const current = order.status === option;
                    const completed = orderRouteIndex(option) < orderRouteIndex(order.status);

                    return (
                      <Button
                        key={option}
                        type="button"
                        variant={current ? "default" : "outline"}
                        disabled={savingStatus || current}
                        title={completed ? "مرحلة تمت ولا يمكن الرجوع إليها" : undefined}
                        onClick={() => void updateStatus(option)}
                      >
                        {statusLabels[option]}
                      </Button>
                    );
                  })}
              </div>
            ) : null}
            {canMoveOrderToStatus(order, "cancelled") ? (
              <div className="mt-3 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={savingStatus}
                  onClick={() => void updateStatus("cancelled")}
                >
                  <XCircle className="size-4" />
                  إلغاء الطلب
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="p-5 text-sm">
            <button
              type="button"
              onClick={() => setOrderDetailsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-start font-semibold transition hover:bg-muted/40"
            >
              <span>بيانات الطلب</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", orderDetailsOpen && "rotate-180")} />
            </button>
            {orderDetailsOpen ? (
              <div className="mt-3">
                <SummaryRow label="رقم الطلب" value={String(order.id)} />
                <SummaryRow label="حالة الطلب" value={statusLabels[order.status]} />
                <SummaryRow
                  label="العميل"
                  value={
                    <Link
                      href={customerHref(order)}
                      className="max-w-[14rem] truncate font-semibold text-primary hover:underline"
                    >
                      {customerName(order)}
                    </Link>
                  }
                />
                <SummaryRow label="الهاتف" value={<span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(order.customer?.phone)}</span>} />
                <SummaryRow label="طريقة الدفع" value={paymentMethodLabel(order.payment_method || "cash")} />
                <SummaryRow label="نوع الطلب" value={getDashboardOrderTypeLabel(order)} />
                <SummaryRow label="حالة المراجعة" value={reviewStatusLabel(order.review_status)} />
                <SummaryRow label="محلات الطلب" value={marketName(order)} />
                <SummaryRow label="عدد المحلات" value={String(getMarketCount(order) || "-")} />
                <SummaryRow label="متعدد المحلات" value={isMultiMarket(order) ? "نعم" : "لا"} />
                <SummaryRow label="ملخص المحلات" value={marketName(order)} />
                <SummaryRow label="المدينة" value={isGeneralOrder(order) ? getManualCity(order) : serviceCityName(order)} />
                <SummaryRow label="المنطقة" value={deliveryAreaName(order)} />
                <SummaryRow label="عنوان التوصيل" value={getDeliveryDestination(order)} />
                {isGeneralOrder(order) ? (
                  <>
                    <SummaryRow label="المدينة اليدوية" value={getManualCity(order)} />
                    <SummaryRow label="المنطقة اليدوية" value={getManualArea(order)} />
                  </>
                ) : null}
                <SummaryRow label="نوع التوصيل" value={deliveryTypeLabel(order)} />
                <SummaryRow label="إجمالي المنتجات" value={money(order.subtotal_price)} />
                <SummaryRow label="سعر التوصيل" value={deliveryFeeLabel(order)} />
                <SummaryRow label="الخصم" value={money(order.discount)} />
                <SummaryRow label="الإجمالي النهائي" value={money(order.total_price)} strong />
                <SummaryRow label="ملاحظات الطلب" value={order.description?.trim() || "-"} />
                <SummaryRow label="ملاحظة التوصيل" value={order.delivery_note?.trim() || "-"} />
                <SummaryRow label="تاريخ الإنشاء" value={dateTime(order.created_at)} />
                <SummaryRow label="آخر تحديث" value={dateTime(order.updated_at)} />
                {order.custom_delivery_area ? (
                  <SummaryRow label="منطقة الدليفري" value={order.custom_delivery_area} />
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card className="p-5 text-sm">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !representativeOpen;
                setRepresentativeOpen(nextOpen);
                if (nextOpen && isAssignmentEligible(order) && representativeOptions.length === 0) {
                  void loadRepresentativeOptions(order);
                }
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-start font-semibold transition hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                المندوب
                <Badge tone={assignedRepresentativeId(order) ? "green" : "secondary"}>
                  {assignedRepresentativeId(order)
                    ? representativeNameWithLookup(order, representativeMap)
                    : "غير مسند"}
                </Badge>
              </span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", representativeOpen && "rotate-180")} />
            </button>
            {representativeOpen ? (
              <div className="mt-3">
                {assignedRepresentativeId(order) ? (
                  <div className="grid gap-3">
                    <AssignedRepresentativeDetails order={order} representatives={representativeMap} />
                    {isReassignmentEligible(order) ? (
                      <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                        {representativeOptions.length > 0 ? (
                          <AppSelect
                            value={selectedRepresentativeId}
                            onValueChange={setSelectedRepresentativeId}
                            placeholder="اختر المندوب الجديد"
                            ariaLabel="اختيار المندوب الجديد"
                            className="h-10 bg-input"
                            options={representativeOptions.map((representative) => ({
                              value: representative.id,
                              label: representative.phone
                                ? `${representative.name} - ${formatEgyptPhoneForDisplay(representative.phone)}`
                                : representative.name,
                            }))}
                          />
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={representativesLoading || savingAssignment}
                            onClick={() => void loadRepresentativeOptions(order)}
                          >
                            {representativesLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                            تحديث المندوبين
                          </Button>
                          <Button
                            type="button"
                            disabled={!selectedRepresentativeId || savingAssignment}
                            onClick={() => void assignSelectedRepresentative()}
                          >
                            {savingAssignment ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                            تغيير المندوب
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {isReassignmentEligible(order) ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingAssignment}
                        onClick={() => void unassignRepresentative()}
                      >
                        {savingAssignment ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                        إلغاء إسناد المندوب
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      {orderApprovedForAssignment
                        ? "لم يتم إسناد الطلب لمندوب بعد."
                        : "يجب قبول الطلب قبل إسناده للمندوب."}
                    </div>
                    {orderApprovedForAssignment && representativeOptions.length > 0 ? (
                      <AppSelect
                        value={selectedRepresentativeId}
                        onValueChange={setSelectedRepresentativeId}
                        placeholder="اختر المندوب"
                        ariaLabel="اختيار المندوب"
                        className="h-10 bg-input"
                        options={representativeOptions.map((representative) => ({
                          value: representative.id,
                          label: representative.phone
                            ? `${representative.name} - ${formatEgyptPhoneForDisplay(representative.phone)}`
                            : representative.name,
                        }))}
                      />
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!orderApprovedForAssignment || representativesLoading || savingAssignment}
                        onClick={() => void loadRepresentativeOptions(order)}
                      >
                        {representativesLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        تحديث المندوبين
                      </Button>
                      <Button
                        type="button"
                        disabled={!orderApprovedForAssignment || !selectedRepresentativeId || savingAssignment}
                        onClick={() => void assignSelectedRepresentative()}
                      >
                        {savingAssignment ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                        إسناد الطلب
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

          {canEditDeliveryPrice ? (
          <Card className="p-5 text-sm">
            <div className="mb-3 font-semibold">سعر التوصيل</div>
            <div className="flex items-stretch gap-2">
              <Input
                min={0}
                step="0.01"
                type="number"
                value={deliveryPriceDraft}
                onChange={(event) => setDeliveryPriceDraft(event.target.value)}
                placeholder={deliveryLaterLabel}
                disabled={
                  deliveryPriceLocked ||
                  savingDeliveryPrice ||
                  isClosedOrderStatus(order.status)
                }
                className="h-10"
              />
              <span className="inline-flex h-10 shrink-0 items-center rounded-md border bg-muted/20 px-3 text-xs font-semibold text-muted-foreground">
                EGP
              </span>
            </div>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={
                savingDeliveryPrice ||
                deliveryPriceLocked ||
                isClosedOrderStatus(order.status) ||
                deliveryPriceDraft.trim() === ""
              }
              onClick={() => void updateDeliveryPrice()}
            >
              {savingDeliveryPrice ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
              حفظ سعر التوصيل
            </Button>
            {deliveryPriceLocked ? (
              <p className="mt-2 text-xs text-muted-foreground">
                سعر التوصيل محفوظ بالفعل ولا يمكن تعديله من هنا.
              </p>
            ) : null}
            {isClosedOrderStatus(order.status) ? (
              <p className="mt-2 text-xs text-muted-foreground">
                لا يمكن تعديل سعر التوصيل بعد التسليم أو الإلغاء أو تعذر التوصيل.
              </p>
            ) : null}
          </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FinancialSummaryCard({ order }: { order: BackendOrder }) {
  const discount = numberValue(order.discount) ?? 0;

  return (
    <Card className="p-5 text-sm">
      <div className="mb-3 font-semibold">ملخص مالي</div>
      <SummaryRow label="المنتجات" value={money(order.subtotal_price)} />
      <SummaryRow label="التوصيل" value={deliveryFeeLabel(order)} />
      {discount > 0 ? <SummaryRow label="الخصم" value={money(order.discount)} /> : null}
      <div className="mt-3 border-t pt-3">
        <SummaryRow label="الإجمالي" value={money(order.total_price)} strong />
      </div>
    </Card>
  );
}

function AssignedRepresentativeDetails({
  order,
  representatives,
}: {
  order: BackendOrder;
  representatives?: Map<string, BackendDashboardUser>;
}) {
  const representativeId = assignedRepresentativeId(order);
  if (!representativeId) return null;
  const name = representatives
    ? representativeNameWithLookup(order, representatives)
    : representativeName(order);

  return (
    <Link
      href={representativeHref(order)}
      aria-label={`عرض تفاصيل المندوب ${name}`}
      className="mt-2 inline-grid max-w-full gap-1 rounded-md border bg-muted/15 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    >
      <span className="truncate">{name}</span>
      <span className="truncate text-start text-xs font-normal text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
        <span dir="ltr" className="[unicode-bidi:plaintext]">{formatEgyptPhoneForDisplay(order.assigned_representative?.phone ?? `#${representativeId}`)}</span>
      </span>
    </Link>
  );
}

function OrderRouteCard({ order }: { order: BackendOrder }) {
  const activeStatus = routeActiveStatus(order);
  const activeIndex = orderRouteIndex(activeStatus);
  const reachedStatuses = orderHistoryStatuses(order);
  const hasExceptionalFinal = isExceptionalTerminalStatus(order.status);
  const routeStatuses = hasExceptionalFinal
    ? [...orderRouteStatuses, order.status]
    : orderRouteStatuses;
  const timelineEvents = orderTimelineEvents(order);

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-muted/25 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
            <PackageCheck className="size-5" />
          </span>
          <div>
            <div className="font-semibold">مسار الطلب</div>
            <div className="mt-1 text-xs text-muted-foreground">
              آخر تحديث {dateTime(order.updated_at ?? order.created_at)}
            </div>
          </div>
        </div>
        <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
      </div>
      <ol className="grid gap-3 px-5 py-5">
        {timelineEvents.map((event, index) => (
          <li key={`${event.key}-${event.time}-${index}`} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                event.active ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card text-muted-foreground",
              )}
            >
              <Check className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className={cn("block font-semibold", event.active && "text-emerald-600 dark:text-emerald-300")}>
                {event.label}
              </span>
              <time className="mt-1 block text-xs text-muted-foreground">{dateTime(event.time)}</time>
              {event.detail ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {event.cancelled && order.rejection_reason?.trim()
                    ? `سبب الإلغاء: ${order.rejection_reason.trim()}`
                    : event.detail}
                  {/*
                  سبب الإلغاء: {order.rejection_reason.trim()}
                  */}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {false ? (
        <div className="flex min-h-24 items-center gap-3 px-5 py-5 text-sm text-destructive">
          <XCircle className="size-5" />
          تم إلغاء الطلب.
        </div>
      ) : (
        <ol className={cn("grid gap-y-5 px-5 py-6 md:gap-y-0", hasExceptionalFinal ? "md:grid-cols-6" : "md:grid-cols-5")}>
          {routeStatuses.map((status, index) => {
            const isExceptionStep = hasExceptionalFinal && status === order.status && index === routeStatuses.length - 1;
            const isReached = isExceptionStep || reachedStatuses.has(status) || (!isExceptionStep && index <= activeIndex);
            const isActive = isExceptionStep || (!hasExceptionalFinal && status === activeStatus);
            const isConnectorReached = !isExceptionStep && index < activeIndex;

            return (
              <li
                key={status}
                className="relative flex min-w-0 items-start gap-3 text-sm md:flex-col md:items-center md:gap-3 md:text-center"
              >
                {index < routeStatuses.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute start-[15px] top-8 z-0 h-[calc(100%+1.25rem)] w-0.5 transition-colors md:start-auto md:right-1/2 md:top-4 md:h-0.5 md:w-full",
                      isConnectorReached ? "bg-emerald-500" : isExceptionStep ? "bg-red-500" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isExceptionStep
                      ? "border-red-500 bg-red-500 text-white shadow-sm shadow-red-500/25"
                      : isReached
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                      : "border-border bg-card text-muted-foreground",
                    isActive && (isExceptionStep ? "ring-4 ring-red-500/10" : "ring-4 ring-emerald-500/10"),
                  )}
                >
                  {isExceptionStep ? <XCircle className="size-4" /> : isReached ? <Check className="size-4 stroke-[3]" /> : null}
                </span>
                <div className="min-w-0 text-right md:text-center">
                  <div
                    className={cn(
                      "font-semibold transition-colors",
                      isExceptionStep
                        ? "text-red-600 dark:text-red-300"
                        : isReached
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {statusLabels[status]}
                  </div>
                  <time
                    className={cn(
                      "mt-0.5 block text-xs",
                      isExceptionStep
                        ? "text-red-600/75 dark:text-red-300/75"
                        : isReached
                        ? "text-emerald-600/75 dark:text-emerald-300/75"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {isReached ? dateTime(order.updated_at ?? order.created_at) : "في الانتظار"}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
