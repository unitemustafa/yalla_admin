"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { AppSelect, Badge, Button, Card, CurrencyText, Field, Input, PageTitle, Pagination } from "../primitives";
import { useSnackbar } from "../snackbar";
import {
  cleanText,
  deliveryLaterLabel,
  formatOrderMoney,
  getDeliveryAreaName as orderDeliveryAreaName,
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDeliveryTypeLabel,
  getManualArea,
  getManualCity,
  getMarketCount,
  getMarketSections,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  getPickupStatusLabel,
  getServiceCityName as orderServiceCityName,
  isGeneralOrder,
  isMultiMarket,
  numberValue,
  objectName,
  orderReviewStatusLabels,
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
  | "under_preparation"
  | "ready"
  | "picked_up"
  | "on_the_way"
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
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
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

type BackendProduct = {
  id: number;
  name: string;
  market?: { id: number; name?: string | null } | null;
  category?: { id: number; name?: string | null; type?: string | null } | null;
  is_available?: boolean;
  variants?: Array<{ id: number; price: string; sku?: string | null }>;
};

type BackendMarket = {
  id: number;
  name?: string | null;
  branch?: string | null;
  scope?: string | null;
  status?: string | null;
};

type BackendOffer = {
  id: number;
  title?: string | null;
  type?: string | null;
  discount?: string | number | null;
  status?: string | null;
  market_id?: number | string | null;
  market?: { id: number; name?: string | null } | null;
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
  discountAmount: string;
};

type ProductVariantOption = {
  id: string;
  productId: number;
  productName: string;
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
  "under_preparation",
  "ready",
  "picked_up",
  "on_the_way",
  "delivered",
];

const filterStatusOptions: BackendOrderStatus[] = [...statusOptions, "failed_delivery", "cancelled"];

const orderRouteStatuses: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "under_preparation",
  "ready",
  "picked_up",
  "on_the_way",
  "delivered",
];

const ordersPageSize = 10;

const statusLabels: Record<BackendOrderStatus, string> = orderStatusLabels;
const reviewStatusLabels: Record<BackendReviewStatus, string> = orderReviewStatusLabels;

function statusTone(status: BackendOrderStatus): "blue" | "green" | "red" | "secondary" {
  if (status === "delivered") return "green";
  if (status === "cancelled" || status === "failed_delivery") return "red";
  if (status === "ready" || status === "confirmed" || status === "on_the_way" || status === "picked_up") return "blue";
  return "secondary";
}

function reviewStatusTone(status: string | null | undefined): "blue" | "green" | "red" | "secondary" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "pending_review") return "blue";
  return "secondary";
}

function deliveryTypeLabel(order: BackendOrder) {
  return getDeliveryTypeLabel(order);
}

function deliveryTypeTone(order: BackendOrder): "blue" | "green" | "red" | "secondary" {
  if (order.delivery_type === "fixed_area") return "green";
  if (order.delivery_type === "delivery" || order.delivery_type === "manual_quote") return "blue";
  if (order.delivery_price_status === "fixed") return "green";
  return "secondary";
}

function deliveryFeeLabel(order: BackendOrder) {
  if (order.delivery_label?.trim()) return order.delivery_label;
  return getDeliveryPriceLabel(order);
}

function draftLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function draftOfferId() {
  return `offer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  const isDeliveryOrder = order.delivery_type === "delivery" || order.delivery_type === "manual_quote";
  const Icon = isDeliveryOrder ? Truck : MapPin;

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
  const isDeliveryOrder = order.delivery_type === "delivery" || order.delivery_type === "manual_quote";
  const Icon = isDeliveryOrder ? Truck : MapPin;

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        isDeliveryOrder && "bg-red-500/10 text-red-600 dark:text-red-300",
      )}
      title={deliveryTypeLabel(order)}
      aria-label={deliveryTypeLabel(order)}
    >
      <Icon className="size-5" />
    </span>
  );
}

function orderNumber(order: BackendOrder) {
  return order.order_number || `طلب #${order.id}`;
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
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data as BackendOrder;
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

function reviewStatusLabel(status: string | null | undefined) {
  return status && status in reviewStatusLabels
    ? reviewStatusLabels[status as BackendReviewStatus]
    : status || "-";
}

function assignedRepresentativeId(order: BackendOrder) {
  return order.assigned_representative?.id ?? order.assigned_representative_id ?? null;
}

function apiError(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
}

function orderRouteIndex(status: BackendOrderStatus) {
  const index = orderRouteStatuses.indexOf(status);
  return index >= 0 ? index : 0;
}

function canMoveToStatus(currentStatus: BackendOrderStatus, nextStatus: BackendOrderStatus) {
  if (currentStatus === "cancelled") return false;
  const currentIndex = orderRouteIndex(currentStatus);
  const nextIndex = orderRouteIndex(nextStatus);
  return nextIndex > currentIndex;
}

function representativeName(order: BackendOrder) {
  const representative = order.assigned_representative;
  if (!representative) {
    return "لم يتم تعيين مندوب";
  }
  return [representative.first_name, representative.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || "مندوب غير معروف";
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

function representativeHref(order: BackendOrder) {
  const representative = order.assigned_representative;
  const representativeId = representative?.id ?? order.assigned_representative_id;
  if (!representativeId) return "/delivery/couriers";
  return `/delivery/couriers/${representativeId}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function BackendOrdersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
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

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
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
          representativeName(order),
          order.payment_method,
          order.delivery_price,
          order.total_price,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesDeliveryType && matchesQuery;
    });
  }, [orders, query, status, deliveryType]);

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / ordersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ordersPageSize;
  const pagedOrders = visibleOrders.slice(pageStartIndex, pageStartIndex + ordersPageSize);

  const readyCount = orders.filter((order) => order.status === "ready" && !assignedRepresentativeId(order)).length;
  const assignedCount = orders.filter((order) => Boolean(assignedRepresentativeId(order))).length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

  async function copyOrderNumberFromList(order: BackendOrder) {
    try {
      await copyText(orderNumber(order));
      showSnackbar({ message: `تم نسخ رقم الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ رقم الطلب.", tone: "danger" });
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
        <Metric title="جاهزة للإسناد" value={readyCount} />
        <Metric title="مسندة لمندوب" value={assignedCount} />
        <Metric title="تم التسليم" value={deliveredCount} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_190px_220px]">
          <label className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="ps-9"
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
              ...filterStatusOptions.map((value) => ({
                value,
                label: statusLabels[value],
              })),
            ]}
            ariaLabel="فلترة حالة الطلب"
            dir="rtl"
            className="h-9"
          />
          <AppSelect
            value={deliveryType}
            onValueChange={(value) => {
              setDeliveryType(value as "all" | "fixed_area" | "delivery");
              setCurrentPage(1);
            }}
            options={[
              { value: "all", label: "كل أنواع التوصيل" },
              { value: "fixed_area", label: "منطقة ثابتة" },
              { value: "delivery", label: "دليفري / أخرى" },
            ]}
            ariaLabel="فلترة نوع التوصيل"
            dir="rtl"
            className="h-9"
          />
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : visibleOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات مطابقة.
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            {pagedOrders.map((order, index) => {
              const isDeliveryOrder = order.delivery_type === "delivery" || order.delivery_type === "manual_quote";

              return (
                <div
                  key={order.id}
                  className={cn(
                    "grid gap-4 rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/35 hover:bg-muted/20 xl:grid-cols-[minmax(270px,1.25fr)_minmax(180px,0.85fr)_160px_170px_150px_82px] xl:items-center",
                    isDeliveryOrder &&
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
                        <Link
                          href={`/orders/view/${order.id}`}
                          dir="ltr"
                          className={cn(
                            "truncate font-bold text-primary hover:underline",
                            isDeliveryOrder && "text-red-600 dark:text-red-300",
                          )}
                        >
                          {orderNumber(order)}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void copyOrderNumberFromList(order);
                          }}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          aria-label={`نسخ رقم الطلب ${orderNumber(order)}`}
                          title="نسخ رقم الطلب"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
                        <Badge tone={reviewStatusTone(order.review_status)}>
                          {reviewStatusLabel(order.review_status)}
                        </Badge>
                        <Badge tone={isGeneralOrder(order) ? "secondary" : "blue"}>
                          {getOrderScopeLabel(order)}
                        </Badge>
                        <Badge tone={isMultiMarket(order) ? "green" : "secondary"}>
                          {isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}
                        </Badge>
                        <DeliveryTypeBadge order={order} />
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-bold">{customerName(order)}</div>
                    <div className="mt-1 inline-block max-w-full truncate text-start text-xs text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
                      {order.customer?.phone ?? `user_id: ${order.user_id ?? "-"}`}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-muted-foreground">محلات الطلب</div>
                    <div className="mt-1 truncate font-semibold">{marketName(order)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {getMarketCount(order).toLocaleString("en-US")} {getMarketCount(order) > 1 ? "محلات" : "محل"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-muted-foreground">المندوب</div>
                    <div className="mt-1">
                      {assignedRepresentativeId(order) ? (
                        <Link
                          href={representativeHref(order)}
                          className="inline-grid max-w-full gap-0.5 font-semibold text-primary hover:underline"
                        >
                          <span className="truncate">{representativeName(order)}</span>
                          <span className="truncate text-start text-[11px] font-normal text-muted-foreground [unicode-bidi:plaintext]" dir="ltr">
                            {order.assigned_representative?.phone ?? `#${assignedRepresentativeId(order)}`}
                          </span>
                        </Link>
                      ) : (
                        <Badge tone={order.status === "ready" ? "blue" : "secondary"}>
                          {order.status === "ready" ? "جاهز للإسناد" : "غير مسند"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <CurrencyText className="block text-base font-extrabold tabular-nums">
                      {money(order.total_price)}
                    </CurrencyText>
                    <div className="mt-1 text-xs text-muted-foreground">{order.payment_method ?? "-"}</div>
                  </div>

                  <div className="grid gap-2 rounded-md border bg-muted/10 p-3 text-xs xl:col-span-6 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryPill label="نوع الطلب" value={getOrderScopeLabel(order)} />
                    <SummaryPill label="وجهة التوصيل" value={getDeliveryDestination(order)} />
                    <SummaryPill label="نوع التوصيل" value={deliveryTypeLabel(order)} />
                    <SummaryPill label="سعر التوصيل" value={deliveryFeeLabel(order)} />
                    <SummaryPill label="تاريخ الإنشاء" value={dateTime(order.created_at)} />
                    <SummaryPill label="محلات الطلب" value={marketName(order)} />
                    <SummaryPill label="المنتجات" value={money(order.subtotal_price)} />
                    <SummaryPill label="الخصم" value={money(order.discount)} />
                    <SummaryPill label="ملاحظات الطلب" value={order.description?.trim() || "-"} />
                    <SummaryPill label="ملاحظة التوصيل" value={order.delivery_note?.trim() || "-"} />
                  </div>

                  <Link
                    href={`/orders/view/${order.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition hover:bg-accent xl:w-full"
                  >
                    فتح
                  </Link>
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
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [createAddressOpen, setCreateAddressOpen] = useState(false);
  const [addressName, setAddressName] = useState("");
  const [addressLatitude, setAddressLatitude] = useState("");
  const [addressLongitude, setAddressLongitude] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [description, setDescription] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([
    { id: draftLineId(), variantId: "", quantity: "1", unitPrice: "" },
  ]);
  const [orderOffers, setOrderOffers] = useState<OrderOfferDraft[]>([]);
  const [pickerLineId, setPickerLineId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productMarketFilter, setProductMarketFilter] = useState("all");
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
      const nextMarkets = apiListData<BackendMarket>(marketsData);
      setMarkets(nextMarkets);
      setSelectedMarketId((current) => current || (nextMarkets[0]?.id ? String(nextMarkets[0].id) : ""));
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

  function resetAddressDraft() {
    setAddressName("");
    setAddressLatitude("");
    setAddressLongitude("");
  }

  function selectCustomer(userId: string) {
    setSelectedUser(userId);
    setCustomerPickerOpen(false);
    setCustomerQuery("");
    setCreateAddressOpen(false);
    resetAddressDraft();
    void loadAddresses(userId);
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
      if (addressLatitude.trim()) body.latitude = addressLatitude.trim();
      if (addressLongitude.trim()) body.longitude = addressLongitude.trim();

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
        categoryName: product.category?.name?.trim() || "بدون تصنيف",
        marketName: product.market?.name?.trim() || "بدون محل",
        label: `${product.name} - ${money(variant.price)}${variant.sku ? ` - ${variant.sku}` : ""}`,
        price: Number(variant.price),
        marketId: product.market?.id,
        sku: variant.sku,
        available: product.is_available !== false,
      })),
    );
  }, [products]);

  const productMarkets = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((variant) => {
      if (variant.marketId) map.set(String(variant.marketId), variant.marketName);
    });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [variants]);

  const productCategories = useMemo(() => {
    return Array.from(new Set(variants.map((variant) => variant.categoryName)))
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, "ar"));
  }, [variants]);

  const selectedCustomer = useMemo(
    () => users.find((user) => String(user.id) === selectedUser) ?? null,
    [selectedUser, users],
  );

  const selectedAddressRecord = useMemo(
    () => addresses.find((address) => String(address.id) === selectedAddress) ?? null,
    [addresses, selectedAddress],
  );

  const selectedMarket = useMemo(
    () => markets.find((market) => String(market.id) === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = customerQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => customerSearchText(user).includes(normalizedQuery));
  }, [customerQuery, users]);

  const filteredVariants = useMemo(() => {
    const normalizedQuery = productQuery.trim().toLowerCase();

    return variants.filter((variant) => {
      const matchesQuery =
        !normalizedQuery ||
        [variant.productName, variant.sku, variant.marketName, variant.categoryName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesMarket =
        productMarketFilter === "all" || String(variant.marketId ?? "") === productMarketFilter;
      const matchesCategory =
        productCategoryFilter === "all" || variant.categoryName === productCategoryFilter;
      const matchesAvailability =
        productAvailabilityFilter === "all" ||
        (productAvailabilityFilter === "available" ? variant.available : !variant.available);

      return matchesQuery && matchesMarket && matchesCategory && matchesAvailability;
    });
  }, [productAvailabilityFilter, productCategoryFilter, productMarketFilter, productQuery, variants]);

  const subtotal = lines.reduce((sum, line) => {
    const variant = variants.find((item) => item.id === line.variantId);
    const unitPrice = Number(line.unitPrice || variant?.price || 0);
    return sum + unitPrice * Math.max(1, Number(line.quantity) || 1);
  }, 0);
  const selectedVariants = lines.map((line) => line.variantId).filter(Boolean);
  const selectedVariantMarketIds = lines
    .map((line) => variants.find((variant) => variant.id === line.variantId)?.marketId)
    .filter((marketId): marketId is number => typeof marketId === "number");
  const selectedVariantMarketId = selectedVariantMarketIds[0];
  const selectedVariantMarketCount = new Set(selectedVariantMarketIds).size;
  const selectedMarketInOrder =
    selectedMarketId && selectedVariantMarketIds.some((marketId) => String(marketId) === selectedMarketId);
  const primaryMarketId =
    selectedVariantMarketIds.length > 0
      ? selectedMarketInOrder
        ? selectedMarketId
        : selectedVariantMarketId
          ? String(selectedVariantMarketId)
          : ""
      : selectedMarketId;
  const primaryMarket = useMemo(
    () => markets.find((market) => String(market.id) === primaryMarketId) ?? selectedMarket,
    [markets, primaryMarketId, selectedMarket],
  );
  const hasMixedMarkets = selectedVariantMarketCount > 1;
  const selectedVariantMarketSummary = Array.from(new Set(
    lines
      .map((line) => variants.find((variant) => variant.id === line.variantId)?.marketName)
      .filter((name): name is string => Boolean(name)),
  )).join(", ");
  function updateLine(id: string, patch: Partial<OrderLineDraft>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedUser ||
      !selectedAddress ||
      !primaryMarketId ||
      !paymentMethod.trim() ||
      !selectedVariants.length
    ) return;

    const items = lines
      .filter((line) => line.variantId)
      .map((line) => {
        const variant = variants.find((item) => item.id === line.variantId);
        const unitPrice = Number(line.unitPrice || variant?.price || 0);

        return {
          variant_id: Number(line.variantId),
          quantity: Math.max(1, Number(line.quantity) || 1),
          unit_price: unitPrice.toFixed(2),
        };
      });

    if (!items.length || items.some((item) => !item.variant_id || item.quantity < 1 || Number(item.unit_price) < 0)) {
      showSnackbar({ message: "أكمل بيانات منتجات الطلب.", tone: "danger" });
      return;
    }

    const selectedOfferPayload = orderOffers
      .filter((offer) => offer.offerId)
      .map((offer) => ({
        offer_id: Number(offer.offerId),
        discount_amount: Number(offer.discountAmount || 0).toFixed(2),
      }));

    if (selectedOfferPayload.some((offer) => !offer.offer_id || Number(offer.discount_amount) < 0)) {
      showSnackbar({ message: "أكمل بيانات العروض أو احذف العرض غير المكتمل.", tone: "danger" });
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch("orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(selectedUser),
          delivery_address_id: Number(selectedAddress),
          market_id: Number(primaryMarketId),
          payment_method: paymentMethod.trim(),
          description: description.trim(),
          delivery_note: deliveryNote.trim(),
          items,
          offers: selectedOfferPayload,
        }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إنشاء الطلب."));
      const order = apiOrderData(data) ?? (data as BackendOrder);
      showSnackbar({
        message: `تم إنشاء الطلب. الإجمالي ${money(order.total_price)}، التوصيل ${deliveryFeeLabel(order)}.`,
        tone: "success",
      });
      router.push(`/orders/view/${order.id}`);
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
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="mt-6 p-6 text-sm text-destructive">{error}</Card>
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
                    "flex h-11 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60",
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
                      onValueChange={setSelectedAddress}
                      placeholder="اختر العنوان"
                      ariaLabel="اختيار عنوان التوصيل"
                      className="h-10 bg-input"
                      disabled={!selectedUser}
                      options={addresses.map((address) => ({
                        value: String(address.id),
                        label: addressLabel(address),
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0"
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
                        placeholder="عنوان التوصيل"
                        className="h-10"
                      />
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          value={addressLatitude}
                          onChange={(event) => setAddressLatitude(event.target.value)}
                          placeholder="Latitude"
                          dir="ltr"
                          className="h-10"
                        />
                        <Input
                          value={addressLongitude}
                          onChange={(event) => setAddressLongitude(event.target.value)}
                          placeholder="Longitude"
                          dir="ltr"
                          className="h-10"
                        />
                      </div>
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
                <div className="grid gap-2 rounded-md border bg-muted/10 p-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <SummaryPill
                    label="نوع الطلب"
                    value={
                      selectedAddressRecord.service_city_id || selectedAddressRecord.service_city
                        ? "مدينة خدمة"
                        : "عام"
                    }
                  />
                  <SummaryPill
                    label="وجهة التوصيل"
                    value={[
                      selectedAddressRecord.service_city?.name_ar?.trim() ||
                        selectedAddressRecord.service_city?.name?.trim() ||
                        selectedAddressRecord.manual_city?.trim(),
                      selectedAddressRecord.delivery_area?.name?.trim() ||
                        selectedAddressRecord.manual_area?.trim(),
                      selectedAddressRecord.details?.trim() ||
                        selectedAddressRecord.line1?.trim() ||
                        selectedAddressRecord.street?.trim() ||
                        selectedAddressRecord.name?.trim(),
                    ].filter(Boolean).join(" - ") || "-"}
                  />
                  <SummaryPill
                    label="المنطقة"
                    value={selectedAddressRecord.delivery_area?.name?.trim() || selectedAddressRecord.manual_area?.trim() || "-"}
                  />
                  <SummaryPill
                    label="نوع التوصيل"
                    value={selectedAddressRecord.delivery_type === "fixed_area" ? "توصيل ثابت" : "دليفري يدوي"}
                  />
                  <SummaryPill
                    label={selectedAddressRecord.delivery_type === "fixed_area" ? "سعر التوصيل المتوقع" : "سعر التوصيل"}
                    value={
                      selectedAddressRecord.delivery_type === "fixed_area"
                        ? money(selectedAddressRecord.delivery_price_preview ?? selectedAddressRecord.delivery_area?.delivery_price)
                        : "يحدد لاحقاً"
                    }
                  />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="المحل الأساسي">
                  <AppSelect
                    value={selectedMarketId}
                    onValueChange={(marketId) => {
                      setSelectedMarketId(marketId);
                      setProductMarketFilter("all");
                    }}
                    placeholder="اختر المحل"
                    ariaLabel="اختيار المحل الأساسي"
                    className="h-11 bg-input"
                    options={markets.map((market) => ({
                      value: String(market.id),
                      label: [market.name?.trim() || `محل #${market.id}`, market.branch?.trim()]
                        .filter(Boolean)
                        .join(" - "),
                    }))}
                  />
                </Field>
                <Field label="طريقة الدفع">
                  <Input
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-11 bg-input"
                    placeholder="cash_on_delivery"
                    dir="ltr"
                  />
                </Field>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">منتجات الطلب</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLines((current) => [
                        ...current,
                        { id: draftLineId(), variantId: "", quantity: "1", unitPrice: "" },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    إضافة منتج
                  </Button>
                </div>
                {lines.map((line, index) => {
                  const selectedVariant = variants.find((variant) => variant.id === line.variantId);

                  return (
                  <div key={line.id} className="grid gap-3 rounded-md border bg-muted/10 p-3 md:grid-cols-[minmax(0,1fr)_130px_150px_44px] md:items-center">
                    <input required type="hidden" value={line.variantId} readOnly />
                    <button
                      type="button"
                      onClick={() => setPickerLineId(line.id)}
                      className={cn(
                        "flex h-14 w-full items-center justify-between gap-3 rounded-md border bg-input px-3 py-2 text-start text-sm shadow-sm transition hover:border-primary/45 hover:bg-accent/60",
                        !selectedVariant && "text-muted-foreground",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {selectedVariant?.productName ?? "اختر المنتج"}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {selectedVariant
                            ? `${selectedVariant.marketName} - ${selectedVariant.categoryName} - ${money(selectedVariant.price)}${selectedVariant.sku ? ` - ${selectedVariant.sku}` : ""}`
                            : "افتح قائمة المنتجات وابحث بالاسم أو الكود أو المحل."}
                        </span>
                      </span>
                      <Search className="size-4 shrink-0 text-primary" />
                    </button>
                    <Input
                      readOnly
                      value={line.unitPrice || (selectedVariant ? Number(selectedVariant.price || 0).toFixed(2) : "")}
                      className="h-14 text-center text-base font-semibold"
                      placeholder="unit_price"
                      dir="ltr"
                    />
                    <Input
                      required
                      min={1}
                      type="number"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      className="h-14 text-center text-base font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      disabled={lines.length === 1}
                      onClick={() => removeLine(line.id)}
                      aria-label={`حذف المنتج ${index + 1}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  );
                })}
                {hasMixedMarkets ? (
                  <p className="text-sm font-semibold text-primary">
                    سيتم إنشاء طلب متعدد المحلات: {selectedVariantMarketSummary}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">العروض</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setOrderOffers((current) => [
                        ...current,
                        { id: draftOfferId(), offerId: "", discountAmount: "0" },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    إضافة عرض
                  </Button>
                </div>
                {orderOffers.length === 0 ? (
                  <div className="rounded-md border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    يمكن ترك العروض فارغة.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {orderOffers.map((offerLine, index) => (
                      <div
                        key={offerLine.id}
                        className="grid gap-3 rounded-md border bg-muted/10 p-3 md:grid-cols-[minmax(0,1fr)_150px_44px] md:items-center"
                      >
                        <AppSelect
                          value={offerLine.offerId}
                          onValueChange={(offerId) =>
                            setOrderOffers((current) =>
                              current.map((line) =>
                                line.id === offerLine.id ? { ...line, offerId } : line,
                              ),
                            )
                          }
                          placeholder="اختر العرض"
                          ariaLabel={`اختيار العرض ${index + 1}`}
                          className="h-11 bg-input"
                          options={offers.map((offer) => ({
                            value: String(offer.id),
                            label: `${offer.title?.trim() || `عرض #${offer.id}`} - ${offer.type ?? "-"} - ${money(offer.discount)}`,
                          }))}
                        />
                        <Input
                          min={0}
                          step="0.01"
                          type="number"
                          value={offerLine.discountAmount}
                          onChange={(event) =>
                            setOrderOffers((current) =>
                              current.map((line) =>
                                line.id === offerLine.id
                                  ? { ...line, discountAmount: event.target.value }
                                  : line,
                              ),
                            )
                          }
                          className="h-11 text-center"
                          placeholder="discount_amount"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11"
                          onClick={() =>
                            setOrderOffers((current) =>
                              current.filter((line) => line.id !== offerLine.id),
                            )
                          }
                          aria-label={`حذف العرض ${index + 1}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Field label="ملاحظات">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 rounded-md border bg-input px-3 py-2 text-sm"
                />
              </Field>
              <Field label="ملاحظة التوصيل">
                <textarea
                  value={deliveryNote}
                  onChange={(event) => setDeliveryNote(event.target.value)}
                  className="min-h-24 rounded-md border bg-input px-3 py-2 text-sm"
                  placeholder="مثلاً: الاتصال عند الوصول"
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
              <SummaryRow label="المحل الأساسي" value={primaryMarket?.name?.trim() || "-"} />
              <SummaryRow label="محلات المنتجات" value={selectedVariantMarketSummary || "-"} />
              <SummaryRow label="إجمالي المنتجات" value={money(subtotal)} />
              <SummaryRow
                label="نوع التوصيل"
                value={
                  selectedAddressRecord?.delivery_type === "fixed_area"
                    ? "توصيل ثابت"
                    : selectedAddressRecord
                      ? "دليفري يدوي"
                      : "-"
                }
              />
              <SummaryRow
                label="سعر التوصيل المتوقع"
                value={
                  selectedAddressRecord?.delivery_type === "fixed_area"
                    ? money(selectedAddressRecord.delivery_price_preview ?? selectedAddressRecord.delivery_area?.delivery_price)
                    : selectedAddressRecord
                      ? "يحدد لاحقاً"
                      : "-"
                }
              />
              <SummaryRow label="عدد العروض" value={`${orderOffers.filter((offer) => offer.offerId).length}`} />
              <div className="mt-auto border-t pt-4" />
            </div>
            <Button
              className="mt-5 w-full"
              disabled={
                saving ||
                !selectedUser ||
                !selectedAddress ||
                !primaryMarketId ||
                !paymentMethod.trim() ||
                !selectedVariants.length
              }
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
              حفظ الطلب
            </Button>
          </Card>
          <ProductVariantPicker
            open={pickerLineId !== null}
            variants={filteredVariants}
            allVariantsCount={variants.length}
            selectedVariantId={pickerLineId ? lines.find((line) => line.id === pickerLineId)?.variantId ?? "" : ""}
            query={productQuery}
            onQueryChange={setProductQuery}
            marketFilter={productMarketFilter}
            onMarketFilterChange={setProductMarketFilter}
            marketOptions={productMarkets}
            categoryFilter={productCategoryFilter}
            onCategoryFilterChange={setProductCategoryFilter}
            categoryOptions={productCategories}
            availabilityFilter={productAvailabilityFilter}
            onAvailabilityFilterChange={setProductAvailabilityFilter}
            onClose={() => setPickerLineId(null)}
            onSelect={(variantId) => {
              const variant = variants.find((item) => item.id === variantId);
              const otherSelectedMarketIds = lines
                .filter((line) => line.id !== pickerLineId)
                .map((line) => variants.find((item) => item.id === line.variantId)?.marketId)
                .filter((marketId): marketId is number => typeof marketId === "number");
              if (variant?.marketId && (!selectedMarketId || otherSelectedMarketIds.length === 0)) {
                setSelectedMarketId(String(variant.marketId));
              }
              if (pickerLineId) {
                updateLine(pickerLineId, {
                  variantId,
                  unitPrice: variant ? Number(variant.price || 0).toFixed(2) : "",
                });
              }
              setPickerLineId(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-6 backdrop-blur-sm">
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
                        {customer.phone ? <span dir="ltr">{customer.phone}</span> : null}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 px-4 py-6 backdrop-blur-sm">
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
              ابحث بالاسم أو الكود، وفلتر حسب المحل أو التصنيف قبل الإضافة.
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

        <div className="grid gap-3 border-b bg-muted/15 p-4 lg:grid-cols-[minmax(260px,1fr)_200px_190px_170px]">
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
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{variant.sku || `#${variant.id}`}</span>
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

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 text-sm", strong && "text-base font-bold")}>
      <span className="text-muted-foreground">{label}</span>
      <CurrencyText className="tabular-nums" >{value}</CurrencyText>
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
  return objectName(section.market) || "محل غير محدد";
}

function orderOfferTitle(offer: BackendOrderOffer, index: number) {
  return (
    cleanText(offer.offer?.title) ||
    cleanText(offer.title) ||
    `عرض ${index + 1}`
  );
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
            const offers = [] as BackendOrderOffer[];
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
                        <Badge tone={cleanText(section.pickup_status) === "picked_up" ? "green" : "secondary"}>
                          {getPickupStatusLabel(section.pickup_status)}
                        </Badge>
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

                <div className="hidden">
                  <div className="mb-3 font-semibold" />
                  {offers.length === 0 ? (
                    <div className="rounded-md border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                      لا توجد عروض لهذا المحل.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {offers.map((offer, index) => (
                        <div key={`${offer.id ?? offer.offer_id ?? index}`} className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2 text-sm">
                          <span className="font-medium">{orderOfferTitle(offer, index)}</span>
                          <span className="text-muted-foreground">
                            {money(offer.discount_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [representativeOpen, setRepresentativeOpen] = useState(false);
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(nextStatus: BackendOrderStatus) {
    if (!order || order.status === nextStatus) return;
    if (nextStatus !== "cancelled" && !canMoveToStatus(order.status, nextStatus)) {
      showSnackbar({ message: "لا يمكن الرجوع لمرحلة سابقة في حالة الطلب.", tone: "danger" });
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
    if (!order || !assignedRepresentativeId(order) || order.status !== "ready") return;
    setSavingAssignment(true);
    try {
      const response = await apiFetch(`orders/${order.id}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: null }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إلغاء إسناد الطلب."));
      setOrder(data as BackendOrder);
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
      const nextOrder = apiOrderData(data) ?? (data as BackendOrder);
      setOrder(nextOrder);
      setDeliveryPriceDraft(nextOrder.delivery_price ?? "");
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
      await copyText(orderNumber(order));
      showSnackbar({ message: `تم نسخ رقم الطلب ${orderNumber(order)}.` });
    } catch {
      showSnackbar({ message: "تعذر نسخ رقم الطلب.", tone: "danger" });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrder();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return <div className="px-6 py-8 text-sm text-destructive">{error ?? "الطلب غير موجود."}</div>;
  }

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
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {customerName(order)} - {marketName(order)} - {dateTime(order.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void copyOrderNumber()}>
              <Copy className="size-4" />
              نسخ رقم الطلب
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const current = order.status === option;
                const canMove = canMoveToStatus(order.status, option);
                const completed = orderRouteIndex(option) < orderRouteIndex(order.status);

                return (
                  <Button
                    key={option}
                    type="button"
                    variant={current ? "default" : "outline"}
                    disabled={savingStatus || current || !canMove}
                    title={completed ? "مرحلة تمت ولا يمكن الرجوع إليها" : undefined}
                    onClick={() => void updateStatus(option)}
                  >
                    {statusLabels[option]}
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 border-t pt-3">
              <Button
                type="button"
                variant={order.status === "cancelled" ? "danger" : "outline"}
                className="w-full"
                disabled={savingStatus || order.status === "cancelled"}
                onClick={() => void updateStatus("cancelled")}
              >
                <XCircle className="size-4" />
                إلغاء الطلب
              </Button>
            </div>
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
                <SummaryRow label="رقم الطلب" value={orderNumber(order)} />
                <SummaryRow label="حالة الطلب" value={statusLabels[order.status]} />
                <SummaryRow label="حالة المراجعة" value={reviewStatusLabel(order.review_status)} />
                <SummaryRow label="طريقة الدفع" value={order.payment_method ?? "-"} />
                <SummaryRow label="العميل" value={customerName(order)} />
                <SummaryRow label="الهاتف" value={order.customer?.phone ?? "-"} />
                <SummaryRow label="نوع الطلب" value={getOrderScopeLabel(order)} />
                <SummaryRow label="محلات الطلب" value={marketName(order)} />
                <SummaryRow label="عدد المحلات" value={String(getMarketCount(order) || "-")} />
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
                {order.custom_delivery_area ? (
                  <SummaryRow label="منطقة الدليفري" value={order.custom_delivery_area} />
                ) : null}
                <div className="mt-4 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setRepresentativeOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-start font-semibold transition hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Truck className="size-4 text-primary" />
                      المندوب
                    </span>
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", representativeOpen && "rotate-180")} />
                  </button>
                  {representativeOpen ? (
                    assignedRepresentativeId(order) ? (
                      <div className="grid gap-3">
                        <AssignedRepresentativeDetails order={order} />
                        {order.assigned_representative && order.status === "ready" ? (
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
                      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                        لم يتم إسناد الطلب لمندوب بعد.
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          {false ? (
            <Card className="p-5 text-sm">
              <div className="mb-1 font-semibold">سعر التوصيل</div>
              <p className="text-muted-foreground">
                {deliveryLaterLabel}
              </p>
            </Card>
          ) : null}
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
                disabled={savingDeliveryPrice || ["delivered", "cancelled"].includes(order.status)}
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
                ["delivered", "cancelled"].includes(order.status) ||
                deliveryPriceDraft.trim() === ""
              }
              onClick={() => void updateDeliveryPrice()}
            >
              {savingDeliveryPrice ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
              حفظ سعر التوصيل
            </Button>
            {["delivered", "cancelled"].includes(order.status) ? (
              <p className="mt-2 text-xs text-muted-foreground">
                لا يمكن تعديل سعر التوصيل بعد التسليم أو الإلغاء.
              </p>
            ) : null}
          </Card>
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

function AssignedRepresentativeDetails({ order }: { order: BackendOrder }) {
  const representativeId = assignedRepresentativeId(order);
  if (!representativeId) return null;

  return (
    <Link
      href={representativeHref(order)}
      aria-label={`عرض تفاصيل المندوب ${representativeName(order)}`}
      className="mt-2 inline-flex max-w-full rounded-md border bg-muted/15 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    >
      <span className="truncate">{representativeName(order)}</span>
    </Link>
  );
}

function OrderRouteCard({ order }: { order: BackendOrder }) {
  const activeIndex = orderRouteIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const timelineEvents = [
    order.created_at
      ? { key: "created", label: "تم إنشاء الطلب", time: order.created_at, active: order.status === "pending" }
      : null,
    order.approved_at
      ? { key: "approved", label: "تمت الموافقة على الطلب", time: order.approved_at, active: order.review_status === "approved" }
      : null,
    order.assigned_at
      ? { key: "assigned", label: "تم تعيين مندوب", time: order.assigned_at, active: order.status === "ready" }
      : null,
    order.delivered_at
      ? { key: "delivered", label: "تم تسليم الطلب", time: order.delivered_at, active: order.status === "delivered" }
      : null,
    order.rejected_at
      ? { key: "cancelled", label: "تم إلغاء الطلب", time: order.rejected_at, active: order.status === "cancelled" }
      : order.status === "cancelled" && order.updated_at
        ? { key: "cancelled", label: "تم إلغاء الطلب", time: order.updated_at, active: true }
        : null,
    order.updated_at && order.status !== "cancelled" && !order.delivered_at
      ? { key: "current", label: `الحالة الحالية: ${statusLabels[order.status]}`, time: order.updated_at, active: true }
      : null,
  ].filter((event): event is { key: string; label: string; time: string; active: boolean } => Boolean(event));

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
              {event.key === "cancelled" && order.rejection_reason?.trim() ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  سبب الإلغاء: {order.rejection_reason.trim()}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
      {false && isCancelled ? (
        <div className="flex min-h-24 items-center gap-3 px-5 py-5 text-sm text-destructive">
          <XCircle className="size-5" />
          تم إلغاء الطلب.
        </div>
      ) : (
        <ol className="grid gap-y-5 px-5 py-6 md:grid-cols-7 md:gap-y-0">
          {orderRouteStatuses.map((status, index) => {
            const isReached = index <= activeIndex;
            const isActive = index === activeIndex;
            const isConnectorReached = index < activeIndex;

            return (
              <li
                key={status}
                className="relative flex min-w-0 items-start gap-3 text-sm md:flex-col md:items-center md:gap-3 md:text-center"
              >
                {index < orderRouteStatuses.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute start-[15px] top-8 z-0 h-[calc(100%+1.25rem)] w-0.5 transition-colors md:start-auto md:right-1/2 md:top-4 md:h-0.5 md:w-full",
                      isConnectorReached ? "bg-emerald-500" : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isReached
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                      : "border-border bg-card text-muted-foreground",
                    isActive && "ring-4 ring-emerald-500/10",
                  )}
                >
                  {isReached ? <Check className="size-4 stroke-[3]" /> : null}
                </span>
                <div className="min-w-0 text-right md:text-center">
                  <div
                    className={cn(
                      "font-semibold transition-colors",
                      isReached
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {statusLabels[status]}
                  </div>
                  <time
                    className={cn(
                      "mt-0.5 block text-xs",
                      isReached
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
