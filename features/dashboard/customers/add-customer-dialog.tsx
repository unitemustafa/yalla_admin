"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { Button, Input } from "../primitives";
import {
  availabilityMessage,
  useAvailabilityCheck,
  type AvailabilityField,
  type AvailabilityState,
} from "../users/account-fields";
import {
  createInitialCustomerDraft,
  sanitizeCustomerInput,
  validateCustomerDraft,
} from "./domain";
import {
  CustomerCreateError,
  type CustomerDraft,
  type CustomerFieldErrors,
} from "./types";

export function AddCustomerDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: CustomerDraft) => Promise<void>;
}) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState<CustomerDraft>(
    createInitialCustomerDraft,
  );
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiFieldErrors, setApiFieldErrors] = useState<CustomerFieldErrors>({});
  const [focusedAvailabilityField, setFocusedAvailabilityField] =
    useState<AvailabilityField | null>(null);
  const usernameAvailability = useAvailabilityCheck({
    apiFetch,
    field: "username",
    value: draft.username,
  });
  const emailAvailability = useAvailabilityCheck({
    apiFetch,
    field: "email",
    value: draft.email,
  });
  const phoneAvailability = useAvailabilityCheck({
    apiFetch,
    field: "phone",
    value: draft.phone,
  });
  const availabilityStates = {
    username: usernameAvailability.state,
    email: emailAvailability.state,
    phone: phoneAvailability.state,
  } satisfies Record<AvailabilityField, AvailabilityState>;
  const errors = validateCustomerDraft(draft);
  const availabilityChecksPassed = Object.values(availabilityStates).every(
    (state) => state === "available",
  );
  const canCreate =
    Object.keys(errors).length === 0 && availabilityChecksPassed;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  function updateDraft(field: keyof CustomerDraft, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: sanitizeCustomerInput(field, value),
    }));
    setApiError(null);
    setSubmitted(false);
    setApiFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setApiError(null);
    setApiFieldErrors({});

    if (!canCreate) return;

    setSaving(true);
    try {
      await onCreate(draft);
    } catch (error) {
      if (error instanceof CustomerCreateError) {
        setApiFieldErrors(error.fieldErrors);
      }
      setApiError(
        error instanceof Error
          ? error.message
          : "تعذر إنشاء المستخدم في الباك.",
      );
    } finally {
      setSaving(false);
    }
  }

  function errorFor(field: keyof CustomerDraft) {
    if (field === "username" || field === "email" || field === "phone") {
      const state = availabilityStates[field];
      if (
        state === "invalid" ||
        state === "taken" ||
        state === "request_error"
      ) {
        return availabilityMessage(field, state);
      }
    }
    if (field === "password" && draft.password) {
      return apiFieldErrors.password;
    }
    return submitted
      ? (errors[field] ?? apiFieldErrors[field])
      : apiFieldErrors[field];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 px-3 py-6 backdrop-blur-[1px] sm:px-5">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="border-b bg-muted/20 px-6 py-5">
          <h2
            id="add-customer-title"
            className="text-xl font-semibold leading-7"
          >
            إضافة عميل جديد
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            سيتم إنشاء حساب عميل ليظهر ضمن عملاء تطبيق يلا ماركت.
          </p>
        </div>

        <form
          onSubmit={submitCustomer}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6">
            {apiError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {apiError}
              </div>
            ) : null}

            <CustomerField
              label="اسم المستخدم الظاهر *"
              error={errorFor("name")}
            >
              <Input
                autoFocus
                autoComplete="off"
                dir="rtl"
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="مثلا: مصطفى علي"
                disabled={saving}
              />
            </CustomerField>

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerField label="اسم الدخول *" error={errorFor("username")}>
                <Input
                  autoComplete="off"
                  dir="rtl"
                  value={draft.username}
                  onKeyDown={(event) => {
                    if (event.key === " ") event.preventDefault();
                  }}
                  onChange={(event) =>
                    updateDraft("username", event.target.value)
                  }
                  onFocus={() => setFocusedAvailabilityField("username")}
                  onBlur={() => setFocusedAvailabilityField(null)}
                  placeholder="اسم فريد لتسجيل الدخول"
                  className="h-10 text-right"
                  disabled={saving}
                />
                <AvailabilityHint
                  field="username"
                  state={usernameAvailability.state}
                  visible={focusedAvailabilityField === "username"}
                />
              </CustomerField>

              <CustomerField label="رقم الهاتف *" error={errorFor("phone")}>
                <Input
                  dir="ltr"
                  type="tel"
                  autoComplete="off"
                  inputMode="tel"
                  maxLength={11}
                  value={draft.phone}
                  onChange={(event) => updateDraft("phone", event.target.value)}
                  onFocus={() => setFocusedAvailabilityField("phone")}
                  onBlur={() => setFocusedAvailabilityField(null)}
                  placeholder="01xxxxxxxxx"
                  className="h-10 text-right"
                  disabled={saving}
                />
                <AvailabilityHint
                  field="phone"
                  state={phoneAvailability.state}
                  visible={focusedAvailabilityField === "phone"}
                />
              </CustomerField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerField
                label="البريد الإلكتروني *"
                error={errorFor("email")}
              >
                <Input
                  dir="ltr"
                  type="email"
                  autoComplete="new-password"
                  value={draft.email}
                  onKeyDown={(event) => {
                    if (event.key === " ") event.preventDefault();
                  }}
                  onChange={(event) => updateDraft("email", event.target.value)}
                  onFocus={() => setFocusedAvailabilityField("email")}
                  onBlur={() => setFocusedAvailabilityField(null)}
                  placeholder="name@example.com"
                  className="h-10 text-right"
                  disabled={saving}
                />
                <AvailabilityHint
                  field="email"
                  state={emailAvailability.state}
                  visible={focusedAvailabilityField === "email"}
                />
              </CustomerField>

              <CustomerField label="كلمة المرور *" error={errorFor("password")}>
                <div className="relative">
                  <Input
                    dir="rtl"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={draft.password}
                    onChange={(event) =>
                      updateDraft("password", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === " ") event.preventDefault();
                    }}
                    placeholder="8 أحرف على الأقل"
                    className="h-10 pe-10"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute left-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    disabled={saving}
                  >
                    {showPassword ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </button>
                </div>
                <PasswordRequirementMessages password={draft.password} />
              </CustomerField>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={saving || !canCreate}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {saving ? "جاري الإنشاء..." : "إنشاء العميل"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CustomerField({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>
      {label}
      {children}
      {error ? (
        <span className="text-xs font-semibold text-destructive">{error}</span>
      ) : null}
    </label>
  );
}

function AvailabilityHint({
  field,
  state,
  visible,
}: {
  field: AvailabilityField;
  state: AvailabilityState;
  visible: boolean;
}) {
  if (
    !visible ||
    state === "idle" ||
    state === "invalid" ||
    state === "taken" ||
    state === "request_error"
  ) {
    return null;
  }
  if (state === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        جاري التحقق...
      </span>
    );
  }
  const message = availabilityMessage(field, state);
  if (!message) return null;
  const isAvailable = state === "available";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isAvailable ? "text-emerald-600" : "text-destructive"
      }`}
    >
      {isAvailable ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <AlertCircle className="size-3" />
      )}
      {message}
    </span>
  );
}

function PasswordRequirementMessages({ password }: { password: string }) {
  if (!password) return null;

  const missingRequirements = [
    { message: "أدخل 8 أحرف على الأقل", done: password.length >= 8 },
    {
      message: "أدخل حرفاً كبيراً وحرفاً صغيراً",
      done: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      message: "أدخل رقماً ورمزاً خاصاً",
      done: /\d/.test(password) && /[^A-Za-z0-9]/.test(password),
    },
  ].filter((requirement) => !requirement.done);

  if (!missingRequirements.length) return null;

  return (
    <div className="grid gap-1 text-xs font-semibold text-destructive">
      {missingRequirements.map((requirement) => (
        <span key={requirement.message}>{requirement.message}</span>
      ))}
    </div>
  );
}
