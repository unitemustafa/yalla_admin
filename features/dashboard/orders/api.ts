import { apiListData } from "../shared/api-data";
import { firstApiError } from "../users/api-users";
import type { BackendOrder, RepresentativeOption } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function recordValue(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function textFromRecord(record: Record<string, unknown>, paths: string[][]) {
  for (const path of paths) {
    const value = recordValue(record, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function isBackendOrder(value: unknown): value is BackendOrder {
  return isRecord(value) && typeof value.id === "number" && typeof value.status === "string";
}

export function apiOrderData(value: unknown): BackendOrder | null {
  if (Array.isArray(value)) return apiOrderData(value[0]);
  if (!isRecord(value)) return null;
  if ("data" in value) {
    const nested = apiOrderData(value.data);
    if (nested) return nested;
  }
  if ("order" in value) {
    const nested = apiOrderData(value.order);
    if (nested) return nested;
  }
  return isBackendOrder(value) ? value : null;
}

function fieldApiError(record: Record<string, unknown>, field: string) {
  return field in record ? firstApiError(record[field]) : null;
}

export function orderApiError(value: unknown, fallback: string) {
  if (isRecord(value)) {
    if ("payment_method" in value) return "طريقة الدفع مطلوبة";
    if ("requires_region_selection" in value) {
      return fallback.includes("إنشاء")
        ? "حدث تعارض في عقد الباك: إنشاء طلب الأدمن يطلب اختيار منطقة تصفح. يحتاج إصلاح في الباك أو تحديث نسخة السيرفر."
        : "لا يمكن إنشاء الطلب من مسار المعاينة. تحقق أن الصفحة لا تستخدم orders/preview.";
    }
    if ("requires_address_selection" in value) {
      return "اختر عنوان توصيل صالح للعميل";
    }
    for (const field of ["items", "offers", "representative_id"]) {
      const message = fieldApiError(value, field);
      if (message) return message;
    }
  }

  const message = firstApiError(value);
  if (!message) return fallback;
  const normalized = message.toLowerCase();
  if (normalized.includes("only client users can access their orders")) {
    return "تعذر إنشاء الطلب من مسار العميل. العملاء المعروضون هنا عملاء فقط، تأكد أن جلسة لوحة التحكم بصلاحية أدمن ثم أعد المحاولة.";
  }
  const normalizedMessage = normalized.trim().replace(/[.!؟?]+$/u, "");
  if (normalizedMessage === "payment_method") return "طريقة الدفع مطلوبة";
  if (normalizedMessage === "this field is required") return "هذا الحقل مطلوب.";
  if (normalizedMessage === "true" || normalizedMessage === "none") return fallback;
  return message;
}

export function representativeOptionsFromResponse(value: unknown): RepresentativeOption[] {
  const rawList =
    isRecord(value) && Array.isArray(value.representatives)
      ? value.representatives
      : apiListData<unknown>(value);

  return rawList
    .filter(isRecord)
    .map((representative) => {
      const id = textFromRecord(representative, [
        ["representative_id"],
        ["id"],
        ["user_id"],
        ["user", "id"],
      ]);
      const directName = textFromRecord(representative, [
        ["name"],
        ["full_name"],
        ["fullName"],
        ["user", "name"],
      ]);
      const splitName = [
        textFromRecord(representative, [["first_name"], ["user", "first_name"]]),
        textFromRecord(representative, [["last_name"], ["user", "last_name"]]),
      ]
        .filter(Boolean)
        .join(" ");
      const phone = textFromRecord(representative, [["phone"], ["user", "phone"]]);
      return {
        id,
        name: directName || splitName || (id ? `مندوب #${id}` : "مندوب"),
        phone: phone || null,
      };
    })
    .filter((representative) => representative.id);
}
