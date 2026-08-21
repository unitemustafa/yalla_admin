import { NETWORK_ERROR_MESSAGE, isNetworkError } from "@/lib/auth";

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export function stripWhitespace(value: string) {
  return value.replace(/\s/g, "");
}

export function validateLoginCredentials(email: string, password: string) {
  const errors: LoginFieldErrors = {};

  if (!email) {
    errors.email = "يرجى إدخال البريد الإلكتروني.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "يرجى إدخال بريد إلكتروني صحيح.";
  }

  if (!password) {
    errors.password = "يرجى إدخال كلمة المرور.";
  }

  return errors;
}

export function loginSubmissionError(error: unknown) {
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
  if (error instanceof Error) return error.message;
  return "تعذر تسجيل الدخول. حاول مرة أخرى.";
}
