import { LoginPage } from "@/features/auth/login-page";
import {
  emptyLoginDashboardSnapshot,
  type LoginDashboardBranding,
  type LoginDashboardSnapshot,
} from "@/features/dashboard/static-data";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

function isSnapshot(value: unknown): value is Omit<LoginDashboardSnapshot, "branding"> & {
  branding?: Partial<LoginDashboardBranding>;
} {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  const expectedKeys = ["todayOrders", "availableCities", "deliveryZones"];
  return expectedKeys.every((key) => typeof snapshot[key] === "number");
}

function normalizeSnapshot(value: unknown): LoginDashboardSnapshot {
  if (!isSnapshot(value)) return emptyLoginDashboardSnapshot;
  const branding = value.branding ?? {};
  return {
    todayOrders: value.todayOrders,
    availableCities: value.availableCities,
    deliveryZones: value.deliveryZones,
    branding: {
      ...emptyLoginDashboardSnapshot.branding,
      ...(typeof branding.brandName === "string" ? { brandName: branding.brandName } : {}),
      ...(typeof branding.brandTagline === "string" ? { brandTagline: branding.brandTagline } : {}),
      ...(typeof branding.logoUrl === "string" || branding.logoUrl === null ? { logoUrl: branding.logoUrl } : {}),
      ...(branding.fontFamily === "Cairo" || branding.fontFamily === "Tajawal" || branding.fontFamily === "Alexandria" || branding.fontFamily === "System" ? { fontFamily: branding.fontFamily } : {}),
      ...(typeof branding.primaryColor === "string" ? { primaryColor: branding.primaryColor } : {}),
      ...(typeof branding.subtleColor === "string" ? { subtleColor: branding.subtleColor } : {}),
      ...(typeof branding.accentColor === "string" ? { accentColor: branding.accentColor } : {}),
    },
  };
}

async function loadLoginDashboardSnapshot() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/home/login-dashboard-snapshot/`,
      { cache: "no-store" },
    );
    if (!response.ok) return emptyLoginDashboardSnapshot;

    const snapshot: unknown = await response.json();
    return normalizeSnapshot(snapshot);
  } catch {
    return emptyLoginDashboardSnapshot;
  }
}

export default async function LoginRoute() {
  const snapshot = await loadLoginDashboardSnapshot();
  return <LoginPage snapshot={snapshot} />;
}
