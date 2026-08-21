import { neutralDashboardUserName } from "@/features/dashboard/users/types";
import type { AuthUser } from "@/lib/auth";
import type {
  AccountNameParts,
  AvatarValidationResult,
  ResetCodeResponse,
} from "./types";

export const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];

export function accountDisplayName(
  firstName?: string,
  lastName?: string,
  username?: string,
) {
  return (
    [firstName, lastName].filter(Boolean).join(" ") ||
    username ||
    neutralDashboardUserName
  );
}

export function splitAccountDisplayName(value: string): AccountNameParts {
  const parts = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return {
    first_name: parts.shift() ?? "",
    last_name: parts.join(" "),
  };
}

export function accountNamePayload(
  value: string,
  user?: Pick<AuthUser, "first_name" | "last_name" | "username"> | null,
): AccountNameParts {
  const nextName = value.trim().replace(/\s+/g, " ");
  const currentName = accountDisplayName(
    user?.first_name,
    user?.last_name,
    user?.username,
  );

  return nextName === currentName
    ? {
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
      }
    : splitAccountDisplayName(nextName);
}

export function stripAccountWhitespace(value: string) {
  return value.replace(/\s/g, "");
}

export function firstAccountApiError(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstAccountApiError(item);
      if (message) return message;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstAccountApiError(item);
      if (message) return message;
    }
  }
  return null;
}

export function localizedProfileError(value: unknown, fallback: string) {
  const message = firstAccountApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase().replace(/\.$/, "");
  if (
    normalized === "user with this email already exists" ||
    normalized === "an account with this email already exists"
  ) {
    return "البريد الإلكتروني مسجل بالفعل.";
  }
  if (message === "Upload a valid profile photo: JPG, JPEG, PNG, or WEBP.") {
    return "ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.";
  }
  if (message === "Profile photo must be 5 MB or smaller.") {
    return "يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.";
  }
  return message;
}

export function localizedPasswordError(value: unknown, fallback: string) {
  const message = firstAccountApiError(value);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid verification code")) {
    return "كود التحقق غير صحيح.";
  }
  if (normalized.includes("expired")) {
    return "انتهت صلاحية كود التحقق. اطلب كودًا جديدًا.";
  }
  if (normalized.includes("too many invalid attempts")) {
    return "تم تجاوز عدد المحاولات. اطلب كودًا جديدًا.";
  }
  if (normalized.includes("at least 8 characters")) {
    return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  }
  if (normalized.includes("uppercase")) {
    return "أضف حرفًا إنجليزيًا كبيرًا إلى كلمة المرور.";
  }
  if (normalized.includes("number")) return "أضف رقمًا إلى كلمة المرور.";
  if (normalized.includes("special character")) {
    return "أضف رمزًا خاصًا إلى كلمة المرور.";
  }
  if (normalized.includes("spaces are not allowed")) {
    return "المسافات غير مسموحة في كلمة المرور.";
  }
  if (normalized.includes("passwords do not match")) {
    return "تأكيد كلمة المرور غير مطابق.";
  }
  return message;
}

export function validateAccountPassword(
  password: string,
  confirmation: string,
) {
  if (password.length < 8) return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if (/\s/.test(password)) return "المسافات غير مسموحة في كلمة المرور.";
  if (!/[A-Z]/.test(password)) {
    return "أضف حرفًا إنجليزيًا كبيرًا إلى كلمة المرور.";
  }
  if (!/\d/.test(password)) return "أضف رقمًا إلى كلمة المرور.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "أضف رمزًا خاصًا إلى كلمة المرور.";
  }
  if (password !== confirmation) return "تأكيد كلمة المرور غير مطابق.";
  return null;
}

export function validateAccountOtp(otp: string) {
  return /^\d{6}$/.test(otp)
    ? null
    : "أدخل كود التحقق المكون من 6 أرقام.";
}

export function validateAvatarFile(file: {
  type: string;
  size: number;
}): AvatarValidationResult {
  if (!allowedAvatarTypes.includes(file.type)) {
    return {
      valid: false,
      message: "ارفع صورة صالحة بصيغة JPG أو JPEG أو PNG أو WEBP.",
    };
  }
  if (file.size > maxAvatarSize) {
    return {
      valid: false,
      message: "يجب ألا يتجاوز حجم الصورة الشخصية 5 ميجابايت.",
    };
  }
  return { valid: true };
}

export function resetCodeCooldown(data: ResetCodeResponse) {
  return typeof data?.resend_after_seconds === "number"
    ? data.resend_after_seconds
    : typeof data?.retry_after_seconds === "number"
      ? data.retry_after_seconds
      : 30;
}
