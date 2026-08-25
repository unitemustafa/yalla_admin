import { deletionResult } from "../admin-api";
import { apiResponseData, firstApiError } from "../users/api-users";
import type { ShippingCompany, ShippingCompanyDraft } from "./types";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

type CompanyResponse = {
  id?: number | string;
  name?: string;
  logo_url?: string | null;
  service_city_ids?: Array<number | string>;
  service_cities?: Array<{ id?: number | string; name?: string | null }>;
  is_active?: boolean;
  archived_at?: string | null;
  deletion_mode?: "delete" | "archive";
};

export function companyFromResponse(value: unknown): ShippingCompany | null {
  if (!value || typeof value !== "object") return null;
  const row = value as CompanyResponse;
  if (row.id === undefined || !row.name?.trim()) return null;
  const cities = Array.isArray(row.service_cities) ? row.service_cities : [];
  const cityIds = Array.isArray(row.service_city_ids)
    ? row.service_city_ids.map(String)
    : cities.flatMap((city) => city.id === undefined ? [] : [String(city.id)]);
  return {
    id: String(row.id),
    name: row.name.trim(),
    logoUrl: row.logo_url?.trim() || null,
    cityIds,
    cityNames: cities.flatMap((city) => city.name?.trim() ? [city.name.trim()] : []),
    status: row.is_active === false ? "inactive" : "active",
    archivedAt: row.archived_at ?? null,
    deletionMode: row.deletion_mode === "archive" ? "archive" : "delete",
  };
}

async function checkedData(response: Response, fallback: string) {
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(firstApiError(data) ?? fallback);
  return data;
}

export async function loadShippingCompanies(apiFetch: ApiFetch, archived = false) {
  const data = await checkedData(
    await apiFetch(`locations/shipping-companies/${archived ? "?archived=true" : ""}`),
    "تعذر تحميل شركات الشحن.",
  );
  if (!Array.isArray(data)) throw new Error("استجابة شركات الشحن غير مكتملة.");
  return data.map(companyFromResponse).filter((row): row is ShippingCompany => Boolean(row));
}

function companyFormData(draft: ShippingCompanyDraft) {
  const form = new FormData();
  form.append("name", draft.name.trim());
  form.append("is_active", String(draft.status === "active"));
  draft.cityIds.forEach((id) => form.append("service_city_ids", id));
  if (draft.logoFile) form.append("logo", draft.logoFile);
  if (draft.removeLogo) form.append("remove_logo", "true");
  return form;
}

export async function saveShippingCompany(
  apiFetch: ApiFetch,
  draft: ShippingCompanyDraft,
  companyId?: string,
) {
  const data = await checkedData(
    await apiFetch(
      companyId
        ? `locations/shipping-companies/${encodeURIComponent(companyId)}/`
        : "locations/shipping-companies/",
      { method: companyId ? "PATCH" : "POST", body: companyFormData(draft) },
    ),
    companyId ? "تعذر تحديث شركة الشحن." : "تعذر إضافة شركة الشحن.",
  );
  const company = companyFromResponse(data);
  if (!company) throw new Error("تم الحفظ لكن استجابة الخادم غير مكتملة.");
  return company;
}

export async function deleteShippingCompany(apiFetch: ApiFetch, companyId: string) {
  const response = await apiFetch(
    `locations/shipping-companies/${encodeURIComponent(companyId)}/`,
    { method: "DELETE" },
  );
  if (response.status === 204) return deletionResult(null);
  return deletionResult(await checkedData(response, "تعذر حذف شركة الشحن."));
}

export async function restoreShippingCompany(apiFetch: ApiFetch, companyId: string) {
  const data = await checkedData(
    await apiFetch(`locations/shipping-companies/${encodeURIComponent(companyId)}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    }),
    "تعذر استعادة شركة الشحن.",
  );
  const company = companyFromResponse(data);
  if (!company) throw new Error("تمت الاستعادة لكن استجابة الخادم غير مكتملة.");
  return company;
}

export async function archiveShippingCompany(apiFetch: ApiFetch, companyId: string) {
  const data = await checkedData(
    await apiFetch(`locations/shipping-companies/${encodeURIComponent(companyId)}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    }),
    "تعذر أرشفة شركة الشحن.",
  );
  const company = companyFromResponse(data);
  if (!company) throw new Error("تمت الأرشفة لكن استجابة الخادم غير مكتملة.");
  return company;
}
