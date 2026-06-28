"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { AppSelect, Badge, Button, Card, Field, Input, PageTitle } from "../primitives";
import { useSnackbar } from "../snackbar";
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
  | "delivered"
  | "cancelled";

type BackendAddress = {
  id: number;
  name?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type BackendOrder = {
  id: number;
  order_number?: string | null;
  market?: { id: number; name?: string | null; branch?: string | null } | null;
  customer?: {
    id: number;
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
  delivery_type?: "fixed_area" | "manual_quote" | string | null;
  delivery_price_status?: "fixed" | "pending_quote" | string | null;
  custom_delivery_area?: string | null;
  delivery_label?: string | null;
  discount?: string | null;
  description?: string | null;
  status: BackendOrderStatus;
  delivery_price?: string | null;
  subtotal_price?: string | null;
  total_price?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items?: BackendOrderItem[];
};

type BackendOrderItem = {
  id: number;
  quantity: number;
  unit_price: string;
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

type BackendProduct = {
  id: number;
  name: string;
  market?: { id: number; name?: string | null } | null;
  variants?: Array<{ id: number; price: string; sku?: string | null }>;
};

type OrderLineDraft = {
  id: string;
  variantId: string;
  quantity: string;
};

type AssignmentFilter = "all" | "ready_unassigned" | "assigned" | "unassigned";

const statusOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "under_preparation",
  "ready",
  "delivered",
];

const filterStatusOptions: BackendOrderStatus[] = [...statusOptions, "cancelled"];

const orderRouteStatuses: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "under_preparation",
  "ready",
  "delivered",
];

const statusLabels: Record<BackendOrderStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  under_preparation: "قيد التجهيز",
  ready: "جاهز للإسناد",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function statusTone(status: BackendOrderStatus): "blue" | "green" | "red" | "secondary" {
  if (status === "delivered") return "green";
  if (status === "cancelled") return "red";
  if (status === "ready" || status === "confirmed") return "blue";
  return "secondary";
}

function deliveryTypeLabel(order: BackendOrder) {
  return order.delivery_type === "manual_quote" ? "دليفري" : "توصيل";
}

function deliveryTypeTone(order: BackendOrder): "blue" | "green" | "secondary" {
  if (order.delivery_type === "manual_quote") return "blue";
  if (order.delivery_price_status === "fixed") return "green";
  return "secondary";
}

function deliveryFeeLabel(order: BackendOrder) {
  if (order.delivery_label?.trim()) return order.delivery_label;
  if (order.delivery_type === "manual_quote" && order.delivery_price_status === "pending_quote") {
    return "دليفري";
  }
  return money(order.delivery_price);
}

function draftLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
  return [order.customer?.first_name, order.customer?.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || `عميل #${order.customer?.id ?? "-"}`;
}

function orderNumber(order: BackendOrder) {
  return order.order_number || `YM-${order.id}`;
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
  if (!representative) return "";
  return [representative.first_name, representative.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ") || `مندوب #${representative.id}`;
}

function courierFilterName(courier: BackendDashboardUser) {
  return fullNameFromBackendUser(courier) || `مندوب #${courier.id}`;
}

function representativeHref(order: BackendOrder) {
  const representative = order.assigned_representative;
  if (!representative) return "/delivery/couriers";
  return `/delivery/couriers/${representative.id}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function BackendOrdersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [couriers, setCouriers] = useState<BackendDashboardUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BackendOrderStatus>("all");
  const [deliveryType, setDeliveryType] = useState<"all" | "fixed_area" | "manual_quote">("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [courierId, setCourierId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, usersResponse] = await Promise.all([
        apiFetch("orders/admin/"),
        apiFetch("auth/users/"),
      ]);
      const [ordersData, usersData] = await Promise.all([
        apiResponseData(ordersResponse),
        apiResponseData(usersResponse),
      ]);
      if (!ordersResponse.ok) throw new Error(apiError(ordersData, "تعذر تحميل الطلبات."));
      if (!usersResponse.ok) throw new Error(apiError(usersData, "تعذر تحميل المندوبين."));
      setOrders(Array.isArray(ordersData) ? (ordersData as BackendOrder[]) : []);
      setCouriers(
        Array.isArray(usersData)
          ? usersData.filter(isBackendDashboardUser).filter((user) => user.role === "representative")
          : [],
      );
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
      const matchesDeliveryType = deliveryType === "all" || order.delivery_type === deliveryType;
      const isAssigned = Boolean(order.assigned_representative);
      const matchesAssignment =
        assignment === "all" ||
        (assignment === "ready_unassigned" && order.status === "ready" && !isAssigned) ||
        (assignment === "assigned" && isAssigned) ||
        (assignment === "unassigned" && !isAssigned);
      const matchesCourier =
        courierId === "all" || String(order.assigned_representative?.id ?? "") === courierId;
      const matchesQuery =
        !normalized ||
        [
          order.id,
          orderNumber(order),
          customerName(order),
          order.customer?.phone,
          order.market?.name,
          representativeName(order),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesDeliveryType && matchesAssignment && matchesCourier && matchesQuery;
    });
  }, [assignment, courierId, orders, query, status, deliveryType]);

  const readyCount = orders.filter((order) => order.status === "ready" && !order.assigned_representative).length;
  const assignedCount = orders.filter((order) => Boolean(order.assigned_representative)).length;
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
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_190px_170px_190px_220px]">
          <label className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="ps-9"
              placeholder="بحث برقم الطلب أو العميل أو المحل..."
            />
          </label>
          <AppSelect
            value={status}
            onValueChange={(value) => setStatus(value as "all" | BackendOrderStatus)}
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
            value={assignment}
            onValueChange={(value) => setAssignment(value as AssignmentFilter)}
            options={[
              { value: "all", label: "كل الإسنادات" },
              { value: "ready_unassigned", label: "جاهزة للإسناد" },
              { value: "assigned", label: "مسندة لمندوب" },
              { value: "unassigned", label: "غير مسندة" },
            ]}
            ariaLabel="فلترة الإسناد"
            dir="rtl"
            className="h-9"
          />
          <AppSelect
            value={courierId}
            onValueChange={setCourierId}
            options={[
              { value: "all", label: "كل المندوبين" },
              ...couriers.map((courier) => ({
                value: String(courier.id),
                label: courierFilterName(courier),
              })),
            ]}
            ariaLabel="فلترة المندوب"
            dir="rtl"
            className="h-9"
          />
          <AppSelect
            value={deliveryType}
            onValueChange={(value) =>
              setDeliveryType(value as "all" | "fixed_area" | "manual_quote")
            }
            options={[
              { value: "all", label: "كل أنواع التوصيل" },
              { value: "fixed_area", label: "توصيل" },
              { value: "manual_quote", label: "دليفري" },
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-start">رقم الطلب</th>
                  <th className="px-4 py-3 text-start">العميل</th>
                  <th className="px-4 py-3 text-start">المحل</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">المندوب</th>
                  <th className="px-4 py-3 text-start">التوصيل</th>
                  <th className="px-4 py-3 text-start">الإجمالي</th>
                  <th className="px-4 py-3 text-start">التاريخ</th>
                  <th className="px-4 py-3 text-start" />
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order, index) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/25">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span dir="ltr" className="font-semibold text-primary">
                          {index + 1}. {orderNumber(order)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void copyOrderNumberFromList(order);
                          }}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          aria-label={`نسخ رقم الطلب ${orderNumber(order)}`}
                          title="نسخ رقم الطلب"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{customerName(order)}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {order.customer?.phone ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4">{order.market?.name ?? "-"}</td>
                    <td className="px-4 py-4">
                      <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      {order.assigned_representative ? (
                        <Link
                          href={representativeHref(order)}
                          className="font-semibold text-primary hover:underline"
                        >
                          {representativeName(order)}
                        </Link>
                      ) : (
                        <Badge tone={order.status === "ready" ? "blue" : "secondary"}>
                          {order.status === "ready" ? "جاهز للإسناد" : "غير مسند"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={deliveryTypeTone(order)}>{deliveryTypeLabel(order)}</Badge>
                    </td>
                    <td className="px-4 py-4">{money(order.total_price)}</td>
                    <td className="px-4 py-4">{dateTime(order.created_at)}</td>
                    <td className="px-4 py-4 text-end">
                      <Link
                        href={`/orders/view/${order.id}`}
                        className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-semibold hover:bg-accent"
                      >
                        فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export function BackendCreateOrderPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState<BackendDashboardUser[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [addresses, setAddresses] = useState<BackendAddress[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([
    { id: draftLineId(), variantId: "", quantity: "1" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, productsResponse] = await Promise.all([
        apiFetch("auth/users/"),
        apiFetch("catalog/products/"),
      ]);
      const [usersData, productsData] = await Promise.all([
        apiResponseData(usersResponse),
        apiResponseData(productsResponse),
      ]);
      if (!usersResponse.ok) throw new Error(apiError(usersData, "تعذر تحميل العملاء."));
      if (!productsResponse.ok) throw new Error(apiError(productsData, "تعذر تحميل المنتجات."));
      setUsers(
        Array.isArray(usersData)
          ? usersData.filter(isBackendDashboardUser).filter((user) => user.role === "client")
          : [],
      );
      setProducts(Array.isArray(productsData) ? (productsData as BackendProduct[]) : []);
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
    const rows = Array.isArray(data) ? (data as BackendAddress[]) : [];
    setAddresses(rows);
    setSelectedAddress(rows[0]?.id ? String(rows[0].id) : "");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variants = useMemo(() => {
    return products.flatMap((product) =>
      (product.variants ?? []).map((variant) => ({
        id: String(variant.id),
        label: `${product.name} - ${money(variant.price)}${variant.sku ? ` - ${variant.sku}` : ""}`,
        price: Number(variant.price),
        marketId: product.market?.id,
      })),
    );
  }, [products]);

  const subtotal = lines.reduce((sum, line) => {
    const variant = variants.find((item) => item.id === line.variantId);
    return sum + (variant?.price ?? 0) * Math.max(1, Number(line.quantity) || 1);
  }, 0);
  const total = Math.max(0, subtotal + Number(deliveryPrice || 0) - Number(discount || 0));
  const selectedVariants = lines.map((line) => line.variantId).filter(Boolean);
  const hasMixedMarkets =
    new Set(
      lines
        .map((line) => variants.find((variant) => variant.id === line.variantId)?.marketId)
        .filter(Boolean),
    ).size > 1;

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
    if (!selectedUser || !selectedAddress || !selectedVariants.length || hasMixedMarkets) return;
    setSaving(true);
    try {
      const response = await apiFetch("orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(selectedUser),
          delivery_address_id: Number(selectedAddress),
          payment_method: "cash_on_delivery",
          delivery_price: Number(deliveryPrice || 0),
          discount: Number(discount || 0),
          description: description.trim(),
          items: lines
            .filter((line) => line.variantId)
            .map((line) => ({
              variant_id: Number(line.variantId),
              quantity: Math.max(1, Number(line.quantity) || 1),
            })),
        }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر إنشاء الطلب."));
      const order = data as BackendOrder;
      showSnackbar({ message: "تم إنشاء الطلب وربطه بالباك.", tone: "success" });
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
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            الرجوع
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
        <form onSubmit={submitOrder} className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-5">
            <div className="grid gap-4">
              <Field label="العميل">
                <select
                  required
                  value={selectedUser}
                  onChange={(event) => {
                    setSelectedUser(event.target.value);
                    void loadAddresses(event.target.value);
                  }}
                  className="h-10 rounded-md border bg-input px-3 text-sm"
                >
                  <option value="">اختر العميل</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {fullNameFromBackendUser(user)} - {user.phone}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="عنوان التوصيل">
                <select
                  required
                  value={selectedAddress}
                  onChange={(event) => setSelectedAddress(event.target.value)}
                  className="h-10 rounded-md border bg-input px-3 text-sm"
                  disabled={!selectedUser}
                >
                  <option value="">اختر العنوان</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.name ?? `عنوان #${address.id}`}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">منتجات الطلب</div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLines((current) => [
                        ...current,
                        { id: draftLineId(), variantId: "", quantity: "1" },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    إضافة منتج
                  </Button>
                </div>
                {lines.map((line, index) => (
                  <div key={line.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_120px_40px]">
                    <select
                      required
                      value={line.variantId}
                      onChange={(event) => updateLine(line.id, { variantId: event.target.value })}
                      className="h-10 rounded-md border bg-input px-3 text-sm"
                    >
                      <option value="">اختر المنتج</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      required
                      min={1}
                      type="number"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length === 1}
                      onClick={() => removeLine(line.id)}
                      aria-label={`حذف المنتج ${index + 1}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {hasMixedMarkets ? (
                  <p className="text-sm text-destructive">كل منتجات الطلب يجب أن تكون من نفس المحل.</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="رسوم التوصيل">
                  <Input min={0} step="0.01" type="number" value={deliveryPrice} onChange={(event) => setDeliveryPrice(event.target.value)} />
                </Field>
                <Field label="الخصم">
                  <Input min={0} step="0.01" type="number" value={discount} onChange={(event) => setDiscount(event.target.value)} />
                </Field>
              </div>
              <Field label="ملاحظات">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 rounded-md border bg-input px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </Card>

          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <ShoppingCart className="size-4 text-primary" />
              ملخص الطلب
            </div>
            <SummaryRow label="إجمالي المنتجات" value={money(subtotal)} />
            <SummaryRow label="التوصيل" value={money(deliveryPrice)} />
            <SummaryRow label="الخصم" value={money(discount)} />
            <div className="mt-4 border-t pt-4">
              <SummaryRow label="الإجمالي" value={money(total)} strong />
            </div>
            <Button
              className="mt-5 w-full"
              disabled={saving || !selectedUser || !selectedAddress || !selectedVariants.length || hasMixedMarkets}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
              حفظ الطلب
            </Button>
          </Card>
        </form>
      )}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 text-sm", strong && "text-base font-bold")}>
      <span className="text-muted-foreground">{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}

export function BackendOrderDetailPage({ orderId }: { orderId: string }) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`orders/admin/${encodeURIComponent(orderId)}/`);
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل تفاصيل الطلب."));
      const nextOrder = data as BackendOrder;
      setOrder(nextOrder);
      setQuoteDraft(String(nextOrder.delivery_price ?? ""));
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
      const response = await apiFetch(`orders/admin/${order.id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحديث حالة الطلب."));
      setOrder(data as BackendOrder);
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

  async function updateDeliveryQuote() {
    if (!order || !quoteDraft.trim()) return;
    setSavingQuote(true);
    try {
      const response = await apiFetch(`orders/admin/${order.id}/delivery-quote/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_price: Number(quoteDraft || 0) }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تثبيت سعر الدليفري."));
      const nextOrder = data as BackendOrder;
      setOrder(nextOrder);
      setQuoteDraft(String(nextOrder.delivery_price ?? ""));
      showSnackbar({ message: "تم تثبيت سعر الدليفري.", tone: "success" });
    } catch (reason) {
      showSnackbar({
        message: reason instanceof Error ? reason.message : "تعذر تثبيت سعر الدليفري.",
        tone: "danger",
      });
    } finally {
      setSavingQuote(false);
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
            {customerName(order)} - {dateTime(order.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void copyOrderNumber()}>
              <Copy className="size-4" />
              نسخ رقم الطلب
            </Button>
            <Link
              href="/orders"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="size-4" />
              الرجوع
            </Link>
        </div>
      </div>

      <OrderRouteCard order={order} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/25 px-5 py-4 font-semibold">منتجات الطلب</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="w-16 px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">المنتج</th>
                  <th className="px-4 py-3 text-start">السعر</th>
                  <th className="px-4 py-3 text-start">الكمية</th>
                  <th className="px-4 py-3 text-start">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-4 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-4 font-medium">{item.variant?.product?.name ?? "منتج"}</td>
                    <td className="px-4 py-4">{money(item.unit_price)}</td>
                    <td className="px-4 py-4">{item.quantity}</td>
                    <td className="px-4 py-4">{money(Number(item.unit_price) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FinancialSummaryCard order={order} />
        </Card>

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
            <div className="mb-3 font-semibold">بيانات الطلب</div>
            <SummaryRow label="العميل" value={customerName(order)} />
            <SummaryRow label="الهاتف" value={order.customer?.phone ?? "-"} />
            <SummaryRow label="المحل" value={order.market?.name ?? "-"} />
            <SummaryRow label="العنوان" value={order.delivery_address?.name ?? "-"} />
            <SummaryRow label="نوع التوصيل" value={deliveryTypeLabel(order)} />
            {order.custom_delivery_area ? (
              <SummaryRow label="منطقة الدليفري" value={order.custom_delivery_area} />
            ) : null}
          </Card>

          {order.assigned_representative ? <AssignedRepresentativeCard order={order} /> : null}

          {order.delivery_type === "manual_quote" && order.delivery_price_status === "pending_quote" ? (
            <Card className="p-5 text-sm">
              <div className="mb-3 font-semibold">سعر الدليفري</div>
              <div className="grid gap-2">
                <Field label="سعر الدليفري بعد التواصل">
                  <Input
                    min={0}
                    step="0.01"
                    type="number"
                    value={quoteDraft}
                    onChange={(event) => setQuoteDraft(event.target.value)}
                  />
                </Field>
                <Button type="button" disabled={savingQuote || !quoteDraft.trim()} onClick={() => void updateDeliveryQuote()}>
                  {savingQuote ? <Loader2 className="size-4 animate-spin" /> : null}
                  تثبيت السعر
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FinancialSummaryCard({ order }: { order: BackendOrder }) {
  return (
    <div className="m-5 rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-5 text-sm shadow-sm shadow-cyan-950/10">
      <div className="mb-3 font-semibold text-cyan-700 dark:text-cyan-200">ملخص مالي</div>
      <SummaryRow label="المنتجات" value={money(order.subtotal_price)} />
      <SummaryRow label="التوصيل" value={deliveryFeeLabel(order)} />
      <SummaryRow label="الخصم" value={money(order.discount)} />
      <div className="mt-3 border-t border-cyan-400/25 pt-3">
        <SummaryRow label="الإجمالي" value={money(order.total_price)} strong />
      </div>
    </div>
  );
}

function AssignedRepresentativeCard({ order }: { order: BackendOrder }) {
  const representative = order.assigned_representative;
  if (!representative) return null;

  return (
    <Link
      href={representativeHref(order)}
      className="block rounded-[12px] border bg-card p-5 text-sm shadow-sm transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-semibold">المندوب</div>
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Truck className="size-4" />
        </span>
      </div>
      <div className="font-semibold text-primary">{representativeName(order)}</div>
      <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
        {representative.phone ?? `#${representative.id}`}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
        عرض تفاصيل المندوب
        <ExternalLink className="size-3.5" />
      </div>
    </Link>
  );
}

function OrderRouteCard({ order }: { order: BackendOrder }) {
  const activeIndex = orderRouteIndex(order.status);
  const isCancelled = order.status === "cancelled";

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
      {isCancelled ? (
        <div className="flex min-h-24 items-center gap-3 px-5 py-5 text-sm text-destructive">
          <XCircle className="size-5" />
          تم فصل الإلغاء عن مسار الحالات الأساسية لهذا الطلب.
        </div>
      ) : (
        <ol className="grid gap-y-5 px-5 py-6 md:grid-cols-5 md:gap-y-0">
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
