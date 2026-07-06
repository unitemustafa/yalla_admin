import { useEffect, useMemo, useRef, useState } from "react";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type AvailabilityState =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "taken"
  | "request_error";

export type AvailabilityField = "username" | "email" | "phone";

export const availabilityMessages: Record<
  AvailabilityField,
  { available: string; taken: string; invalid: string }
> = {
  username: {
    available: "اسم المستخدم متاح.",
    taken: "اسم المستخدم مستخدم بالفعل.",
    invalid: "اسم المستخدم لا يقبل المسافات ويجب أن يبدأ بحرف.",
  },
  email: {
    available: "البريد الإلكتروني متاح.",
    taken: "البريد الإلكتروني مستخدم بالفعل.",
    invalid: "اكتب بريدًا إلكترونيًا صحيحًا.",
  },
  phone: {
    available: "رقم الهاتف متاح.",
    taken: "رقم الهاتف مستخدم بالفعل.",
    invalid: "اكتب رقم هاتف صحيحًا.",
  },
};

export const availabilityRequestError =
  "تعذر التحقق حاليًا، حاول مرة أخرى.";

export function normalizeUsername(value: string) {
  return value.trim();
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function localPhoneValue(value: string | null | undefined) {
  const clean = String(value ?? "").trim();
  if (clean.startsWith("+20")) return `0${clean.slice(3)}`;
  if (clean.startsWith("20")) return `0${clean.slice(2)}`;
  return clean;
}

export function displayLocalPhone(value: string | null | undefined) {
  return localPhoneValue(value) || "غير متاح";
}

export function canonicalPhoneValue(value: string) {
  const digits = digitsOnly(value);
  if (/^01[0125]\d{8}$/.test(digits)) return `+20${digits.slice(1)}`;
  if (/^1[0125]\d{8}$/.test(digits)) return `+20${digits}`;
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[567]\d{8}$/.test(digits)) return `+213${digits.slice(1)}`;
  if (/^[567]\d{8}$/.test(digits)) return `+213${digits}`;
  if (/^213[567]\d{8}$/.test(digits)) return `+${digits}`;
  return value.trim();
}

export function isValidLocalPhone(value: string) {
  return canonicalPhoneValue(value) !== value.trim() || /^\+(20|213)\d+$/.test(value.trim());
}

export function isValidUsername(value: string) {
  const username = normalizeUsername(value);
  return /^[a-zA-Z][a-zA-Z0-9._-]{2,149}$/.test(username) && !/\s/.test(username);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function fieldValue(field: AvailabilityField, value: string) {
  if (field === "username") return normalizeUsername(value);
  if (field === "email") return normalizeEmail(value);
  return canonicalPhoneValue(value);
}

function isValidField(field: AvailabilityField, value: string) {
  if (field === "username") return isValidUsername(value);
  if (field === "email") return isValidEmail(value);
  return isValidLocalPhone(value);
}

export function useAvailabilityCheck({
  apiFetch,
  field,
  value,
  originalValue,
  excludeUserId,
}: {
  apiFetch: ApiFetch;
  field: AvailabilityField;
  value: string;
  originalValue?: string | null;
  excludeUserId?: string | number | null;
}) {
  const [state, setState] = useState<AvailabilityState>("idle");
  const sequence = useRef(0);
  const normalized = useMemo(() => fieldValue(field, value), [field, value]);
  const original = useMemo(
    () => fieldValue(field, originalValue ?? ""),
    [field, originalValue],
  );
  const valid = useMemo(() => isValidField(field, value), [field, value]);

  useEffect(() => {
    sequence.current += 1;
    const requestId = sequence.current;
    const setIfCurrent = (nextState: AvailabilityState) => {
      if (sequence.current === requestId) setState(nextState);
    };

    if (!normalized) {
      const idleTimer = window.setTimeout(() => setIfCurrent("idle"), 0);
      return () => window.clearTimeout(idleTimer);
    }
    if (!valid) {
      const invalidTimer = window.setTimeout(() => setIfCurrent("invalid"), 0);
      return () => window.clearTimeout(invalidTimer);
    }
    if (original && normalized.toLowerCase() === original.toLowerCase()) {
      const availableTimer = window.setTimeout(() => setIfCurrent("available"), 0);
      return () => window.clearTimeout(availableTimer);
    }

    const controller = new AbortController();
    const checkingTimer = window.setTimeout(() => setIfCurrent("checking"), 0);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ [field]: normalized });
      if (excludeUserId !== undefined && excludeUserId !== null) {
        params.set("exclude_user_id", String(excludeUserId));
      }
      apiFetch(`auth/check-${field}/?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => response.json() as Promise<{ available?: boolean }>)
        .then((data) => {
          if (sequence.current !== requestId) return;
          setState(data.available === true ? "available" : "taken");
        })
        .catch(() => {
          if (controller.signal.aborted || sequence.current !== requestId) return;
          setState("request_error");
        });
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(checkingTimer);
      window.clearTimeout(timer);
    };
  }, [apiFetch, excludeUserId, field, normalized, original, valid]);

  return { state, normalized, valid };
}

export function availabilityMessage(
  field: AvailabilityField,
  state: AvailabilityState,
) {
  if (state === "available") return availabilityMessages[field].available;
  if (state === "taken") return availabilityMessages[field].taken;
  if (state === "invalid") return availabilityMessages[field].invalid;
  if (state === "request_error") return availabilityRequestError;
  return "";
}

export function passwordRules(value: string) {
  return [
    { label: "8 أحرف على الأقل", done: value.length >= 8 },
    {
      label: "حرف كبير وحرف صغير",
      done: /[A-Z]/.test(value) && /[a-z]/.test(value),
    },
    {
      label: "رقم ورمز خاص",
      done: /\d/.test(value) && /[^A-Za-z0-9]/.test(value),
    },
  ];
}
