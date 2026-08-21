import {
  adminApiPaths,
  apiErrorMessage,
  readApiData,
  type ApiFetch,
} from "../admin-api";
import type { DashboardOverview } from "./types";

function isDashboardOverview(value: unknown): value is DashboardOverview {
  return Boolean(value && typeof value === "object");
}

export async function getDashboardOverview(
  apiFetch: ApiFetch,
  from: string,
  to: string,
) {
  const params = new URLSearchParams({ from, to });
  const response = await apiFetch(
    `${adminApiPaths.dashboardOverview}?${params.toString()}`,
    { headers: { "Content-Type": "application/json" } },
  );
  const data = await readApiData(response);
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى"
        : "تعذر تحميل بيانات لوحة التحكم";
    throw new Error(apiErrorMessage(data, fallback));
  }
  if (!isDashboardOverview(data)) {
    throw new Error("تعذر تحميل بيانات لوحة التحكم");
  }
  return data;
}
