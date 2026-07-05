"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { DashboardImage } from "../dashboard-image";
import {
  getDeliveryDestination,
  getMarketCount,
  getOrderMarketsSummary,
  getOrderScopeLabel,
  isMultiMarket,
  type DashboardOrderLike,
} from "../order-display";
import { AppSelect, Badge, Button, Card, Field, Input, PageTitle, Pagination } from "../primitives";
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
type AdminOrder = DashboardOrderLike & {
  id: number;
  status: string;
  total_price: string;
  customer?: { first_name?: string; last_name?: string; phone?: string };
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

const couriersPageSize = 10;

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
  maxActiveOrders: "1",
};

function errorMessage(value: unknown, fallback: string) {
  return firstApiError(value) ?? fallback;
}

function orderCustomerName(order: AdminOrder) {
  return [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || "عميل";
}

function orderLabel(order: AdminOrder) {
  const marketCount = getMarketCount(order);
  const marketMode = isMultiMarket(order) ? "متعدد المحلات" : "محل واحد";
  return [
    `#${order.id}`,
    orderCustomerName(order),
    getOrderScopeLabel(order),
    getOrderMarketsSummary(order),
    marketCount ? `${marketCount} محلات` : marketMode,
    getDeliveryDestination(order),
    `EGP ${order.total_price}`,
  ].filter(Boolean).join(" - ");
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
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/60 p-4 backdrop-blur-sm">
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
    maxActiveOrders: String(user.courier_profile?.max_active_orders ?? 1),
  };
}

type CourierFormErrors = Partial<Record<keyof Draft, string>>;

function normalizedPhone(value: string) {
  return value.replace(/\D/g, "");
}

function courierUsernameValid(username: string) {
  return /^[a-zA-Z][a-zA-Z0-9._-]{2,149}$/.test(username.trim());
}

function validateCourierDraft(draft: Draft, isEditing: boolean) {
  const errors: CourierFormErrors = {};
  const email = draft.email.trim().toLowerCase();
  const password = draft.password;

  if (!draft.firstName.trim()) errors.firstName = "اكتب الاسم الأول.";
  if (!draft.lastName.trim()) errors.lastName = "اكتب اسم العائلة.";
  if (!draft.username.trim()) {
    errors.username = "اكتب اسم المستخدم.";
  } else if (!courierUsernameValid(draft.username)) {
    errors.username = "اسم المستخدم يبدأ بحرف ويكون من 3 إلى 150 حرف.";
  }
  if (!draft.phone.trim()) {
    errors.phone = "اكتب رقم الهاتف.";
  } else if (normalizedPhone(draft.phone).length < 10) {
    errors.phone = "رقم الهاتف قصير.";
  }
  if (!email) {
    errors.email = "اكتب البريد الإلكتروني.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "البريد الإلكتروني غير صحيح.";
  }
  if (!isEditing || password) {
    if (!password) {
      errors.password = "اكتب كلمة المرور.";
    } else if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      errors.password = "كلمة المرور 8 أحرف على الأقل وبها حرف كبير ورقم ورمز خاص.";
    }
  }
  if (!draft.vehicleType.trim()) errors.vehicleType = "اكتب نوع المركبة.";
  if (!draft.plateNumber.trim()) errors.plateNumber = "اكتب رقم اللوحة.";
  if (!draft.deliveryArea) errors.deliveryArea = "اختر مدينة التوصيل.";
  if (!Number.isFinite(Number(draft.maxActiveOrders)) || Number(draft.maxActiveOrders) < 1) {
    errors.maxActiveOrders = "اكتب رقمًا صحيحًا أكبر من صفر.";
  }

  return errors;
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
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const errors = useMemo(() => validateCourierDraft(draft, isEditing), [draft, isEditing]);
  const update = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
    setSubmitted(false);
  };
  const errorFor = (key: keyof Draft) => (submitted ? errors[key] : undefined);
  const usernameReady = draft.username.trim().length > 0 && courierUsernameValid(draft.username) && !errorFor("username");
  const passwordRules = [
    { label: "8 أحرف", done: draft.password.length >= 8 },
    { label: "حرف كبير", done: /[A-Z]/.test(draft.password) },
    { label: "رقم ورمز خاص", done: /\d/.test(draft.password) && /[^A-Za-z0-9]/.test(draft.password) },
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
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setError("راجع البيانات المطلوبة ثم حاول مرة أخرى.");
      return;
    }
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
    <main className="min-h-full bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_32rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:flex">
              <UserRoundPlus className="size-6" />
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <ShieldCheck className="size-3.5" />
                حساب مندوب موثّق
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {isEditing ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {isEditing
                  ? "راجع بيانات الحساب والتوصيل، ثم احفظ التغييرات لتحديث ملف المندوب."
                  : "أنشئ حسابًا متكاملًا للمندوب وحدد بيانات مركبته ومنطقة عمله في خطوة واحدة."}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="h-10 self-start rounded-md px-3 lg:self-auto">
            <ChevronRight className="size-4" />
            الرجوع إلى المندوبين
          </Button>
        </header>

        <form onSubmit={submit} noValidate className="grid items-start gap-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="h-full overflow-hidden border-border/70 shadow-xl shadow-black/5">
              <section className="p-5 sm:p-7 lg:p-8">
              <div className="mb-6 flex items-start gap-3 border-b border-border/70 pb-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" /></span>
                <div><h2 className="text-lg font-extrabold">بيانات الحساب</h2><p className="mt-1 text-sm text-muted-foreground">معلومات الهوية وبيانات الدخول الأساسية.</p></div>
              </div>
              <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                <Field label="الاسم الأول"><Input required autoComplete="given-name" placeholder="مثال: أحمد" value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} className="h-12 rounded-xl" /></Field>
                <Field label="اسم العائلة"><Input required autoComplete="family-name" placeholder="مثال: محمد" value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} className="h-12 rounded-xl" /></Field>
                <Field label="اسم المستخدم"><div className="space-y-2"><div className="relative"><IdCard className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoComplete="username" dir="rtl" placeholder="اسم فريد لتسجيل الدخول" value={draft.username} onChange={(e) => update("username", e.target.value)} className="h-12 rounded-xl pe-11 ps-11 text-right" />{usernameReady ? <CheckCircle2 className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-emerald-500" /> : null}</div>{errorFor("username") ? <span className="text-xs font-semibold text-destructive">{errorFor("username")}</span> : null}</div></Field>
                <Field label="رقم الهاتف"><div className="space-y-2"><div className="relative"><Phone className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoComplete="tel" inputMode="tel" dir="rtl" placeholder="01xxxxxxxxx" value={draft.phone} onChange={(e) => update("phone", e.target.value)} className="h-12 rounded-xl pe-11 text-right" /></div>{errorFor("phone") ? <span className="text-xs font-semibold text-destructive">{errorFor("phone")}</span> : null}</div></Field>
                <Field label="البريد الإلكتروني"><div className="relative"><Mail className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input required autoComplete="email" type="email" dir="rtl" placeholder="name@example.com" value={draft.email} onChange={(e) => update("email", e.target.value)} className="h-12 rounded-xl pe-11 text-right" /></div></Field>
                <Field label={isEditing ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}>
                  <div className="space-y-3"><div className="relative"><KeyRound className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input required={!isEditing} autoComplete="new-password" type={showPassword ? "text" : "password"} dir="rtl" minLength={8} placeholder="8 أحرف على الأقل" value={draft.password} onChange={(e) => update("password", e.target.value)} className="h-12 rounded-xl pe-11 ps-12 text-right" /><button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword((visible) => !visible)} className="absolute start-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{showPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">{passwordRules.map((rule) => <span key={rule.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-bold transition ${rule.done ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "border-border bg-muted/30"}`}><CheckCircle2 className="size-3" />{rule.label}</span>)}</div>
                  </div>
                </Field>
              </div>
              </section>
            </Card>

            <Card className="flex h-full flex-col overflow-hidden border-border/70 shadow-lg shadow-black/5">
              <div className="h-36 rounded-t-[12px] bg-gradient-to-l from-primary via-primary/80 to-primary/50" />
              <div className="flex flex-1 flex-col px-5 pb-5">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-start">
                  <div className="relative -mt-12 size-24"><DashboardImage src={draft.avatarUrl || "/default-user-avatar.svg"} alt="صورة المندوب" width={96} height={96} className="size-24 overflow-hidden rounded-2xl border-4 border-card bg-background shadow-lg" imageClassName="object-cover" /><span className="absolute -bottom-1 -start-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-emerald-500 text-white"><CheckCircle2 className="size-3.5" /></span></div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-extrabold">{[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "اسم المندوب"}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{draft.phone || "رقم الهاتف سيظهر هنا"}</p>
                  </div>
                </div>
                <div className="mt-auto rounded-xl border border-dashed bg-muted/20 p-4 text-start"><div className="mb-3 flex items-center gap-2 text-xs font-bold"><Camera className="size-4 text-primary" />صورة المندوب</div><Input type="text" dir="rtl" value={draft.avatarUrl} onChange={(e) => update("avatarUrl", e.target.value)} placeholder="رابط الصورة" className="h-12 rounded-lg text-right text-sm" /><label className="mt-3 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"><Upload className="size-4" />رفع صورة من الجهاز<input type="file" accept="image/*" className="sr-only" onChange={(event) => uploadAvatar(event.target.files?.[0])} /></label></div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden border-border/70 shadow-xl shadow-black/5">
            <section className="border-border/70 bg-muted/15 p-5 sm:p-7 lg:p-8">
              <button
                type="button"
                onClick={() => setDeliveryOpen((open) => !open)}
                className="mb-6 flex w-full items-start justify-between gap-3 border-b border-border/70 pb-5 text-start"
              >
                <span className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Truck className="size-5" /></span>
                  <span><span className="block text-lg font-extrabold">بيانات التوصيل</span><span className="mt-1 block text-sm text-muted-foreground">تفاصيل المركبة ونطاق التشغيل الخاص بالمندوب.</span></span>
                </span>
                <ChevronDown className={cn("mt-2 size-5 text-muted-foreground transition-transform", deliveryOpen && "rotate-180")} />
              </button>
              {deliveryOpen ? (
                <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                  <Field label="نوع المركبة"><Input required placeholder="مثال: دراجة نارية" value={draft.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} className="h-12 rounded-xl" /></Field>
                  <Field label="رقم اللوحة"><Input required placeholder="مثال: أ ب ج 1234" value={draft.plateNumber} onChange={(e) => update("plateNumber", e.target.value)} className="h-12 rounded-xl" /></Field>
                  <Field label="مدينة التوصيل"><AppSelect value={draft.deliveryArea} onValueChange={(value) => update("deliveryArea", value)} options={areas.filter((area) => area.is_active).map((area) => ({ value: String(area.id), label: area.name }))} placeholder="اختر مدينة التوصيل" icon={<MapPin className="size-4" />} className="h-12 rounded-xl bg-input" contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl" ariaLabel="مدينة التوصيل" /></Field>
                  <Field label="الحد الأقصى للطلبات"><Input required min={1} type="number" value={draft.maxActiveOrders} onChange={(e) => update("maxActiveOrders", e.target.value)} className="h-12 rounded-xl" /></Field>
                </div>
              ) : null}
            </section>

            {error ? <div role="alert" className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive sm:px-8"><AlertCircle className="size-4 shrink-0" />{error}</div> : null}
            <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-card px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-9 rounded-md sm:min-w-28">إلغاء</Button>
              <Button disabled={saving} className="h-9 rounded-md px-6 sm:min-w-44">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{isEditing ? "حفظ التعديلات" : "إنشاء حساب المندوب"}</Button>
            </div>
          </Card>
        </form>
      </div>
    </main>
  );
}

export function CourierFormPage({ courierId }: { courierId?: string }) {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [courier, setCourier] = useState<BackendDashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const areasResponse = await apiFetch("locations/delivery-areas/");
        const areasData = await apiResponseData(areasResponse);
        if (!areasResponse.ok) {
          throw new Error(errorMessage(areasData, "تعذر تحميل مناطق التوصيل."));
        }
        setAreas(Array.isArray(areasData) ? areasData as DeliveryArea[] : []);

        if (courierId) {
          const courierResponse = await apiFetch(`auth/users/${encodeURIComponent(courierId)}/`);
          const courierData = await apiResponseData(courierResponse);
          if (!courierResponse.ok) {
            throw new Error(errorMessage(courierData, "تعذر تحميل بيانات المندوب."));
          }
          if (!isBackendDashboardUser(courierData) || courierData.role !== "representative") {
            throw new Error("حساب المندوب غير موجود.");
          }
          setCourier(courierData);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "تعذر تحميل صفحة المندوب.");
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [apiFetch, courierId]);

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center"><Loader2 className="size-7 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Card className="p-6 text-destructive"><AlertCircle className="me-2 inline size-5" />{error}</Card>
      </div>
    );
  }

  return (
    <CourierForm
      areas={areas}
      courier={courierId ? courier : null}
      onClose={() => router.push("/delivery/couriers")}
      onSaved={() => {
        showSnackbar({ message: "تم حفظ بيانات المندوب.", tone: "success" });
        router.push("/delivery/couriers");
      }}
    />
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
              {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
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
  const [assigning, setAssigning] = useState<BackendDashboardUser | null>(null);
  const [passwordCourier, setPasswordCourier] = useState<BackendDashboardUser | null>(null);
  const [deleteCourier, setDeleteCourier] = useState<BackendDashboardUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, areasResponse, ordersResponse] = await Promise.all([
        apiFetch("auth/users/"),
        apiFetch("locations/delivery-areas/"),
        apiFetch("auth/representatives/"),
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
  const totalPages = Math.max(1, Math.ceil(filteredCouriers.length / couriersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * couriersPageSize;
  const pagedCouriers = filteredCouriers.slice(
    pageStartIndex,
    pageStartIndex + couriersPageSize,
  );

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

  return (
    <div className="px-6 py-8">
      <PageTitle
        title="المندوبين"
        description="حسابات المندوبين وإسناد طلبات Yalla Home"
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} className="h-9 px-4 text-sm">
              <RefreshCw className="size-4" />
              تحديث
            </Button>
            <Link href="/delivery/couriers/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              <Plus className="size-4" />
              إضافة مندوب
            </Link>
          </div>
        }
      />

      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold">{filteredCouriers.length}</div>
            <div className="text-xs font-bold text-muted-foreground">
              {focusedCourier
                ? "تفاصيل المندوب المحدد من الطلب"
                : areaFilter === "all"
                  ? "كل المندوبين"
                  : "مندوبين حسب المدينة"}
            </div>
          </div>
          <div className="w-full md:w-72">
            <AppSelect
              value={areaFilter}
              onValueChange={(value) => {
                setAreaFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "كل المدن" },
                ...areas.map((area) => ({ value: String(area.id), label: area.name })),
              ]}
              className="h-10 bg-input"
              contentClassName="rounded-xl border-border/80 bg-popover p-1.5 shadow-2xl"
              ariaLabel="فلتر المدينة"
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
            <Link href="/delivery/couriers/new" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"><Plus className="size-4" />إضافة مندوب</Link>
          </div>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {pagedCouriers.map((courier, index) => {
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
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                    {pageStartIndex + index + 1}
                  </span>
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
                  <Link href={`/delivery/couriers/${courier.id}/edit`} aria-label="تعديل" title="تعديل" className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"><Pencil className="size-4" /></Link>
                  <Button size="icon" variant="outline" disabled={busy !== null} onClick={() => setPasswordCourier(courier)} aria-label="كلمة المرور"><KeyRound className="size-4" /></Button>
                  <Button size="icon" variant="outline" disabled={busy !== null} onClick={() => setDeleteCourier(courier)} aria-label="حذف" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></Button>
                </div>
              </Card>
            );
          })}

          <Card className="mt-2 overflow-hidden shadow">
            <Pagination
              text={`عرض ${pagedCouriers.length} من ${filteredCouriers.length} نتيجة`}
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
          </Card>
        </div>
      )}

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
