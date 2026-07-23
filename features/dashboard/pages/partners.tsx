"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CircleAlert,
  Clock3,
  Eye,
  Handshake,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Store,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { apiResponseData, firstApiError } from "../users/api-users";
import {
  AppSelect,
  Badge,
  Button,
  Card,
  Input,
  PageTitle,
} from "../primitives";
import { useSnackbar } from "../snackbar";

type PartnerStatus = "pending" | "in_review" | "approved" | "rejected";
type PartnerFilter = "all" | PartnerStatus;

type PartnerApplication = {
  id: string;
  applicantName: string;
  applicantUsername: string;
  businessName: string;
  contactName: string;
  businessType: string;
  branchesCount: number;
  applicantRole: string;
  hasTradeLicense: boolean;
  email: string;
  mobileNumber: string;
  landline: string;
  whatsappOptIn: boolean;
  notes: string;
  status: PartnerStatus;
  adminNotes: string;
  reviewedByName: string;
  reviewedAt: string;
  createdAt: string;
};

type ApiRecord = Record<string, unknown>;

const statusOptions = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_review", label: "قيد المراجعة" },
  { value: "approved", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
];

const filterOptions = [
  { value: "all", label: "كل الحالات" },
  ...statusOptions,
];

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes"].includes(textValue(value).toLowerCase());
}

function statusValue(value: unknown): PartnerStatus {
  const normalized = textValue(value);
  if (
    normalized === "pending" ||
    normalized === "in_review" ||
    normalized === "approved" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return "pending";
}

function applicationFromApi(record: ApiRecord): PartnerApplication {
  return {
    id: textValue(record.id),
    applicantName: textValue(record.applicant_name, "-"),
    applicantUsername: textValue(record.applicant_username),
    businessName: textValue(record.business_name, "-"),
    contactName: [
      textValue(record.contact_first_name),
      textValue(record.contact_last_name),
    ]
      .filter(Boolean)
      .join(" "),
    businessType: textValue(record.business_type),
    branchesCount: numberValue(record.branches_count, 1),
    applicantRole: textValue(record.applicant_role),
    hasTradeLicense: booleanValue(record.has_trade_license),
    email: textValue(record.email, "-"),
    mobileNumber: textValue(record.mobile_number, "-"),
    landline: textValue(record.landline),
    whatsappOptIn: booleanValue(record.whatsapp_opt_in),
    notes: textValue(record.notes),
    status: statusValue(record.status),
    adminNotes: textValue(record.admin_notes),
    reviewedByName: textValue(record.reviewed_by_name),
    reviewedAt: textValue(record.reviewed_at),
    createdAt: textValue(record.created_at),
  };
}

function listFromApi(value: unknown) {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.results)
      ? value.results
      : [];
  return rows.filter(isRecord).map(applicationFromApi);
}

function statusLabel(status: PartnerStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.label ??
    "قيد الانتظار"
  );
}

function statusTone(
  status: PartnerStatus,
): "blue" | "green" | "red" | "secondary" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "pending") return "blue";
  return "secondary";
}

function businessTypeLabel(value: string) {
  const labels: Record<string, string> = {
    shop: "متجر",
    restaurant: "مطعم",
    service_provider: "مقدم خدمات",
  };
  return labels[value] ?? value;
}

function applicantRoleLabel(value: string) {
  const labels: Record<string, string> = {
    owner_partner: "مالك / شريك",
    manager_legal_representative: "مدير / ممثل قانوني",
  };
  return labels[value] ?? value;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function PartnersPage() {
  const { apiFetch, status: authStatus, user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PartnerFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<PartnerApplication | null>(null);
  const shouldLoad = authStatus === "authenticated" && user?.role === "admin";

  const loadApplications = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!shouldLoad) return;
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const response = await apiFetch("partners/admin/applications/");
        const data = await apiResponseData(response);
        if (!response.ok) {
          throw new Error(
            firstApiError(data) ?? "تعذر تحميل طلبات الشركاء.",
          );
        }
        setApplications(listFromApi(data));
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "تعذر تحميل طلبات الشركاء.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, shouldLoad],
  );

  useEffect(() => {
    if (!shouldLoad) return;
    const timer = window.setTimeout(() => void loadApplications(), 0);
    return () => window.clearTimeout(timer);
  }, [loadApplications, shouldLoad]);

  const filteredApplications = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("ar-EG");
    return applications.filter((application) => {
      if (filter !== "all" && application.status !== filter) return false;
      if (!normalized) return true;
      return [
        application.businessName,
        application.contactName,
        application.email,
        application.mobileNumber,
        application.applicantUsername,
      ]
        .join(" ")
        .toLocaleLowerCase("ar-EG")
        .includes(normalized);
    });
  }, [applications, filter, search]);

  const counts = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((item) => item.status === "pending").length,
      inReview: applications.filter((item) => item.status === "in_review")
        .length,
      approved: applications.filter((item) => item.status === "approved")
        .length,
    }),
    [applications],
  );

  async function updateStatus(
    application: PartnerApplication,
    nextStatus: PartnerStatus,
  ) {
    if (updatingId || application.status === nextStatus) return;
    setUpdatingId(application.id);
    try {
      const response = await apiFetch(
        `partners/admin/applications/${encodeURIComponent(application.id)}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const data = await apiResponseData(response);
      if (!response.ok || !isRecord(data)) {
        throw new Error(firstApiError(data) ?? "تعذر تحديث حالة الطلب.");
      }
      const updated = applicationFromApi(data);
      setApplications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedApplication((current) =>
        current?.id === updated.id ? updated : current,
      );
      showSnackbar({
        message: `تم تحديث طلب ${updated.businessName} إلى «${statusLabel(updated.status)}».`,
        tone: updated.status === "rejected" ? "danger" : "success",
      });
    } catch (reason) {
      showSnackbar({
        message:
          reason instanceof Error ? reason.message : "تعذر تحديث حالة الطلب.",
        tone: "danger",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 px-6 py-10">
      <PageTitle
        title="الشركاء"
        description="مراجعة طلبات التسجيل كشريك ومتابعة حالتها"
        size="compact"
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-9 px-4 text-sm"
            onClick={() => void loadApplications({ quiet: true })}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            تحديث
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="إجمالي الطلبات"
          value={counts.total}
          icon={Handshake}
          tone="primary"
        />
        <SummaryCard
          label="طلبات جديدة"
          value={counts.pending}
          icon={Clock3}
          tone="blue"
        />
        <SummaryCard
          label="قيد المراجعة"
          value={counts.inReview}
          icon={CircleAlert}
          tone="amber"
        />
        <SummaryCard
          label="طلبات مقبولة"
          value={counts.approved}
          icon={BadgeCheck}
          tone="green"
        />
      </div>

      <Card className="border-border/70 bg-muted/20 p-4 shadow-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم النشاط أو المسؤول أو رقم الهاتف..."
              className="h-11 bg-background/60 pr-11 text-right"
            />
          </div>
          <AppSelect
            value={filter}
            onValueChange={(value) => setFilter(value as PartnerFilter)}
            options={filterOptions}
            ariaLabel="تصفية طلبات الشركاء"
            className="h-11 md:w-52"
          />
        </div>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/10 p-5 shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="size-5 text-destructive" />
              <div>
                <p className="font-bold">تعذر تحميل طلبات الشركاء</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadApplications()}>
              إعادة المحاولة
            </Button>
          </div>
        </Card>
      ) : null}

      {loading && !error ? <PartnersLoadingState /> : null}

      {!loading && !error && filteredApplications.length === 0 ? (
        <Card className="flex min-h-[360px] items-center justify-center p-8 text-center">
          <div>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Handshake className="size-8" />
            </span>
            <h2 className="mt-5 text-lg font-extrabold">
              لا توجد طلبات مطابقة
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ستظهر طلبات التسجيل القادمة من تطبيق Yalla Market هنا.
            </p>
          </div>
        </Card>
      ) : null}

      {!loading && !error && filteredApplications.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/35 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 text-right font-bold">النشاط</th>
                  <th className="px-4 py-4 text-right font-bold">المسؤول</th>
                  <th className="px-4 py-4 text-right font-bold">النوع</th>
                  <th className="px-4 py-4 text-right font-bold">التواصل</th>
                  <th className="px-4 py-4 text-right font-bold">التاريخ</th>
                  <th className="px-4 py-4 text-right font-bold">الحالة</th>
                  <th className="px-5 py-4 text-center font-bold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApplications.map((application) => (
                  <tr
                    key={application.id}
                    className="transition-colors hover:bg-muted/25"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Store className="size-5" />
                        </span>
                        <div>
                          <div className="font-extrabold">
                            {application.businessName}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {application.branchesCount} فرع
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold">{application.contactName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {applicantRoleLabel(application.applicantRole)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{businessTypeLabel(application.businessType)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {application.hasTradeLicense
                          ? "لديه سجل تجاري"
                          : "بدون سجل تجاري"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div dir="ltr" className="text-right font-medium">
                        {application.mobileNumber}
                      </div>
                      <div className="mt-1 max-w-48 truncate text-xs text-muted-foreground">
                        {application.email}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      {updatingId === application.id ? (
                        <Loader2 className="size-5 animate-spin text-primary" />
                      ) : (
                        <AppSelect
                          value={application.status}
                          onValueChange={(value) =>
                            void updateStatus(
                              application,
                              value as PartnerStatus,
                            )
                          }
                          options={statusOptions}
                          ariaLabel={`حالة طلب ${application.businessName}`}
                          className="h-9 w-40"
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`عرض طلب ${application.businessName}`}
                        onClick={() => setSelectedApplication(application)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {selectedApplication ? (
        <PartnerDetailsDialog
          application={selectedApplication}
          updating={updatingId === selectedApplication.id}
          onClose={() => setSelectedApplication(null)}
          onStatusChange={(nextStatus) =>
            void updateStatus(selectedApplication, nextStatus)
          }
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Handshake;
  tone: "primary" | "blue" | "amber" | "green";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <Card className="flex items-center gap-4 p-4 shadow-none">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function PartnersLoadingState() {
  return (
    <Card className="space-y-3 p-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-lg bg-muted/70"
        />
      ))}
    </Card>
  );
}

function PartnerDetailsDialog({
  application,
  updating,
  onClose,
  onStatusChange,
}: {
  application: PartnerApplication;
  updating: boolean;
  onClose: () => void;
  onStatusChange: (status: PartnerStatus) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`تفاصيل طلب ${application.businessName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black">
                {application.businessName}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={statusTone(application.status)}>
                  {statusLabel(application.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{application.id}
                </span>
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <DetailItem
            icon={UserRound}
            label="المسؤول"
            value={`${application.contactName} — ${applicantRoleLabel(application.applicantRole)}`}
          />
          <DetailItem
            icon={Store}
            label="نوع النشاط"
            value={`${businessTypeLabel(application.businessType)} • ${application.branchesCount} فرع`}
          />
          <DetailItem
            icon={Phone}
            label="رقم الموبايل"
            value={application.mobileNumber}
            ltr
          />
          <DetailItem icon={Mail} label="البريد" value={application.email} />
          <DetailItem
            icon={Phone}
            label="الخط الأرضي"
            value={application.landline || "غير مسجل"}
            ltr
          />
          <DetailItem
            icon={BadgeCheck}
            label="السجل التجاري"
            value={application.hasTradeLicense ? "متوفر" : "غير متوفر"}
          />
          <DetailItem
            icon={Handshake}
            label="تحديثات واتساب"
            value={application.whatsappOptIn ? "موافق" : "غير موافق"}
          />
          <DetailItem
            icon={Clock3}
            label="تاريخ التقديم"
            value={formatDate(application.createdAt)}
          />
        </div>

        {application.notes ? (
          <div className="mx-5 mb-5 rounded-xl border bg-muted/25 p-4">
            <div className="text-xs font-bold text-muted-foreground">
              ملاحظات مقدم الطلب
            </div>
            <p className="mt-2 text-sm leading-6">{application.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-extrabold">تحديث حالة الطلب</div>
            <div className="mt-1 text-xs text-muted-foreground">
              سيُحفظ التحديث في النظام مباشرة.
            </div>
          </div>
          {updating ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <AppSelect
              value={application.status}
              onValueChange={(value) => onStatusChange(value as PartnerStatus)}
              options={statusOptions}
              ariaLabel="تحديث حالة طلب الشريك"
              className="h-10 sm:w-48"
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof Handshake;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/15 p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={`mt-2 text-sm font-extrabold ${ltr ? "text-right" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
