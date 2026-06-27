"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  apiResponseData,
  dashboardUserFromBackend,
  firstApiError,
  isBackendDashboardUser,
} from "../users/api-users";
import type { DashboardUser } from "../users/default-dashboard-users";
import { DashboardImage } from "../dashboard-image";
import { Button, Card, Input, PageTitle, Pagination } from "../primitives";
import { useSnackbar } from "../snackbar";

type CustomerPageState = "loading" | "error" | "ready";

const customersPageSize = 10;

type CustomerDraft = {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
};

function createInitialDraft(): CustomerDraft {
  return {
    name: "",
    username: "",
    phone: "",
    email: "",
    password: "",
  };
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
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
    username: draft.username.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
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

export function CustomersPage() {
  const { apiFetch } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [customers, setCustomers] = useState<DashboardUser[]>([]);
  const [pageState, setPageState] = useState<CustomerPageState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
      throw new Error(
        apiErrorMessage(data, "تعذر إنشاء المستخدم في الباك."),
      );
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

  async function handleDeleteCustomer(userId: string) {
    const user = customers.find((customer) => customer.id === userId);
    setDeletingUserId(userId);

    try {
      const response = await apiFetch(`auth/users/${encodeURIComponent(userId)}/`, {
        method: "DELETE",
      });
      const data = await apiResponseData(response);

      if (!response.ok) {
        throw new Error(
          apiErrorMessage(data, "تعذر حذف المستخدم من الباك."),
        );
      }

      setCustomers((currentCustomers) =>
        currentCustomers.filter((customer) => customer.id !== userId),
      );
      showSnackbar({
        message: `تم حذف ${user?.name ?? "المستخدم"} من الباك.`,
        tone: "danger",
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
          onDelete={(userId) => void handleDeleteCustomer(userId)}
        />
      ) : null}

      {addCustomerOpen ? (
        <AddCustomerDialog
          customers={customers}
          onClose={() => setAddCustomerOpen(false)}
          onCreate={handleCreateCustomer}
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
  customers,
  onClose,
  onCreate,
}: {
  customers: DashboardUser[];
  onClose: () => void;
  onCreate: (draft: CustomerDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CustomerDraft>(createInitialDraft);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const errors = validateCustomerDraft(draft, customers);
  const canCreate = Object.keys(errors).length === 0;

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
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setApiError(null);
  }

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setApiError(null);

    if (!canCreate) {
      return;
    }

    setSaving(true);
    try {
      await onCreate(draft);
    } catch (error) {
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
    return submitted ? errors[field] : undefined;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 px-4 py-6 backdrop-blur-sm sm:px-6">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
        className="relative w-full max-w-3xl overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
          aria-label="إغلاق"
          disabled={saving}
        >
          <X className="size-4" />
        </button>

        <div className="border-b bg-muted/20 px-6 py-5 pe-14">
          <h2 id="add-customer-title" className="text-xl font-semibold leading-7">
            إضافة مستخدم جديد
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            سيتم إنشاء حساب عميل في الباك ليظهر ضمن مستخدمي تطبيق يلا ماركت.
          </p>
        </div>

        <form onSubmit={submitCustomer}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {apiError ? (
              <div className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {apiError}
              </div>
            ) : null}

            <CustomerField
              label="اسم المستخدم الظاهر *"
              error={errorFor("name")}
              className="sm:col-span-2"
            >
              <Input
                autoFocus
                dir="rtl"
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="مثلا: مصطفى علي"
                disabled={saving}
              />
            </CustomerField>

            <CustomerField label="اسم الدخول *" error={errorFor("username")}>
              <Input
                dir="ltr"
                value={draft.username}
                onChange={(event) => updateDraft("username", event.target.value)}
                placeholder="mustafa.ali"
                disabled={saving}
              />
            </CustomerField>

            <CustomerField label="رقم الهاتف *" error={errorFor("phone")}>
              <Input
                dir="ltr"
                value={draft.phone}
                onChange={(event) => updateDraft("phone", event.target.value)}
                placeholder="+201001234567"
                disabled={saving}
              />
            </CustomerField>

            <CustomerField label="البريد الإلكتروني *" error={errorFor("email")}>
              <Input
                dir="ltr"
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                placeholder="user@example.com"
                disabled={saving}
              />
            </CustomerField>

            <CustomerField label="كلمة المرور *" error={errorFor("password")}>
              <div className="relative">
                <Input
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  value={draft.password}
                  onChange={(event) =>
                    updateDraft("password", event.target.value)
                  }
                  placeholder="StrongPassword123!"
                  className="pe-11"
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
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </CustomerField>
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button type="submit" disabled={saving}>
              <Plus className="size-4" />
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

function validateCustomerDraft(
  draft: CustomerDraft,
  customers: DashboardUser[],
) {
  const errors: Partial<Record<keyof CustomerDraft, string>> = {};
  const email = normalizeComparable(draft.email);
  const username = normalizeComparable(draft.username);
  const phone = normalizePhone(draft.phone);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!draft.name.trim()) {
    errors.name = "اكتب اسم المستخدم.";
  }

  if (!username) {
    errors.username = "اكتب اسم الدخول.";
  } else if (!/^[a-zA-Z][a-zA-Z0-9._-]{2,149}$/.test(draft.username.trim())) {
    errors.username = "اسم الدخول يبدأ بحرف ويكون من 3 إلى 150 حرف.";
  } else if (
    customers.some((customer) => normalizeComparable(customer.username) === username)
  ) {
    errors.username = "اسم الدخول مستخدم بالفعل.";
  }

  if (!draft.phone.trim()) {
    errors.phone = "اكتب رقم الهاتف.";
  } else if (phone.length < 10) {
    errors.phone = "رقم الهاتف قصير.";
  } else if (
    customers.some((customer) => normalizePhone(customer.phone) === phone)
  ) {
    errors.phone = "رقم الهاتف مسجل بالفعل.";
  }

  if (!email) {
    errors.email = "اكتب البريد الإلكتروني.";
  } else if (!emailRegex.test(email)) {
    errors.email = "البريد الإلكتروني غير صحيح.";
  } else if (
    customers.some((customer) => normalizeComparable(customer.email) === email)
  ) {
    errors.email = "البريد الإلكتروني مسجل بالفعل.";
  }

  if (!draft.password) {
    errors.password = "اكتب كلمة المرور.";
  } else if (
    draft.password.length < 8 ||
    !/[A-Z]/.test(draft.password) ||
    !/\d/.test(draft.password) ||
    !/[^A-Za-z0-9]/.test(draft.password)
  ) {
    errors.password =
      "كلمة المرور 8 أحرف على الأقل وبها حرف كبير ورقم ورمز خاص.";
  }

  return errors;
}

function CustomersTable({
  customers,
  deletingUserId,
  onDelete,
}: {
  customers: DashboardUser[];
  deletingUserId: string | null;
  onDelete: (userId: string) => void;
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
    <Card className="overflow-hidden shadow">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] caption-bottom text-sm">
          <colgroup>
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-[28%]" />
            <col className="w-[24%]" />
            <col className="w-[28%]" />
            <col className="w-24" />
          </colgroup>
          <thead>
            <tr className="h-10 border-b transition-colors hover:bg-muted/50">
              {[
                "#",
                "الصورة",
                "اسم المستخدم",
                "رقم الهاتف",
                "البريد الإلكتروني",
                "",
              ].map((header) => (
                <th
                  key={header || "actions"}
                  className="h-10 px-4 text-center align-middle text-xs font-medium text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                role="button"
                tabIndex={0}
                onClick={() => openUser(customer)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openUser(customer);
                  }
                }}
                className="h-[68px] cursor-pointer border-b transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <td className="px-4 text-center align-middle font-medium text-muted-foreground">
                  {pageStartIndex + index + 1}
                </td>
                <td className="px-4 align-middle">
                  <DashboardImage
                    src={customer.avatar}
                    alt={customer.name}
                    width={40}
                    height={40}
                    className="mx-auto size-10 rounded-full border"
                  />
                </td>
                <td className="px-4 text-center align-middle">
                  <div className="font-medium text-foreground">
                    {customer.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {customer.role} · {customer.status}
                  </div>
                </td>
                <td className="px-4 text-center align-middle">
                  <span dir="ltr" className="inline-block font-medium">
                    {customer.phone}
                  </span>
                </td>
                <td className="px-4 text-center align-middle">
                  <span dir="ltr" className="inline-block font-medium">
                    {customer.email}
                  </span>
                </td>
                <td className="px-4 text-center align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`حذف ${customer.name}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingUserId === customer.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(customer.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  );
}
