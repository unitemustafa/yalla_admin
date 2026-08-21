import { apiResponseData, firstApiError } from "../users/api-users";
import {
  isPartnerApiRecord,
  partnerApplicationFromApi,
  partnerApplicationsFromApi,
} from "./domain";
import type { PartnerApplication, PartnerStatus } from "./types";

type DashboardApiFetch = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchPartnerApplications(apiFetch: DashboardApiFetch) {
  const response = await apiFetch("partners/admin/applications/");
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(firstApiError(data) ?? "تعذر تحميل طلبات الشركاء.");
  }
  return partnerApplicationsFromApi(data);
}

export async function patchPartnerApplicationStatus(
  apiFetch: DashboardApiFetch,
  application: PartnerApplication,
  nextStatus: PartnerStatus,
) {
  const response = await apiFetch(
    `partners/admin/applications/${encodeURIComponent(application.id)}/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    },
  );
  const data = await apiResponseData(response);
  if (!response.ok) {
    throw new Error(
      firstApiError(data) ??
        `تعذر تحديث حالة الطلب (رمز الخادم ${response.status}).`,
    );
  }
  if (!isPartnerApiRecord(data) && response.status !== 204) {
    throw new Error("تم استلام رد غير مكتمل من الخادم. حاول مرة أخرى.");
  }

  return {
    updated: isPartnerApiRecord(data)
      ? partnerApplicationFromApi(data)
      : { ...application, status: nextStatus },
    shouldRefresh: response.status === 204,
  };
}
