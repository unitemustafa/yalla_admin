import type { DashboardUser } from "./default-dashboard-users";

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
  created_at?: string | null;
  updated_at?: string | null;
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
  return {
    id: String(user.id),
    name: fullNameFromBackendUser(user),
    username: user.username?.trim() || unavailable,
    phone: user.phone?.trim() || unavailable,
    email: user.email?.trim() || unavailable,
    avatar: user.avatar_url?.trim() || defaultAvatar,
    role: roleLabel(user.role),
    branch: unset,
    location: unset,
    joinedAt: formatBackendDate(user.created_at),
    lastLogin: unavailable,
    orders: 0,
    totalSpent: unavailable,
    lastOrder: unavailable,
    status: user.is_active === false ? "غير مفعل" : "نشط",
    notes: "بيانات الحساب قادمة من الباك. إحصائيات الطلبات ستظهر بعد توفير endpoint إداري لها.",
    hasPassword: Boolean(user.has_password),
  };
}

export async function apiResponseData(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

export function firstApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;

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
