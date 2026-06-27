"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, Field, Input, PageTitle } from "../primitives";
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

const statusOptions: BackendOrderStatus[] = [
  "pending",
  "confirmed",
  "under_preparation",
  "ready",
  "cancelled",
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

export function BackendOrdersPage() {
  const { apiFetch } = useAuth();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BackendOrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("orders/admin/");
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل الطلبات."));
      setOrders(Array.isArray(data) ? (data as BackendOrder[]) : []);
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
      const matchesQuery =
        !normalized ||
        [
          order.id,
          orderNumber(order),
          customerName(order),
          order.customer?.phone,
          order.market?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [orders, query, status]);

  const readyCount = orders.filter((order) => order.status === "ready").length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

  return (
    <div className="px-6 py-8">
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

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Metric title="إجمالي الطلبات" value={orders.length} />
        <Metric title="جاهزة للإسناد" value={readyCount} />
        <Metric title="تم التسليم" value={deliveredCount} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="ps-9"
              placeholder="بحث برقم الطلب أو العميل أو السوق..."
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "all" | BackendOrderStatus)}
            className="h-9 rounded-md border bg-input px-3 text-sm"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
                  <th className="px-4 py-3 text-start">السوق</th>
                  <th className="px-4 py-3 text-start">الحالة</th>
                  <th className="px-4 py-3 text-start">الإجمالي</th>
                  <th className="px-4 py-3 text-start">التاريخ</th>
                  <th className="px-4 py-3 text-start" />
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/25">
                    <td className="px-4 py-4 font-semibold" dir="ltr">
                      {orderNumber(order)}
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
    <div className="px-6 py-8">
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
                  <p className="text-sm text-destructive">كل منتجات الطلب يجب أن تكون من نفس السوق.</p>
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
  const [error, setError] = useState<string | null>(null);

  async function loadOrder() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`orders/admin/${encodeURIComponent(orderId)}/`);
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(apiError(data, "تعذر تحميل تفاصيل الطلب."));
      setOrder(data as BackendOrder);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل تفاصيل الطلب.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(nextStatus: BackendOrderStatus) {
    if (!order || order.status === nextStatus) return;
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
    <div className="px-6 py-8">
      <PageTitle
        title={`طلب ${orderNumber(order)}`}
        description={`${customerName(order)} - ${dateTime(order.created_at)}`}
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

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/25 px-5 py-4 font-semibold">منتجات الطلب</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-start">المنتج</th>
                  <th className="px-4 py-3 text-start">السعر</th>
                  <th className="px-4 py-3 text-start">الكمية</th>
                  <th className="px-4 py-3 text-start">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-4 font-medium">{item.variant?.product?.name ?? "منتج"}</td>
                    <td className="px-4 py-4">{money(item.unit_price)}</td>
                    <td className="px-4 py-4">{item.quantity}</td>
                    <td className="px-4 py-4">{money(Number(item.unit_price) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="mb-3 font-semibold">حالة الطلب</div>
            <Badge tone={statusTone(order.status)}>{statusLabels[order.status]}</Badge>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={order.status === option ? "default" : "outline"}
                  disabled={savingStatus}
                  onClick={() => void updateStatus(option)}
                >
                  {statusLabels[option]}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-5 text-sm">
            <div className="mb-3 font-semibold">بيانات الطلب</div>
            <SummaryRow label="العميل" value={customerName(order)} />
            <SummaryRow label="الهاتف" value={order.customer?.phone ?? "-"} />
            <SummaryRow label="السوق" value={order.market?.name ?? "-"} />
            <SummaryRow label="العنوان" value={order.delivery_address?.name ?? "-"} />
            <SummaryRow
              label="المندوب"
              value={
                order.assigned_representative
                  ? [order.assigned_representative.first_name, order.assigned_representative.last_name].filter(Boolean).join(" ")
                  : "لم يتم الإسناد"
              }
            />
          </Card>

          <Card className="p-5 text-sm">
            <div className="mb-3 font-semibold">ملخص مالي</div>
            <SummaryRow label="المنتجات" value={money(order.subtotal_price)} />
            <SummaryRow label="التوصيل" value={money(order.delivery_price)} />
            <SummaryRow label="الخصم" value={money(order.discount)} />
            <div className="mt-3 border-t pt-3">
              <SummaryRow label="الإجمالي" value={money(order.total_price)} strong />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
