"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  apiResponseData,
  dashboardUserFromBackend,
  firstApiError,
  isBackendDashboardUser,
  translateApiMessage,
} from "../users/api-users";
import type { DashboardUser } from "../users/default-dashboard-users";
import { DashboardImage } from "../dashboard-image";
import { Badge, Button, Card, Input, PageTitle, Pagination, Switch } from "../primitives";
import { useSnackbar } from "../snackbar";
import {
  availabilityMessage,
  canonicalPhoneValue,
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  passwordRules,
  useAvailabilityCheck,
  type AvailabilityField,
  type AvailabilityState,
} from "../users/account-fields";

type CustomerPageState = "loading" | "error" | "ready";

const customersPageSize = 10;

type CustomerDraft = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
};

type CustomerFieldErrors = Partial<Record<keyof CustomerDraft, string>>;

class CustomerCreateError extends Error {
  fieldErrors: CustomerFieldErrors;

  constructor(message: string, fieldErrors: CustomerFieldErrors = {}) {
    super(message);
    this.name = "CustomerCreateError";
    this.fieldErrors = fieldErrors;
  }
}

function createInitialDraft(): CustomerDraft {
  return {
    name: "",
    username: "",
    phone: "",
    email: "",
    password: "",
  };
}

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? name.trim();
  const lastName = parts.join(" ");

  return {
    first_name: firstName,
    last_name: lastName || "-",
  };
}

function createCustomerPayload(draft: CustomerDraft) {
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

function apiErrorMessage(data: unknown, fallback: string) {
  return firstApiError(data) ?? fallback;
}

function collectApiMessages(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [translateApiMessage(value)];
  if (Array.isArray(value)) return value.flatMap(collectApiMessages);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectApiMessages);
  }
  return [];
}

function customerCreateErrorFromApi(data: unknown, fallback: string) {
  const fieldErrors: CustomerFieldErrors = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const field of ["username", "email", "phone", "password"] as const) {
      const messages = collectApiMessages((data as Record<string, unknown>)[field]);
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

export function CustomersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [customers, setCustomers] = useState<DashboardUser[]>([]);
  const [pageState, setPageState] = useState<CustomerPageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<DashboardUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [activationUserId, setActivationUserId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setPageState("loading");
    setLoadError(null);

    try {
      const response = await apiFetch("auth/users/");
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(data, "تعذر تحميل المستخدمين من الباك."),
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("استجابة المستخدمين من الباك غير مكتملة.");
      }

      const nextCustomers = data
        .filter(isBackendDashboardUser)
        .filter((user) => user.role === "client")
        .map(dashboardUserFromBackend);

      setCustomers(nextCustomers);
      setPageState("ready");
    } catch (error) {
      setCustomers([]);
      setPageState("error");
      setLoadError(
        error instanceof Error
          ? error.message
          : "تعذر تحميل المستخدمين من الباك.",
      );
    }
  }, [apiFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  async function handleCreateCustomer(draft: CustomerDraft) {
    const response = await apiFetch("auth/users/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createCustomerPayload(draft)),
    });
    const data = await apiResponseData(response);

    if (!response.ok) {
      throw customerCreateErrorFromApi(data, "تعذر إنشاء المستخدم في الباك.");
    }

    if (!isBackendDashboardUser(data)) {
      throw new Error("تم إنشاء المستخدم لكن استجابة الباك غير مكتملة.");
    }

    const createdCustomer = dashboardUserFromBackend(data);
    setCustomers((currentCustomers) => [createdCustomer, ...currentCustomers]);
    setAddCustomerOpen(false);
    showSnackbar({
      message: `تم إضافة ${createdCustomer.name} وربطه بالباك.`,
      tone: "success",
    });
  }

  async function handleDeleteCustomer() {
    if (!deleteCustomer || deletingUserId) return;

    const user = deleteCustomer;
    setDeletingUserId(user.id);
    try {
      const response = await apiFetch(`auth/users/${encodeURIComponent(user.id)}/`, {
        method: "DELETE",
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "تعذر حذف المستخدم من الباك."));
      }

      setCustomers((currentCustomers) =>
        currentCustomers.filter((customer) => customer.id !== user.id),
      );
      setDeleteCustomer(null);
      showSnackbar({
        message: `تم حذف ${user.name} من الباك.`,
        tone: "success",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error
            ? error.message
            : "تعذر حذف المستخدم من الباك.",
        tone: "danger",
      });
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleActivationChange(userId: string, checked: boolean) {
    if (activationUserId) return;

    setActivationUserId(userId);
    try {
      const response = await apiFetch(`auth/users/${encodeURIComponent(userId)}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(apiErrorMessage(data, "تعذر تحديث حالة المستخدم."));
      }
      if (!isBackendDashboardUser(data)) {
        throw new Error("استجابة الباك غير مكتملة.");
      }

      const updatedCustomer = dashboardUserFromBackend(data);
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === userId ? updatedCustomer : customer,
        ),
      );
      showSnackbar({
        message: checked ? "تم تفعيل المستخدم." : "تم تعطيل المستخدم.",
        tone: "success",
      });
    } catch (error) {
      showSnackbar({
        message:
          error instanceof Error ? error.message : "تعذر تحديث حالة المستخدم.",
        tone: "danger",
      });
    } finally {
      setActivationUserId(null);
    }
  }

  const isLoading = pageState === "loading";
  const hasError = pageState === "error";
  const hasCustomers = customers.length > 0;

  return (
    <div className="space-y-6 px-6 py-10">
      <PageTitle
        title="المستخدمين"
        description="إدارة عملاء تطبيق يلا ماركت المسجلين في الباك"
        size="compact"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadCustomers()}
              disabled={isLoading}
            >
              <RefreshCcw className="size-4" />
              تحديث
            </Button>
            <Button size="sm" onClick={() => setAddCustomerOpen(true)}>
              <Plus className="size-4" />
              إضافة مستخدم
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="text-2xl font-extrabold">{customers.length}</div>
        <div className="text-xs font-bold text-muted-foreground">
          إجمالي المستخدمين
        </div>
      </Card>

      {hasError ? (
        <CustomerErrorAlert
          message={loadError ?? "تعذر تحميل المستخدمين."}
          onRetry={() => void loadCustomers()}
        />
      ) : null}
      {isLoading ? <CustomersLoadingState /> : null}

      {!isLoading && !hasError && !hasCustomers ? (
        <CustomersEmptyState onAdd={() => setAddCustomerOpen(true)} />
      ) : null}

      {!isLoading && !hasError && hasCustomers ? (
        <CustomersTable
          customers={customers}
          deletingUserId={deletingUserId}
          activationUserId={activationUserId}
          onDelete={setDeleteCustomer}
          onActivationChange={(userId, checked) =>
            void handleActivationChange(userId, checked)
          }
        />
      ) : null}

      {addCustomerOpen ? (
        <AddCustomerDialog
          onClose={() => setAddCustomerOpen(false)}
          onCreate={handleCreateCustomer}
        />
      ) : null}

      {deleteCustomer ? (
        <ConfirmDeleteCustomerDialog
          user={deleteCustomer}
          busy={deletingUserId === deleteCustomer.id}
          onCancel={() => setDeleteCustomer(null)}
          onConfirm={() => void handleDeleteCustomer()}
        />
      ) : null}
    </div>
  );
}

function CustomerErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/10 shadow-none">
      <div
        role="alert"
        className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">
              تعذر تحميل المستخدمين
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="self-start sm:self-center"
        >
          <RefreshCcw className="size-4" />
          إعادة المحاولة
        </Button>
      </div>
    </Card>
  );
}

function ConfirmDeleteCustomerDialog({
  user,
  busy,
  onCancel,
  onConfirm,
}: {
  user: DashboardUser;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 px-4 py-6 backdrop-blur-sm">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">حذف المستخدم</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              هل تريد حذف المستخدم {user.name}؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            إلغاء
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            حذف
          </Button>
        </div>
      </section>
    </div>
  );
}

function CustomersLoadingState() {
  return (
    <Card className="min-h-[360px] overflow-hidden shadow">
      <div className="space-y-4 p-6">
        <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-md bg-muted/60"
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function CustomersEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex min-h-[420px] items-center justify-center bg-card shadow">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center px-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Users className="size-8" />
        </div>
        <h2 className="mt-6 text-xl font-semibold leading-7">
          لا يوجد مستخدمين حتى الآن
        </h2>
        <p className="mt-2 max-w-[430px] text-sm leading-6 text-muted-foreground">
          سيظهر هنا عملاء تطبيق يلا ماركت بعد تسجيلهم في الباك.
        </p>
        <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
          <Button type="button" onClick={onAdd} className="h-10">
            <Plus className="size-4" />
            إضافة أول مستخدم
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AddCustomerDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: CustomerDraft) => Promise<void>;
}) {
  const { apiFetch } = useAuth();
  const [draft, setDraft] = useState<CustomerDraft>(createInitialDraft);
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
  const errors = validateCustomerDraftWithBackendAvailability(draft);
  const availabilityChecksPassed = Object.values(availabilityStates).every(
    (state) => state === "available",
  );
  const canCreate = Object.keys(errors).length === 0 && availabilityChecksPassed;

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
    setDraft((currentDraft) => ({ ...currentDraft, [field]: sanitizeCustomerInput(field, value) }));
    setApiError(null);
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

    if (!canCreate) {
      return;
    }

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
    if (field === "password" && draft.password) {
      return apiFieldErrors.password;
    }
    return submitted ? errors[field] ?? apiFieldErrors[field] : apiFieldErrors[field];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-3 py-6 backdrop-blur-sm sm:px-5">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="border-b bg-muted/20 px-6 py-5">
          <h2 id="add-customer-title" className="text-xl font-semibold leading-7">
            إضافة مستخدم جديد
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            سيتم إنشاء حساب عميل في الباك ليظهر ضمن مستخدمي تطبيق يلا ماركت.
          </p>
        </div>

        <form onSubmit={submitCustomer} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
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

            <CustomerField label="اسم الدخول *" error={errorFor("username")}>
              <Input
                autoComplete="off"
                dir="rtl"
                value={draft.username}
                onChange={(event) => updateDraft("username", event.target.value)}
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

            <CustomerField label="البريد الإلكتروني *" error={errorFor("email")}>
              <Input
                dir="ltr"
                type="email"
                autoComplete="new-password"
                value={draft.email}
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

          <div className="flex shrink-0 justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button type="submit" disabled={saving || !canCreate}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {saving ? "جاري الإنشاء..." : "إنشاء المستخدم"}
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

function sanitizeCustomerInput(field: keyof CustomerDraft, value: string) {
  if (field === "phone") return value.replace(/\D/g, "").slice(0, 11);
  if (field === "username" || field === "email") return value.replace(/\s/g, "").trim();
  return value;
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
  if (!visible || state === "idle" || state === "invalid") {
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
  if (!message) {
    return null;
  }
  const isAvailable = state === "available";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        isAvailable ? "text-emerald-600" : "text-destructive"
      }`}
    >
      {isAvailable ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
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

function validateCustomerDraftWithBackendAvailability(draft: CustomerDraft) {
  const errors: Partial<Record<keyof CustomerDraft, string>> = {};

  if (!draft.name.trim()) {
    errors.name = "اكتب اسم المستخدم.";
  }
  if (!normalizeUsername(draft.username)) {
    errors.username = "اكتب اسم المستخدم.";
  } else if (!isValidUsername(draft.username)) {
    errors.username = "اسم المستخدم يبدأ بحرف ويكون من 3 إلى 150 حرفًا دون مسافات.";
  }
  if (!draft.phone.trim()) {
    errors.phone = "اكتب رقم الهاتف.";
  } else if (!/^01[0125]\d{8}$/.test(draft.phone)) {
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

function CustomersTable({
  customers,
  deletingUserId,
  activationUserId,
  onDelete,
  onActivationChange,
}: {
  customers: DashboardUser[];
  deletingUserId: string | null;
  activationUserId: string | null;
  onDelete: (user: DashboardUser) => void;
  onActivationChange: (userId: string, checked: boolean) => void;
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(customers.length / customersPageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * customersPageSize;
  const pagedCustomers = customers.slice(
    pageStartIndex,
    pageStartIndex + customersPageSize,
  );

  function openUser(customer: DashboardUser) {
    router.push(`/customers/${customer.id}`);
  }

  return (
    <div className="space-y-3">
      {pagedCustomers.map((customer, index) => (
        <Card
          key={customer.id}
          className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_300px_120px] xl:items-center"
        >
          <button
            type="button"
            onClick={() => openUser(customer)}
            className="flex min-w-0 items-center gap-3 rounded-lg text-start transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label={`عرض تفاصيل ${customer.name}`}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {pageStartIndex + index + 1}
            </span>
            <DashboardImage
              src={customer.avatar}
              alt={customer.name}
              width={56}
              height={56}
              className="size-14 shrink-0 overflow-hidden rounded-full"
              imageClassName="object-cover"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-foreground">{customer.name}</h3>
                <Badge tone={customer.active !== false ? "green" : "red"}>
                  {customer.status}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">
                {customer.phone} - {customer.email}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {customer.role}
              </p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold" dir="ltr">@{customer.username}</div>
              <div className="text-xs text-muted-foreground">اسم الدخول</div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <div className="truncate font-bold">{customer.joinedAt}</div>
              <div className="text-xs text-muted-foreground">تاريخ الانضمام</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            <div className="flex items-center gap-2 rounded-md border px-2 py-1">
              <Switch
                checked={customer.active !== false}
                disabled={activationUserId === customer.id}
                onCheckedChange={(checked) => onActivationChange(customer.id, checked)}
              />
              <span className="text-xs font-semibold">
                {customer.active !== false ? "مفعّل" : "معطّل"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openUser(customer)}
              aria-label={`عرض تفاصيل ${customer.name}`}
              title="عرض التفاصيل"
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`حذف ${customer.name}`}
              title="حذف"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deletingUserId === customer.id}
              onClick={() => onDelete(customer)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </Card>
      ))}

      <Card className="overflow-hidden shadow">
        <Pagination
          text={`عرض ${pagedCustomers.length} من ${customers.length} نتيجة`}
          pages={`${safeCurrentPage} / ${totalPages}`}
          previousDisabled={safeCurrentPage === 1}
          nextDisabled={safeCurrentPage === totalPages}
          onPrevious={() =>
            setCurrentPage((page) => Math.max(1, Math.min(page, totalPages) - 1))
          }
          onNext={() =>
            setCurrentPage((page) =>
              Math.min(totalPages, Math.min(page, totalPages) + 1),
            )
          }
        />
      </Card>
    </div>
  );
}
