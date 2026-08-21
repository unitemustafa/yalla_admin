import type { CustomerDraft } from "./types";
import {
  apiResponseData,
  dashboardUserFromBackend,
  firstApiError,
  isBackendDashboardUser,
  type BackendDashboardUser,
} from "../users/api-users";
import type { DashboardUser } from "../users/types";
import {
  createCustomerPayload,
  customerCreateErrorFromApi,
} from "./domain";

export type DashboardApiFetch = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchCustomers(apiFetch: DashboardApiFetch) {
  const response = await apiFetch("auth/users/");
  const data = await apiResponseData(response);

  if (!response.ok) {
    throw new Error(
      firstApiError(data) ?? "تعذر تحميل المستخدمين من الباك.",
    );
  }
  if (!Array.isArray(data)) {
    throw new Error("استجابة المستخدمين من الباك غير مكتملة.");
  }

  return data
    .filter(isBackendDashboardUser)
    .filter((user) => user.role === "client")
    .map(dashboardUserFromBackend);
}

export async function createCustomer(
  apiFetch: DashboardApiFetch,
  draft: CustomerDraft,
): Promise<DashboardUser> {
  const response = await apiFetch("auth/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createCustomerPayload(draft)),
  });
  const data = await apiResponseData(response);

  if (!response.ok) {
    throw customerCreateErrorFromApi(data, "تعذر إنشاء المستخدم في الباك.");
  }
  if (!isBackendDashboardUser(data)) {
    throw new Error("تم إنشاء المستخدم لكن استجابة الباك غير مكتملة.");
  }

  return dashboardUserFromBackend(data);
}

export async function updateCustomerActivation(
  apiFetch: DashboardApiFetch,
  userId: string,
  checked: boolean,
): Promise<BackendDashboardUser> {
  const response = await apiFetch(
    `auth/users/${encodeURIComponent(userId)}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: checked }),
    },
  );
  const data = await apiResponseData(response);

  if (!response.ok) {
    throw new Error(firstApiError(data) ?? "تعذر تحديث حالة المستخدم.");
  }
  if (!isBackendDashboardUser(data)) {
    throw new Error("استجابة الباك غير مكتملة.");
  }

  return data;
}

export async function fetchCustomer(
  apiFetch: DashboardApiFetch,
  userId: string,
) {
  const response = await apiFetch(
    `auth/users/${encodeURIComponent(userId)}/`,
  );
  const data = await apiResponseData(response);

  if (!response.ok) {
    throw new Error(
      firstApiError(data) ?? "تعذر تحميل بيانات المستخدم من الباك.",
    );
  }
  if (!isBackendDashboardUser(data)) {
    throw new Error("استجابة بيانات المستخدم من الباك غير مكتملة.");
  }
  if (data.role !== "client") {
    throw new Error("هذا الحساب ليس من عملاء تطبيق يلا ماركت.");
  }

  return data;
}
