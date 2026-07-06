import { LoginPage } from "@/features/auth/login-page";
import {
  emptyLoginDashboardSnapshot,
  type LoginDashboardSnapshot,
} from "@/features/dashboard/static-data";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

function isSnapshot(value: unknown): value is LoginDashboardSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  const expectedKeys = ["todayOrders", "availableCities", "deliveryZones"];
  return (
    Object.keys(snapshot).length === expectedKeys.length &&
    expectedKeys.every((key) => typeof snapshot[key] === "number")
  );
}

async function loadLoginDashboardSnapshot() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/home/login-dashboard-snapshot/`,
      { cache: "no-store" },
    );
    if (!response.ok) return emptyLoginDashboardSnapshot;

    const snapshot: unknown = await response.json();
    return isSnapshot(snapshot) ? snapshot : emptyLoginDashboardSnapshot;
  } catch {
    return emptyLoginDashboardSnapshot;
  }
}

export default async function LoginRoute() {
  const snapshot = await loadLoginDashboardSnapshot();
  return <LoginPage snapshot={snapshot} />;
}
