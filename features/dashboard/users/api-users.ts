import type { DashboardUser } from "./default-dashboard-users";
import { resolveMediaUrl } from "@/lib/media-url";
import { displayLocalPhone } from "./account-fields";

export type BackendDashboardUser = {
  id: string | number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  username_changed_at?: string | null;
  role?: string | null;
  has_password?: boolean | null;
  is_active?: boolean | null;
  is_staff?: boolean | null;
  is_superuser?: boolean | null;
  last_login?: string | null;
  date_joined?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  customer_stats?: {
    orders_count?: number | string | null;
    completed_orders_count?: number | string | null;
    total_spent?: string | number | null;
    last_order_at?: string | null;
  } | null;
  recent_orders?: Array<{
    id?: string | number | null;
    number?: string | number | null;
    status?: string | null;
    total?: string | number | null;
    created_at?: string | null;
  }> | null;
  courier_profile?: {
    vehicle_type?: string | null;
    plate_number?: string | null;
    delivery_area?: string | number | null;
    delivery_area_name?: string | null;
    service_city?: string | number | null;
    service_city_name?: string | null;
    max_active_orders?: number | null;
    is_available?: boolean | null;
  } | null;
};

const defaultAvatar = "/default-user-avatar.svg";
const unavailable = "غير متاح";
const unset = "غير محدد";

export function isBackendDashboardUser(value: unknown): value is BackendDashboardUser {
  return Boolean(value && typeof value === "object" && "id" in value);
}

export function fullNameFromBackendUser(user: BackendDashboardUser) {
  const name = [user.first_name, user.last_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return name || user.username?.trim() || user.email?.trim() || `مستخدم #${user.id}`;
}

export function roleLabel(role: string | null | undefined) {
  if (role === "client") return "مستخدم";
  if (role === "admin") return "مدير";
  if (role === "representative") return "مندوب";
  return unset;
}

export function formatBackendDate(value: string | null | undefined) {
  if (!value) return unavailable;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailable;

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function dashboardUserFromBackend(user: BackendDashboardUser): DashboardUser {
  const active = user.is_active !== false;

  return {
    id: String(user.id),
    name: fullNameFromBackendUser(user),
    username: user.username?.trim() || unavailable,
    phone: displayLocalPhone(user.phone),
    email: user.email?.trim() || unavailable,
    avatar: resolveMediaUrl(user.avatar_url?.trim() || defaultAvatar),
    role: roleLabel(user.role),
    branch: unset,
    location: unset,
    joinedAt: formatBackendDate(user.date_joined ?? user.created_at),
    lastLogin: formatBackendDate(user.last_login),
    updatedAt: formatBackendDate(user.updated_at),
    orders: Number(user.customer_stats?.orders_count ?? 0),
    totalSpent:
      user.customer_stats?.total_spent == null
        ? unavailable
        : String(user.customer_stats.total_spent),
    lastOrder: formatBackendDate(user.customer_stats?.last_order_at),
    status: user.is_active === false ? "غير مفعل" : "نشط",
    notes: "بيانات الحساب قادمة من الباك.",
    active,
    hasPassword: Boolean(user.has_password),
  };
}

export async function apiResponseData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export function firstApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return translateApiMessage(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstApiError(item);
      if (message) return message;
    }
  }

  return null;
}

export function translateApiMessage(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[.!؟?]+$/u, "");
  const translations: Record<string, string> = {
    "delivery area cannot be deleted while representatives are using it": "لا يمكن حذف منطقة التوصيل لأنها مستخدمة بواسطة مندوبين.",
    "service city must be active": "يجب أن تكون مدينة الخدمة مفعلة.",
    "reassign active orders before deleting this courier": "أعد إسناد الطلبات النشطة قبل حذف هذا المندوب.",
    "password must contain at least one uppercase letter": "يجب أن تحتوي كلمة المرور على حرف إنجليزي كبير واحد على الأقل.",
    "password must contain at least one lowercase letter": "يجب أن تحتوي كلمة المرور على حرف إنجليزي صغير واحد على الأقل.",
    "password must contain at least one number": "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل.",
    "password must contain at least one special character": "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل.",
    "password must be at least 8 characters": "يجب ألا تقل كلمة المرور عن 8 أحرف.",
    "spaces are not allowed in this field": "لا يسمح بوجود مسافات داخلية في هذا الحقل.",
    "service city is required for couriers": "مدينة التشغيل مطلوبة للمندوب.",
    "upload a valid profile photo: jpg, jpeg, png, or webp": "ارفع صورة شخصية بصيغة JPG أو JPEG أو PNG أو WEBP.",
    "profile photo must be 5 mb or smaller": "يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.",
    "this username is already taken": "اسم الدخول مستخدم بالفعل.",
    "user with this username already exists": "اسم الدخول مستخدم بالفعل.",
    "an account with this username already exists": "اسم الدخول مستخدم بالفعل.",
    "user with this email already exists": "البريد الإلكتروني مسجل بالفعل.",
    "an account with this email already exists": "البريد الإلكتروني مسجل بالفعل.",
    "user with this phone already exists": "رقم الهاتف مسجل بالفعل.",
    "user with this phone number already exists": "رقم الهاتف مسجل بالفعل.",
    "an account with this phone already exists": "رقم الهاتف مسجل بالفعل.",
    "an account with this phone number already exists": "رقم الهاتف مسجل بالفعل.",
    "account is inactive": "الحساب غير نشط حاليًا.",
    "This username is already taken.": "اسم الدخول مستخدم بالفعل.",
    "An account with this email already exists.": "البريد الإلكتروني مسجل بالفعل.",
    "An account with this phone number already exists.": "رقم الهاتف مسجل بالفعل.",
    "Account is inactive.": "الحساب غير نشط حاليًا.",
  };

  return translations[normalized] ?? message.trim();
}
