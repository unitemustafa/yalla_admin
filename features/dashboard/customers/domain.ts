import type { DashboardUser } from "../users/types";
import {
  canonicalPhoneValue,
  isValidEmail,
  isValidLocalPhone,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  passwordRules,
} from "../users/account-fields";
import { translateApiMessage } from "../users/api-users";
import {
  CustomerCreateError,
  type CustomerDraft,
  type CustomerFieldErrors,
} from "./types";

const customersPageSize = 10;

export function createInitialCustomerDraft(): CustomerDraft {
  return {
    name: "",
    username: "",
    phone: "",
    email: "",
    password: "",
  };
}

export function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? name.trim();
  const lastName = parts.join(" ");

  return {
    first_name: firstName,
    last_name: lastName,
  };
}

export function createCustomerPayload(draft: CustomerDraft) {
  return {
    ...splitFullName(draft.name),
    username: normalizeUsername(draft.username),
    email: normalizeEmail(draft.email),
    phone: canonicalPhoneValue(draft.phone),
    password: draft.password,
    role: "client",
    is_active: true,
    is_staff: false,
    is_superuser: false,
  };
}

function collectApiMessages(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [translateApiMessage(value)];
  }
  if (Array.isArray(value)) return value.flatMap(collectApiMessages);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectApiMessages);
  }
  return [];
}

export function customerCreateErrorFromApi(data: unknown, fallback: string) {
  const fieldErrors: CustomerFieldErrors = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const field of ["username", "email", "phone", "password"] as const) {
      const messages = collectApiMessages(
        (data as Record<string, unknown>)[field],
      );
      if (messages.length) fieldErrors[field] = messages.join(" ");
    }
  }
  const topMessages =
    data && typeof data === "object" && !Array.isArray(data)
      ? collectApiMessages({
          detail: (data as Record<string, unknown>).detail,
          message: (data as Record<string, unknown>).message,
          error: (data as Record<string, unknown>).error,
          non_field_errors: (data as Record<string, unknown>).non_field_errors,
        })
      : collectApiMessages(data);

  return new CustomerCreateError(
    topMessages[0] ?? Object.values(fieldErrors)[0] ?? fallback,
    fieldErrors,
  );
}

export function sanitizeCustomerInput(
  field: keyof CustomerDraft,
  value: string,
) {
  if (field === "phone") return value.replace(/\D/g, "").slice(0, 11);
  if (field === "username" || field === "email") {
    return value.replace(/\s/g, "").trim();
  }
  if (field === "password") return value.replace(/\s/g, "");
  return value;
}

export function validateCustomerDraft(draft: CustomerDraft) {
  const errors: CustomerFieldErrors = {};

  if (!draft.name.trim()) {
    errors.name = "اكتب اسم المستخدم.";
  }
  if (!normalizeUsername(draft.username)) {
    errors.username = "اكتب اسم المستخدم.";
  } else if (!isValidUsername(draft.username)) {
    errors.username =
      "اسم المستخدم يبدأ بحرف ويكون من 3 إلى 150 حرفًا دون مسافات.";
  }
  if (!draft.phone.trim()) {
    errors.phone = "اكتب رقم الهاتف.";
  } else if (!isValidLocalPhone(draft.phone)) {
    errors.phone = "اكتب رقم هاتف صحيحًا.";
  }
  if (!normalizeEmail(draft.email)) {
    errors.email = "اكتب البريد الإلكتروني.";
  } else if (!isValidEmail(draft.email)) {
    errors.email = "اكتب بريدًا إلكترونيًا صحيحًا.";
  }
  if (!draft.password) {
    errors.password = "اكتب كلمة المرور.";
  } else if (passwordRules(draft.password).some((rule) => !rule.done)) {
    errors.password = "كلمة المرور لا تحقق كل الشروط.";
  }

  return errors;
}

export function filterCustomers(
  customers: DashboardUser[],
  customerSearch: string,
) {
  const normalized = customerSearch.trim().toLocaleLowerCase("ar-EG");
  if (!normalized) return customers;

  return customers.filter((customer) =>
    [customer.name, customer.username]
      .join(" ")
      .toLocaleLowerCase("ar-EG")
      .includes(normalized),
  );
}

export function paginateCustomers(
  customers: DashboardUser[],
  currentPage: number,
) {
  const totalPages = Math.max(
    1,
    Math.ceil(customers.length / customersPageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * customersPageSize;

  return {
    totalPages,
    safeCurrentPage,
    pageStartIndex,
    pagedCustomers: customers.slice(
      pageStartIndex,
      pageStartIndex + customersPageSize,
    ),
  };
}
