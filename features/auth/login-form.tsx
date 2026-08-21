"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
} from "lucide-react";

import type { LoginInput } from "./auth-api";
import {
  type LoginFieldErrors,
  loginSubmissionError,
  stripWhitespace,
  validateLoginCredentials,
} from "./login-validation";

const supportWhatsAppUrl = "https://web.whatsapp.com/send?phone=201016487371";

function preventWhitespaceInput(event: KeyboardEvent<HTMLInputElement>) {
  if (/\s/.test(event.key)) {
    event.preventDefault();
  }
}

function cleanWhitespaceInput(event: FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const nextValue = stripWhitespace(input.value);
  if (input.value !== nextValue) {
    input.value = nextValue;
  }
}

export function LoginForm({
  login,
  onSuccess,
}: {
  login: (input: LoginInput) => Promise<void>;
  onSuccess: () => void;
}) {
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [pending, setPending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  function clearFieldError(field: keyof LoginFieldErrors) {
    if (!fieldErrors[field]) return;
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = stripWhitespace(String(formData.get("email") ?? ""));
    const password = stripWhitespace(String(formData.get("password") ?? ""));
    const nextFieldErrors = validateLoginCredentials(email, password);

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setPending(true);

    try {
      await login({
        email,
        password,
        remember: formData.get("remember") === "on",
      });
    } catch (caughtError) {
      setError(loginSubmissionError(caughtError));
      setPending(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <label className="block text-sm font-bold">
        البريد الإلكتروني
        <span
          className={`mt-2 flex h-12 items-center gap-3 rounded-lg border bg-card px-3 shadow-sm transition focus-within:ring-4 ${
            fieldErrors.email
              ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/15"
              : "border-border focus-within:border-primary focus-within:ring-primary/15"
          }`}
        >
          <Mail className="size-5 text-muted-foreground" />
          <input
            name="email"
            type="email"
            placeholder="البريد الإلكتروني"
            required
            dir="ltr"
            className="h-full min-w-0 flex-1 bg-transparent text-right text-base outline-none placeholder:text-sm placeholder:font-bold placeholder:text-muted-foreground"
            autoComplete="email"
            onKeyDown={preventWhitespaceInput}
            onInput={(event) => {
              cleanWhitespaceInput(event);
              clearFieldError("email");
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </span>
        {fieldErrors.email ? (
          <span
            id="email-error"
            role="alert"
            className="mt-2 block text-sm font-semibold text-red-600 dark:text-red-400"
          >
            {fieldErrors.email}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-bold">
        كلمة المرور
        <span
          className={`mt-2 flex h-12 items-center gap-3 rounded-lg border bg-card px-3 shadow-sm transition focus-within:ring-4 ${
            fieldErrors.password
              ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/15"
              : "border-border focus-within:border-primary focus-within:ring-primary/15"
          }`}
        >
          <LockKeyhole className="size-5 text-muted-foreground" />
          <input
            name="password"
            type={passwordVisible ? "text" : "password"}
            placeholder="كلمة المرور"
            required
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-sm placeholder:font-bold placeholder:text-muted-foreground"
            autoComplete="current-password"
            onKeyDown={preventWhitespaceInput}
            onInput={(event) => {
              cleanWhitespaceInput(event);
              clearFieldError("password");
            }}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
            }
            title={
              passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
            }
          >
            {passwordVisible ? (
              <Eye className="size-5" />
            ) : (
              <EyeOff className="size-5" />
            )}
          </button>
        </span>
        {fieldErrors.password ? (
          <span
            id="password-error"
            role="alert"
            className="mt-2 block text-sm font-semibold text-red-600 dark:text-red-400"
          >
            {fieldErrors.password}
          </span>
        ) : null}
      </label>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2 font-bold">
          <input
            name="remember"
            type="checkbox"
            defaultChecked
            className="size-4 rounded border-border accent-primary"
          />
          افتكرني
        </label>
        <a
          href={supportWhatsAppUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 font-bold text-primary transition hover:text-primary/80"
        >
          <MessageCircle className="size-4" />
          الدعم الفني
        </a>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-base font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "جاري الدخول..." : "دخول"}
      </button>
    </form>
  );
}
