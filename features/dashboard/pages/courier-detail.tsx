"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import {
  assignedRepresentativeId,
  isActiveAssignedOrder,
} from "../courier-order-rules";
import {
  getDeliveryDestination,
  getDeliveryPriceLabel,
  getDeliveryTypeLabel,
  getMarketCount,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  isMultiMarket,
  type DashboardOrderLike,
} from "../order-display";
import { Badge, Button, Card, CurrencyText, Input } from "../primitives";
import {
  apiResponseData,
  firstApiError,
  fullNameFromBackendUser,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";
import { displayLocalPhone } from "../users/account-fields";

type CourierOrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed_delivery"
  | "cancelled";

type CourierOrder = DashboardOrderLike & {
  id: number;
  order_number?: string | null;
  status: CourierOrderStatus;
  total_price?: string | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  delivery_note?: string | null;
  customer?: {
    id?: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  assigned_representative?: number | string | { id?: number | string | null } | null;
  assigned_representative_id?: number | string | null;
};

const statusLabels: Record<CourierOrderStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  delivered: "تم التسليم",
  failed_delivery: "تعذر التوصيل",
  cancelled: "ملغي",
};
const courierStatusPollMs = 10_000;

function statusTone(status: CourierOrderStatus) {
  if (status === "delivered") return "green" as const;
  if (status === "cancelled" || status === "failed_delivery") return "red" as const;
  if (status === "confirmed" || status === "assigned" || status === "picked_up") return "blue" as const;
  return "secondary" as const;
}

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : "0.00"} EGP`;
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

function orderNumber(order: CourierOrder) {
  return order.order_number?.trim() || `YM-${order.id}`;
}

function customerName(order: CourierOrder) {
  if (order.customer?.name?.trim()) return order.customer.name.trim();
  return [order.customer?.first_name, order.customer?.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || `عميل #${order.customer?.id ?? "-"}`;
}

function orderTimestamp(order: CourierOrder) {
  const value =
    order.delivered_at ??
    order.assigned_at ??
    order.updated_at ??
    order.created_at ??
    "";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function SummaryMetric({
  title,
  value,
  icon,
  detail,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  detail: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground">{title}</div>
          <CurrencyText className="mt-2 block text-2xl font-extrabold">{value}</CurrencyText>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span dir={dir} className="min-w-0 break-words text-start font-semibold">
        {value || "غير محدد"}
      </span>
    </div>
  );
}

function FeaturedOrder({
  title,
  description,
  order,
  emptyText,
}: {
  title: string;
  description: string;
  order?: CourierOrder;
  emptyText: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b bg-muted/25 px-5 py-4">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        <PackageCheck className="size-5 shrink-0 text-primary" />
      </div>
      {order ? (
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={`/orders/view/${order.id}`}
                dir="ltr"
                className="font-bold text-primary hover:underline"
              >
                {orderNumber(order)}
              </Link>
              <div className="mt-1 text-sm font-semibold">{customerName(order)}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="secondary">{getOrderScopeLabel(order)}</Badge>
                <Badge tone={isMultiMarket(order) ? "green" : "secondary"}>
                  {isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {getOrderMarketsSummary(order)} - {getDeliveryDestination(order)}
              </div>
            </div>
            <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">الإجمالي</div>
              <CurrencyText className="mt-1 block font-bold">{money(order.total_price)}</CurrencyText>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {order.status === "delivered" ? "وقت التسليم" : "وقت الإسناد"}
              </div>
              <div className="mt-1 font-bold">
                {dateTime(order.delivered_at ?? order.assigned_at)}
              </div>
            </div>
          </div>
          {order.delivery_note ? (
            <div className="mt-4 rounded-md border bg-muted/25 px-3 py-2 text-sm">
              <span className="text-muted-foreground">ملاحظة التسليم: </span>
              {order.delivery_note}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center px-5 py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}
    </Card>
  );
}

export function CourierDetailPage({ courierId }: { courierId: string }) {
  const { apiFetch } = useAuth();
  const [courier, setCourier] = useState<BackendDashboardUser | null>(null);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusRefreshInFlightRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courierResponse, ordersResponse] = await Promise.all([
        apiFetch(`auth/users/${encodeURIComponent(courierId)}/`),
        apiFetch("orders/"),
      ]);
      const [courierData, ordersData] = await Promise.all([
        apiResponseData(courierResponse),
        apiResponseData(ordersResponse),
      ]);

      if (!courierResponse.ok) {
        throw new Error(firstApiError(courierData) ?? "تعذر تحميل بيانات المندوب.");
      }
      if (!ordersResponse.ok) {
        throw new Error(firstApiError(ordersData) ?? "تعذر تحميل طلبات المندوب.");
      }
      if (!isBackendDashboardUser(courierData) || courierData.role !== "representative") {
        throw new Error("حساب المندوب غير موجود.");
      }

      const courierOrders = Array.isArray(ordersData)
        ? (ordersData as CourierOrder[])
            .filter(
              (order) =>
                assignedRepresentativeId(order) === String(courierData.id),
            )
            .sort((first, second) => orderTimestamp(second) - orderTimestamp(first))
        : [];

      setCourier(courierData);
      setOrders(courierOrders);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل المندوب.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, courierId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const refreshCourierStatus = useCallback(async () => {
    if (statusRefreshInFlightRef.current) return;

    statusRefreshInFlightRef.current = true;
    try {
      const response = await apiFetch(
        `auth/users/${encodeURIComponent(courierId)}/`,
      );
      const data = await apiResponseData(response);

      if (response.ok && isBackendDashboardUser(data) && data.role === "representative") {
        setCourier(data);
        setError(null);
      }
    } finally {
      statusRefreshInFlightRef.current = false;
    }
  }, [apiFetch, courierId]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCourierStatus();
      }
    };
    const pollTimer = window.setInterval(
      refreshWhenVisible,
      courierStatusPollMs,
    );

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshCourierStatus]);

  const activeOrders = useMemo(
    () => orders.filter(isActiveAssignedOrder),
    [orders],
  );
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered"),
    [orders],
  );
  const deliveredTotal = useMemo(
    () =>
      deliveredOrders.reduce(
        (sum, order) => sum + Number(order.total_price ?? 0),
        0,
      ),
    [deliveredOrders],
  );
  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar-EG");
    if (!normalized) return orders;

    return orders.filter((order) =>
      [
        order.id,
        orderNumber(order),
        customerName(order),
        order.customer?.phone,
        getOrderScopeLabel(order),
        getOrderMarketsSummary(order),
        getDeliveryDestination(order),
        getDeliveryTypeLabel(order),
      ]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(normalized),
    );
  }, [orders, query]);
  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !courier) {
    return (
      <div className="px-6 py-8">
        <Card className="p-6">
          <div className="text-sm text-destructive">
            {error ?? "حساب المندوب غير موجود."}
          </div>
          <Link
            href="/delivery/couriers"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-accent"
          >
            <ArrowRight className="size-4" />
            الرجوع إلى المندوبين
          </Link>
        </Card>
      </div>
    );
  }

  const profile = courier.courier_profile;
  const hasSignedIn = courier.last_login != null;
  const isAvailable =
    courier.is_active !== false && profile?.is_available !== false;
  const maxActiveOrders = profile?.max_active_orders ?? 0;

  return (
    <div dir="rtl" className="px-6 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <DashboardImage
            src={courier.avatar_url}
            placeholderType="courier"
            alt={fullNameFromBackendUser(courier)}
            width={72}
            height={72}
            className="size-18 shrink-0 overflow-hidden rounded-full border bg-muted"
            imageClassName="object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">
                {fullNameFromBackendUser(courier)}
              </h1>
              <Badge tone={!hasSignedIn ? "blue" : isAvailable ? "green" : "red"}>
                {!hasSignedIn ? "لم يسجل الحساب بعد" : isAvailable ? "متاح" : "غير متاح"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              ملف المندوب والطلبات الحالية والسابقة
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            تحديث
          </Button>
          <Link
            href="/delivery/couriers"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-accent"
          >
            <ArrowRight className="size-4" />
            الرجوع للمندوبين
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          title="الطلبات المسندة"
          value={orders.length}
          detail="إجمالي سجل المندوب"
          icon={<Truck className="size-5" />}
        />
        <SummaryMetric
          title="جاري التسليم"
          value={activeOrders.length}
          detail={`${maxActiveOrders || "-"} الحد الأقصى النشط`}
          icon={<Clock3 className="size-5" />}
        />
        <SummaryMetric
          title="تم التسليم"
          value={deliveredOrders.length}
          detail="طلبات تم تسليمها"
          icon={<CheckCircle2 className="size-5" />}
        />
        <SummaryMetric
          title="قيمة الطلبات المسلمة"
          value={money(deliveredTotal)}
          detail="إجمالي قيمة الطلبات"
          icon={<CalendarDays className="size-5" />}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/25 px-5 py-4 font-semibold">
              <UserRound className="size-4 text-primary" />
              بيانات المندوب
            </div>
            <div className="px-5 py-2">
              <InfoRow label="اسم المستخدم" value={courier.username} />
              <InfoRow
                label="الهاتف"
                value={
                  courier.phone ? (
                    <a href={`tel:${courier.phone}`} className="text-primary hover:underline">
                      <Phone className="me-1 inline size-3.5" />
                      {displayLocalPhone(courier.phone)}
                    </a>
                  ) : null
                }
                dir="ltr"
              />
              <InfoRow
                label="البريد"
                value={
                  courier.email ? (
                    <a href={`mailto:${courier.email}`} className="text-primary hover:underline">
                      <Mail className="me-1 inline size-3.5" />
                      {courier.email}
                    </a>
                  ) : null
                }
                dir="ltr"
              />
              <InfoRow label="المركبة" value={profile?.vehicle_type} />
              <InfoRow label="رقم اللوحة" value={profile?.plate_number} dir="ltr" />
              <InfoRow
                label="مدينة التشغيل"
                value={
                  <>
                    <MapPin className="me-1 inline size-3.5 text-primary" />
                    {profile?.service_city_name}
                  </>
                }
              />
              <InfoRow label="التوفر" value={profile?.is_available === false ? "غير متاح" : "متاح"} />
              <InfoRow
                label="السعة النشطة"
                value={`${activeOrders.length} من ${maxActiveOrders || "-"}`}
              />
              <InfoRow label="تاريخ الانضمام" value={dateTime(courier.created_at)} />
            </div>
          </Card>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FeaturedOrder
            title="الطلب الجاري تسليمه"
            description="أحدث طلب نشط ومسند للمندوب"
            order={activeOrders[0]}
            emptyText="لا يوجد طلب قيد التسليم الآن."
          />
          <FeaturedOrder
            title="آخر طلب تم تسليمه"
            description="أحدث عملية تم تسليمها"
            order={deliveredOrders[0]}
            emptyText="لم يسلم المندوب أي طلب حتى الآن."
          />
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">كل طلبات المندوب</div>
            <div className="mt-1 text-xs text-muted-foreground">
              الطلبات النشطة والمسلمة مع العميل والعنوان والتوقيت
            </div>
          </div>
          <label className="relative w-full md:w-[480px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث برقم الطلب أو العميل..."
              className="h-10 border-border/70 bg-muted/20 ps-9 placeholder:text-muted-foreground/60"
            />
          </label>
        </div>

        {visibleOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b bg-muted/25 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-start">الطلب</th>
                  <th className="w-[240px] px-4 py-3 text-center">العميل</th>
                  <th className="px-4 py-3 text-start">محلات الطلب</th>
                  <th className="px-4 py-3 text-start">وجهة التوصيل</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">الإجمالي</th>
                  <th className="px-4 py-3 text-start">الإسناد</th>
                  <th className="px-4 py-3 text-start">التسليم</th>
                  <th className="px-4 py-3 text-start" />
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <Link href={`/orders/view/${order.id}`} className="font-semibold text-primary hover:underline" dir="ltr">
                        {orderNumber(order)}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge tone="secondary">{getOrderScopeLabel(order)}</Badge>
                        <Badge tone={isMultiMarket(order) ? "green" : "secondary"}>
                          {isMultiMarket(order) ? "متعدد المحلات" : "محل واحد"}
                        </Badge>
                      </div>
                    </td>
                    <td className="w-[240px] px-4 py-4 text-center align-middle">
                      <div className="mx-auto flex min-w-0 max-w-[210px] flex-col items-center gap-1 text-center">
                        <div className="w-full truncate text-center font-bold leading-6 text-foreground">
                          {customerName(order)}
                        </div>
                        <div
                          className="w-full break-all text-center text-xs leading-5 text-muted-foreground"
                          dir="ltr"
                        >
                          {order.customer?.phone ?? "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{getOrderMarketsSummary(order)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        عدد المحلات: {getMarketCount(order) || "-"}
                      </div>
                    </td>
                    <td className="max-w-56 px-4 py-4">
                      <div>{getDeliveryDestination(order)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {getDeliveryTypeLabel(order)} - {getDeliveryPriceLabel(order)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={statusTone(order.status)}>
                        {statusLabels[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold" dir="ltr">
                      <CurrencyText>{money(order.total_price)}</CurrencyText>
                    </td>
                    <td className="px-4 py-4">{dateTime(order.assigned_at)}</td>
                    <td className="px-4 py-4">{dateTime(order.delivered_at)}</td>
                    <td className="px-4 py-4 text-end">
                      <Link
                        href={`/orders/view/${order.id}`}
                        className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        aria-label={`فتح الطلب ${orderNumber(order)}`}
                        title="فتح الطلب"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-44 items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            لا توجد طلبات مطابقة لهذا المندوب.
          </div>
        )}
      </Card>
    </div>
  );
}
