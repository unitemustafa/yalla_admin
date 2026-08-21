import { isAbortError, isNetworkError } from "@/lib/auth";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      retryAfterSeconds > 0
        ? `طلبات كتير في وقت قصير. حاول تاني بعد ${retryAfterSeconds} ثانية.`
        : "طلبات كتير في وقت قصير. استنى شوية وحاول تاني.",
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function positiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 0;
}

export function retryAfterSeconds(data: unknown, headerValue: string | null) {
  const payload =
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : null;
  const bodyWait = positiveInteger(payload?.retry_after_seconds);
  const headerWait = positiveInteger(headerValue);
  return bodyWait || headerWait;
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

export function localizedAuthError(value: unknown, fallback: string) {
  const message = firstApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid email or password")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (normalized.includes("not been verified")) {
    return "الحساب غير مفعّل. أكّد البريد الإلكتروني أولًا.";
  }
  if (normalized.includes("required")) {
    return "أكمل البريد الإلكتروني وكلمة المرور.";
  }
  return message;
}

export function shouldKeepLocalSession(error: unknown) {
  return (
    error instanceof RateLimitError ||
    isNetworkError(error) ||
    isAbortError(error)
  );
}
