"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Truck,
  Upload,
  UserRoundPlus,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import { AppSelect, Badge, Button, Card, Field, Input, PageTitle } from "../primitives";
import { useSnackbar } from "../snackbar";
import { useUndoableDelete } from "../use-undoable-delete";
import {
  apiResponseData,
  firstApiError,
  fullNameFromBackendUser,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";

type DeliveryArea = { id: number; name: string; is_active: boolean };
type AdminOrder = {
  id: number;
  status: string;
  total_price: string;
  customer?: { first_name?: string; last_name?: string; phone?: string };
  delivery_address?: { name?: string } | null;
  assigned_representative?: { id: number } | null;
};
type Draft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
  vehicleType: string;
  plateNumber: string;
  deliveryArea: string;
  maxActiveOrders: string;
};

const emptyDraft: Draft = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  avatarUrl: "",
  vehicleType: "",
  plateNumber: "",
  deliveryArea: "",
  maxActiveOrders: "3",
};

function errorMessage(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
}

function orderCustomerName(order: AdminOrder) {
  return [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || "عميل";
}

function orderLabel(order: AdminOrder) {
  return `#${order.id} - ${orderCustomerName(order)} - ${order.delivery_address?.name ?? "بدون عنوان"} - EGP ${order.total_price}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("ar-EG");
}

function Modal({
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} rounded-xl border bg-background shadow-2xl`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onClose}
            aria-label="إغلاق"
            className="size-9 rounded-full bg-muted/30"
          >
            <X className="size-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function draftFromCourier(user: BackendDashboardUser | null, areas: DeliveryArea[]): Draft {
  if (!user) {
    return { ...emptyDraft, deliveryArea: String(areas[0]?.id ?? "") };
  }

  return {
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    password: "",
    avatarUrl: user.avatar_url ?? "",
    vehicleType: user.courier_profile?.vehicle_type ?? "",
    plateNumber: user.courier_profile?.plate_number ?? "",
    deliveryArea: String(user.courier_profile?.delivery_area ?? areas[0]?.id ?? ""),
    maxActiveOrders: String(user.courier_profile?.max_active_orders ?? 3),
  };
}

function CourierForm({
  areas,
  courier,
  onClose,
  onSaved,
}: {
  areas: DeliveryArea[];
  courier?: BackendDashboardUser | null;
  onClose: () => void;
  onSaved: (user: BackendDashboardUser) => void;
}) {
  const { apiFetch } = useAuth();
  const isEditing = Boolean(courier);
  const [draft, setDraft] = useState<Draft>(() => draftFromCourier(courier ?? null, areas));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const update = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const passwordRules = [
    { label: "8 أحرف", done: draft.password.length >= 8 },
    { label: "حرف كبير", done: /[A-Z]/.test(draft.password) },
    { label: "رقم", done: /\d/.test(draft.password) },
    { label: "رمز خاص", done: /[^A-Za-z0-9]/.test(draft.password) },
  ];

  function uploadAvatar(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update("avatarUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      first_name: draft.firstName.trim(),
      last_name: draft.lastName.trim(),
      username: draft.username.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      avatar_url: draft.avatarUrl.trim() || null,
      role: "representative",
      is_active: true,
      is_staff: false,
      is_superuser: false,
      courier_profile: {
        vehicle_type: draft.vehicleType.trim(),
        plate_number: draft.plateNumber.trim(),
        delivery_area: Number(draft.deliveryArea),
        max_active_orders: Number(draft.maxActiveOrders),
        is_available: true,
      },
    };
    if (draft.password) body.password = draft.password;

    try {
      const response = await apiFetch(
        isEditing ? `auth/users/${courier!.id}/` : "auth/users/",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(errorMessage(data, "تعذر حفظ بيانات المندوب."));
      if (!isBackendDashboardUser(data)) throw new Error("استجابة الباك غير مكتملة.");
      onSaved(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ بيانات المندوب.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? "تعديل مندوب" : "إضافة مندوب"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="الاسم الأول">
          <Input required value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} />
        </Field>
        <Field label="اسم العائلة">
          <Input required value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} />
        </Field>
        <Field label="اسم المستخدم">
          <Input required dir="rtl" value={draft.username} onChange={(e) => update("username", e.target.value)} className="text-right" />
        </Field>
        <Field label="رقم الهاتف">
          <Input required dir="rtl" value={draft.phone} onChange={(e) => update("phone", e.target.value)} className="text-right" />
        </Field>
        <Field label="البريد الإلكتروني">
          <div className="space-y-2">
            <Input
              required
              type="email"
              dir="rtl"
              value={draft.email}
              onChange={(e) => update("email", e.target.value)}
              className="text-right"
            />
            <p className="inline-flex h-6 max-w-full items-center overflow-hidden truncate rounded-md border border-border bg-muted/40 px-2 text-[10px] font-bold leading-none text-muted-foreground">
              يستخدمه المندوب لتسجيل الدخول واستقبال التنبيهات.
            </p>
          </div>
        </Field>
        <Field label={isEditing ? "كلمة المرور الجديدة" : "كلمة المرور"}>
          <div className="space-y-2">
            <div className="relative">
              <Input
                required
                type={showPassword ? "text" : "password"}
                dir="rtl"
                minLength={8}
                value={draft.password}
                onChange={(e) => update("password", e.target.value)}
                className="pe-11 text-right"
              />
              <button
                type="button"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute end-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <div className="flex h-9 items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 text-[10px] leading-none text-muted-foreground">
              {passwordRules.map((rule) => (
                <span
                  key={rule.label}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 font-bold transition ${
                    rule.done
                      ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:text-emerald-200"
                      : "border-border bg-muted/40"
                  }`}
                >
                  <CheckCircle2 className="size-3" />
                  {rule.label}
                </span>
              ))}
            </div>
          </div>
        </Field>
        <Field label="نوع المركبة">
          <Input required value={draft.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} />
        </Field>
        <Field label="رقم اللوحة">
          <Input required value={draft.plateNumber} onChange={(e) => update("plateNumber", e.target.value)} />
        </Field>
        <Field label="منطقة التوصيل">
          <AppSelect
            value={draft.deliveryArea}
            onValueChange={(value) => update("deliveryArea", value)}
            options={areas
              .filter((area) => area.is_active)
              .map((area) => ({ value: String(area.id), label: area.name }))}
            placeholder="اختر منطقة التوصيل"
            className="h-10 bg-input"
            contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
            ariaLabel="منطقة التوصيل"
          />
        </Field>
        <Field label="الحد الأقصى للطلبات">
          <Input required type="number" min={1} value={draft.maxActiveOrders} onChange={(e) => update("maxActiveOrders", e.target.value)} className="h-10" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="صورة المندوب (اختياري)">
            <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <DashboardImage
                src={draft.avatarUrl || "/default-user-avatar.svg"}
                alt="صورة المندوب"
                width={64}
                height={64}
                className="size-16 overflow-hidden rounded-full border border-border bg-background"
                imageClassName="object-cover"
              />
              <div className="grid gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    dir="rtl"
                    value={draft.avatarUrl}
                    onChange={(e) => update("avatarUrl", e.target.value)}
                    placeholder="رابط الصورة أو ارفع صورة من الجهاز"
                    className="h-10 flex-1 text-right"
                  />
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground">
                    <Upload className="size-4" />
                    رفع صورة
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
                  </label>
                </div>
                <p className="text-xs font-medium leading-5 text-muted-foreground">
                  يفضل صورة مربعة وواضحة لوجه المندوب.
                </p>
              </div>
            </div>
          </Field>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        <Button disabled={saving || !draft.deliveryArea} className="sm:col-span-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {isEditing ? "حفظ التعديل" : "إنشاء الحساب"}
        </Button>
      </form>
    </Modal>
  );
}

function PasswordDialog({
  courier,
  busy,
  onClose,
  onConfirm,
}: {
  courier: BackendDashboardUser;
  busy: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  return (
    <Modal title="تغيير كلمة المرور" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4 p-5">
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <div className="text-xs text-muted-foreground">المندوب</div>
          <div className="mt-1 font-bold">{fullNameFromBackendUser(courier)}</div>
        </div>
        <Field label="كلمة المرور الجديدة">
          <div className="relative">
            <Input
              type={visible ? "text" : "password"}
              dir="rtl"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 pe-11 text-right"
            />
            <button
              type="button"
              aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              onClick={() => setVisible((current) => !current)}
              className="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" disabled={busy || password.length < 8} onClick={() => onConfirm(password)}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            حفظ كلمة المرور
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteDialog({
  courier,
  busy,
  onClose,
  onConfirm,
}: {
  courier: BackendDashboardUser;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="حذف مندوب" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-700 dark:text-red-200">
          هل تريد حذف حساب {fullNameFromBackendUser(courier)}؟ لا يمكن التراجع عن هذه العملية.
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="button" variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف الحساب
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CouriersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const queueUndoableDelete = useUndoableDelete();
  const searchParams = useSearchParams();
  const focusedCourier = searchParams.get("courier")?.trim() ?? "";
  const [couriers, setCouriers] = useState<BackendDashboardUser[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourier, setEditingCourier] = useState<BackendDashboardUser | null | undefined>();
  const [assigning, setAssigning] = useState<BackendDashboardUser | null>(null);
  const [passwordCourier, setPasswordCourier] = useState<BackendDashboardUser | null>(null);
  const [deleteCourier, setDeleteCourier] = useState<BackendDashboardUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, areasResponse, ordersResponse] = await Promise.all([
        apiFetch("auth/users/"),
        apiFetch("locations/delivery-areas/"),
        apiFetch("orders/admin/"),
      ]);
      const [usersData, areasData, ordersData] = await Promise.all([
        apiResponseData(usersResponse),
        apiResponseData(areasResponse),
        apiResponseData(ordersResponse),
      ]);
      if (!usersResponse.ok) throw new Error(errorMessage(usersData, "تعذر تحميل المندوبين."));
      if (!areasResponse.ok) throw new Error(errorMessage(areasData, "تعذر تحميل المناطق."));
      if (!ordersResponse.ok) throw new Error(errorMessage(ordersData, "تعذر تحميل الطلبات."));
      setCouriers(Array.isArray(usersData) ? usersData.filter(isBackendDashboardUser).filter((user) => user.role === "representative") : []);
      setAreas(Array.isArray(areasData) ? areasData as DeliveryArea[] : []);
      setOrders(Array.isArray(ordersData) ? ordersData as AdminOrder[] : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات المندوبين.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const readyOrders = useMemo(
    () => orders.filter((order) => order.status === "ready" && !order.assigned_representative),
    [orders],
  );
  const filteredReadyOrders = useMemo(() => {
    const query = normalizeSearch(orderSearch);
    if (!query) return readyOrders;
    return readyOrders.filter((order) => normalizeSearch(orderLabel(order)).includes(query));
  }, [orderSearch, readyOrders]);
  const filteredCouriers = useMemo(() => {
    const areaRows =
      areaFilter === "all"
        ? couriers
        : couriers.filter((courier) => String(courier.courier_profile?.delivery_area ?? "") === areaFilter);
    if (!focusedCourier) return areaRows;
    const focused = normalizeSearch(focusedCourier);
    return areaRows.filter((courier) =>
      [
        courier.id,
        courier.phone,
        courier.email,
        courier.username,
        fullNameFromBackendUser(courier),
      ]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(focused),
    );
  }, [areaFilter, couriers, focusedCourier]);

  async function assign() {
    if (!assigning || !selectedOrder) return;
    setBusy(`assign-${assigning.id}`);
    try {
      const response = await apiFetch(`orders/${selectedOrder}/assignment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representative_id: assigning.id }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(errorMessage(data, "تعذر إسناد الطلب."));
      showSnackbar({ message: `تم إسناد الطلب للمندوب ${fullNameFromBackendUser(assigning)}.`, tone: "success" });
      setAssigning(null);
      setSelectedOrder("");
      setOrderSearch("");
      await load();
    } catch (reason) {
      showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إسناد الطلب.", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  async function confirmPassword(password: string) {
    if (!passwordCourier) return;
    setBusy(`password-${passwordCourier.id}`);
    const response = await apiFetch(`auth/users/${passwordCourier.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await apiResponseData(response);
    showSnackbar({
      message: response.ok ? "تم تغيير كلمة المرور." : errorMessage(data, "تعذر تغيير كلمة المرور."),
      tone: response.ok ? "success" : "danger",
    });
    setBusy(null);
    if (response.ok) setPasswordCourier(null);
  }

  function restoreCourier(courier: BackendDashboardUser, index: number) {
    setCouriers((rows) => {
      if (rows.some((row) => row.id === courier.id)) return rows;
      const nextRows = [...rows];
      nextRows.splice(Math.max(0, index), 0, courier);
      return nextRows;
    });
  }

  function confirmDelete() {
    if (!deleteCourier) return;
    const courier = deleteCourier;
    const courierIndex = couriers.findIndex((row) => row.id === courier.id);
    setBusy(`delete-${courier.id}`);
    queueUndoableDelete({
      message: "تم حذف حساب المندوب.",
      onDelete: () => {
        setCouriers((rows) => rows.filter((row) => row.id !== courier.id));
        setDeleteCourier(null);
      },
      onUndo: () => {
        restoreCourier(courier, courierIndex);
        setBusy(null);
      },
      onCommit: async () => {
        const response = await apiFetch(`auth/users/${courier.id}/`, { method: "DELETE" });
        const data = await apiResponseData(response);
        if (!response.ok) {
          throw new Error(errorMessage(data, "تعذر حذف المندوب."));
        }
      },
      onCommitError: (reason) => {
        showSnackbar({
          message: reason instanceof Error ? reason.message : "تعذر حذف المندوب.",
          tone: "danger",
        });
      },
    });
    setBusy(null);
  }

  function saveCourier(user: BackendDashboardUser) {
    setCouriers((rows) => {
      const exists = rows.some((row) => String(row.id) === String(user.id));
      return exists
        ? rows.map((row) => (String(row.id) === String(user.id) ? user : row))
        : [user, ...rows];
    });
    setEditingCourier(undefined);
    showSnackbar({ message: "تم حفظ بيانات المندوب.", tone: "success" });
  }

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="المندوبين"
        description="حسابات المندوبين وإسناد طلبات Yalla Home"
        size="compact"
        actions={<><Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" />تحديث</Button><Button disabled={!areas.length} onClick={() => setEditingCourier(null)}><Plus className="size-4" />إضافة مندوب</Button></>}
      />

      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold">{filteredCouriers.length}</div>
            <div className="text-xs font-bold text-muted-foreground">
              {focusedCourier
                ? "تفاصيل المندوب المحدد من الطلب"
                : areaFilter === "all"
                  ? `كل المندوبين (${couriers.length})`
                  : "مندوبين حسب المنطقة"}
            </div>
          </div>
          <div className="w-full md:w-72">
            <AppSelect
              value={areaFilter}
              onValueChange={setAreaFilter}
              options={[
                { value: "all", label: "كل المناطق" },
                ...areas.map((area) => ({ value: String(area.id), label: area.name })),
              ]}
              className="h-10 bg-input"
              contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
              ariaLabel="فلتر المنطقة"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>
      ) : error ? (
        <Card className="mt-8 p-6"><div className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{error}</div></Card>
      ) : filteredCouriers.length === 0 ? (
        <Card className="mt-8 overflow-hidden border-dashed bg-card/70">
          <div className="flex min-h-44 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRoundPlus className="size-7" /></span>
            <div>
              <h3 className="text-lg font-bold text-foreground">لا توجد حسابات مندوبين هنا</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">غيّر فلتر المنطقة أو أضف مندوبًا جديدًا.</p>
            </div>
            <Button disabled={!areas.length} onClick={() => setEditingCourier(null)}><Plus className="size-4" />إضافة مندوب</Button>
          </div>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {filteredCouriers.map((courier) => {
            const profile = courier.courier_profile;
            const active = orders.filter((order) => order.status === "ready" && String(order.assigned_representative?.id) === String(courier.id)).length;
            const delivered = orders.filter((order) => order.status === "delivered" && String(order.assigned_representative?.id) === String(courier.id)).length;
            const maxActiveOrders = profile?.max_active_orders ?? 0;
            const isAvailable = courier.is_active !== false && profile?.is_available !== false;
            const isAtCapacity = maxActiveOrders > 0 && active >= maxActiveOrders;
            const canAssign = isAvailable && !isAtCapacity && readyOrders.length > 0 && busy === null;
            const assignmentDisabledReason =
              readyOrders.length === 0
                ? "لا توجد طلبات جاهزة للإسناد"
                : !isAvailable
                  ? "المندوب غير متاح"
                  : isAtCapacity
                    ? "المندوب وصل للحد الأقصى للطلبات النشطة"
                    : undefined;

            return (
              <Card key={courier.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_320px_260px] xl:items-center">
                <Link
                  href={`/delivery/couriers/${courier.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-lg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  aria-label={`عرض تفاصيل ${fullNameFromBackendUser(courier)}`}
                >
                  <DashboardImage src={courier.avatar_url || "/default-user-avatar.svg"} alt={fullNameFromBackendUser(courier)} width={56} height={56} className="size-14 shrink-0 overflow-hidden rounded-full" imageClassName="object-cover" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{fullNameFromBackendUser(courier)}</h3>
                      <Badge tone={courier.is_active === false ? "red" : profile?.is_available === false ? "blue" : "green"}>
                        {courier.is_active === false ? "معطل" : profile?.is_available === false ? "غير متاح" : "متاح"}
                      </Badge>
                      {isAtCapacity ? <Badge tone="red">ممتلئ</Badge> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">{courier.phone} - {courier.email}</p>
                    <p className="mt-1 truncate text-sm"><Truck className="me-1 inline size-4 text-primary" />{profile?.vehicle_type ?? "غير محدد"} - {profile?.plate_number ?? "بلا لوحة"} - {profile?.delivery_area_name ?? "بلا منطقة"}</p>
                  </div>
                </Link>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{active}</div><div className="text-xs text-muted-foreground">نشط</div></div>
                  <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{delivered}</div><div className="text-xs text-muted-foreground">تم التسليم</div></div>
                  <div className="rounded-md bg-muted px-3 py-2"><div className="font-bold">{maxActiveOrders}</div><div className="text-xs text-muted-foreground">السعة</div></div>
                </div>
                <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                  <Link
                    href={`/delivery/couriers/${courier.id}`}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    aria-label={`عرض تفاصيل ${fullNameFromBackendUser(courier)}`}
                    title="عرض التفاصيل"
                  >
                    <Eye className="size-4" />
                  </Link>
                  <Button
                    size="sm"
                    disabled={!canAssign}
                    title={assignmentDisabledReason}
                    onClick={() => setAssigning(courier)}
                  >
                    <Send className="size-4" />إسناد
                  </Button>
                  <Button size="icon" variant="outline" disabled={busy !== null} onClick={() => setEditingCourier(courier)} aria-label="تعديل"><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="outline" disabled={busy !== null} onClick={() => setPasswordCourier(courier)} aria-label="كلمة المرور"><KeyRound className="size-4" /></Button>
                  <Button size="icon" variant="outline" disabled={busy !== null} onClick={() => setDeleteCourier(courier)} aria-label="حذف" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editingCourier !== undefined ? (
        <CourierForm areas={areas} courier={editingCourier} onClose={() => setEditingCourier(undefined)} onSaved={saveCourier} />
      ) : null}
      {passwordCourier ? (
        <PasswordDialog courier={passwordCourier} busy={busy === `password-${passwordCourier.id}`} onClose={() => setPasswordCourier(null)} onConfirm={(password) => void confirmPassword(password)} />
      ) : null}
      {deleteCourier ? (
        <DeleteDialog courier={deleteCourier} busy={busy === `delete-${deleteCourier.id}`} onClose={() => setDeleteCourier(null)} onConfirm={() => void confirmDelete()} />
      ) : null}
      {assigning ? (
        <Modal title={`إسناد طلب إلى ${fullNameFromBackendUser(assigning)}`} onClose={() => { setAssigning(null); setSelectedOrder(""); setOrderSearch(""); }}>
          <div className="space-y-4 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="ابحث برقم الطلب أو اسم العميل أو العنوان..." className="h-10 ps-9" />
            </div>
            <Field label="الطلب الجاهز">
              <AppSelect
                value={selectedOrder}
                onValueChange={setSelectedOrder}
                options={filteredReadyOrders.map((order) => ({ value: String(order.id), label: orderLabel(order) }))}
                placeholder={filteredReadyOrders.length ? "اختر طلبًا" : "لا توجد طلبات مطابقة"}
                className="h-10 bg-input"
                contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
                ariaLabel="الطلب الجاهز"
              />
            </Field>
            <Button className="w-full" disabled={!selectedOrder || busy !== null} onClick={() => void assign()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              تأكيد الإسناد
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
