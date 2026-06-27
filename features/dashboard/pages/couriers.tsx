"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, KeyRound, Loader2, Plus, RefreshCw, Send, Trash2, Truck, X } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { DashboardImage } from "../dashboard-image";
import { Badge, Button, Card, Field, Input, PageTitle } from "../primitives";
import { useSnackbar } from "../snackbar";
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-8 w-full max-w-2xl rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} aria-label="إغلاق"><X className="size-4" /></Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CourierForm({ areas, onClose, onCreated }: { areas: DeliveryArea[]; onClose: () => void; onCreated: (user: BackendDashboardUser) => void }) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft, deliveryArea: String(areas[0]?.id ?? "") });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch("auth/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: draft.firstName.trim(), last_name: draft.lastName.trim(), username: draft.username.trim(),
          email: draft.email.trim(), phone: draft.phone.trim(), password: draft.password,
          avatar_url: draft.avatarUrl.trim() || null, role: "representative", is_active: true, is_staff: false, is_superuser: false,
          courier_profile: {
            vehicle_type: draft.vehicleType.trim(), plate_number: draft.plateNumber.trim(),
            delivery_area: Number(draft.deliveryArea), max_active_orders: Number(draft.maxActiveOrders), is_available: true,
          },
        }),
      });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(errorMessage(data, "تعذر إنشاء حساب المندوب."));
      if (!isBackendDashboardUser(data)) throw new Error("استجابة الباك غير مكتملة.");
      onCreated(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إنشاء حساب المندوب.");
    } finally { setSaving(false); }
  }

  return (
    <Modal title="إضافة مندوب" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="الاسم الأول"><Input required value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} /></Field>
        <Field label="اسم العائلة"><Input required value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} /></Field>
        <Field label="اسم المستخدم"><Input required dir="ltr" value={draft.username} onChange={(e) => update("username", e.target.value)} /></Field>
        <Field label="رقم الهاتف"><Input required dir="ltr" value={draft.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
        <Field label="البريد الإلكتروني"><Input required type="email" dir="ltr" value={draft.email} onChange={(e) => update("email", e.target.value)} /></Field>
        <Field label="كلمة المرور"><Input required type="password" dir="ltr" minLength={8} value={draft.password} onChange={(e) => update("password", e.target.value)} placeholder="حرف كبير، رقم، ورمز خاص" /></Field>
        <Field label="نوع المركبة"><Input required value={draft.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} /></Field>
        <Field label="رقم اللوحة"><Input required value={draft.plateNumber} onChange={(e) => update("plateNumber", e.target.value)} /></Field>
        <Field label="منطقة التوصيل">
          <select required className="h-10 rounded-md border bg-input px-3" value={draft.deliveryArea} onChange={(e) => update("deliveryArea", e.target.value)}>
            {areas.filter((area) => area.is_active).map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </Field>
        <Field label="الحد الأقصى للطلبات"><Input required type="number" min={1} value={draft.maxActiveOrders} onChange={(e) => update("maxActiveOrders", e.target.value)} /></Field>
        <Field label="رابط الصورة (اختياري)"><Input type="url" dir="ltr" value={draft.avatarUrl} onChange={(e) => update("avatarUrl", e.target.value)} /></Field>
        {error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        <Button disabled={saving || !draft.deliveryArea} className="sm:col-span-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}إنشاء الحساب</Button>
      </form>
    </Modal>
  );
}

export function CouriersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [couriers, setCouriers] = useState<BackendDashboardUser[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<BackendDashboardUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [usersResponse, areasResponse, ordersResponse] = await Promise.all([
        apiFetch("auth/users/"), apiFetch("locations/delivery-areas/"), apiFetch("orders/admin/"),
      ]);
      const [usersData, areasData, ordersData] = await Promise.all([apiResponseData(usersResponse), apiResponseData(areasResponse), apiResponseData(ordersResponse)]);
      if (!usersResponse.ok) throw new Error(errorMessage(usersData, "تعذر تحميل المندوبين."));
      if (!areasResponse.ok) throw new Error(errorMessage(areasData, "تعذر تحميل المناطق."));
      if (!ordersResponse.ok) throw new Error(errorMessage(ordersData, "تعذر تحميل الطلبات."));
      setCouriers(Array.isArray(usersData) ? usersData.filter(isBackendDashboardUser).filter((user) => user.role === "representative") : []);
      setAreas(Array.isArray(areasData) ? areasData as DeliveryArea[] : []);
      setOrders(Array.isArray(ordersData) ? ordersData as AdminOrder[] : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تحميل بيانات المندوبين."); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const readyOrders = useMemo(() => orders.filter((order) => order.status === "ready" && !order.assigned_representative), [orders]);

  async function assign() {
    if (!assigning || !selectedOrder) return;
    setBusy(`assign-${assigning.id}`);
    try {
      const response = await apiFetch(`orders/${selectedOrder}/assignment/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ representative_id: assigning.id }) });
      const data = await apiResponseData(response);
      if (!response.ok) throw new Error(errorMessage(data, "تعذر إسناد الطلب."));
      showSnackbar({ message: `تم إسناد الطلب للمندوب ${fullNameFromBackendUser(assigning)}.`, tone: "success" });
      setAssigning(null); setSelectedOrder(""); await load();
    } catch (reason) { showSnackbar({ message: reason instanceof Error ? reason.message : "تعذر إسناد الطلب.", tone: "danger" }); }
    finally { setBusy(null); }
  }

  async function changePassword(courier: BackendDashboardUser) {
    const password = window.prompt(`كلمة المرور الجديدة لـ ${fullNameFromBackendUser(courier)}`);
    if (!password) return;
    setBusy(`password-${courier.id}`);
    const response = await apiFetch(`auth/users/${courier.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await apiResponseData(response);
    showSnackbar({ message: response.ok ? "تم تغيير كلمة المرور." : errorMessage(data, "تعذر تغيير كلمة المرور."), tone: response.ok ? "success" : "danger" });
    setBusy(null);
  }

  async function remove(courier: BackendDashboardUser) {
    if (!window.confirm(`حذف حساب ${fullNameFromBackendUser(courier)}؟`)) return;
    setBusy(`delete-${courier.id}`);
    const response = await apiFetch(`auth/users/${courier.id}/`, { method: "DELETE" });
    const data = await apiResponseData(response);
    if (response.ok) { setCouriers((rows) => rows.filter((row) => row.id !== courier.id)); showSnackbar({ message: "تم حذف حساب المندوب.", tone: "success" }); }
    else showSnackbar({ message: errorMessage(data, "تعذر حذف المندوب."), tone: "danger" });
    setBusy(null);
  }

  return (
    <div className="px-6 py-8">
      <PageTitle title="المندوبين" description="حسابات المندوبين وإسناد طلبات Yalla Home" size="compact" actions={<><Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" />تحديث</Button><Button disabled={!areas.length} onClick={() => setCreating(true)}><Plus className="size-4" />إضافة مندوب</Button></>} />
      {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : error ? <Card className="mt-8 p-6"><div className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" />{error}</div></Card> : couriers.length === 0 ? <Card className="mt-8 p-10 text-center text-muted-foreground">لا توجد حسابات مندوبين حتى الآن.</Card> : <div className="mt-8 grid gap-4">
        {couriers.map((courier) => { const profile = courier.courier_profile; const active = orders.filter((order) => order.status === "ready" && String(order.assigned_representative?.id) === String(courier.id)).length; return (
          <Card key={courier.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
            <DashboardImage src={courier.avatar_url || "/default-user-avatar.svg"} alt={fullNameFromBackendUser(courier)} width={64} height={64} className="size-16 shrink-0 overflow-hidden rounded-full" imageClassName="object-cover" />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{fullNameFromBackendUser(courier)}</h3><Badge tone={courier.is_active === false ? "red" : profile?.is_available === false ? "blue" : "green"}>{courier.is_active === false ? "معطل" : profile?.is_available === false ? "غير متاح" : "متاح"}</Badge></div><p className="mt-1 text-sm text-muted-foreground" dir="ltr">{courier.phone} · {courier.email}</p><p className="mt-2 text-sm"><Truck className="me-1 inline size-4 text-primary" />{profile?.vehicle_type ?? "غير محدد"} · {profile?.plate_number ?? "بلا لوحة"} · {profile?.delivery_area_name ?? "بلا منطقة"}</p></div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-muted px-4 py-2"><div className="font-bold">{active}</div><div className="text-xs text-muted-foreground">نشط</div></div><div className="rounded-lg bg-muted px-4 py-2"><div className="font-bold">{orders.filter((order) => order.status === "delivered" && String(order.assigned_representative?.id) === String(courier.id)).length}</div><div className="text-xs text-muted-foreground">تم التسليم</div></div><div className="rounded-lg bg-muted px-4 py-2"><div className="font-bold">{profile?.max_active_orders ?? 0}</div><div className="text-xs text-muted-foreground">السعة</div></div></div>
            <div className="flex flex-wrap gap-2"><Button size="sm" disabled={readyOrders.length === 0 || busy !== null} onClick={() => setAssigning(courier)}><Send className="size-4" />إسناد طلب</Button><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void changePassword(courier)}><KeyRound className="size-4" />كلمة المرور</Button><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void remove(courier)}><Trash2 className="size-4" /></Button></div>
          </Card>); })}
      </div>}
      {creating ? <CourierForm areas={areas} onClose={() => setCreating(false)} onCreated={(user) => { setCouriers((rows) => [user, ...rows]); setCreating(false); showSnackbar({ message: "تم إنشاء حساب المندوب وربطه بالباك.", tone: "success" }); }} /> : null}
      {assigning ? <Modal title={`إسناد طلب إلى ${fullNameFromBackendUser(assigning)}`} onClose={() => setAssigning(null)}><div className="space-y-4 p-5"><Field label="الطلب الجاهز"><select className="h-11 w-full rounded-md border bg-input px-3" value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}><option value="">اختر طلبًا</option>{readyOrders.map((order) => <option key={order.id} value={order.id}>#{order.id} — {[order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ")} — {order.delivery_address?.name ?? "بدون عنوان"} — {order.total_price} EGP</option>)}</select></Field><Button className="w-full" disabled={!selectedOrder || busy !== null} onClick={() => void assign()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}تأكيد الإسناد</Button></div></Modal> : null}
    </div>
  );
}
