import type {
  PartnerApplication,
  PartnerFilter,
  PartnerStatus,
} from "./types";

type ApiRecord = Record<string, unknown>;

const partnerStatusOptions: Array<{
  value: PartnerStatus;
  label: string;
}> = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_review", label: "قيد المراجعة" },
  { value: "approved", label: "موافق" },
  { value: "rejected", label: "مرفوض" },
];

export const partnerDecisionOptions = partnerStatusOptions.filter(
  (option) => option.value === "approved" || option.value === "rejected",
);

export const partnerFilterOptions: Array<{
  value: PartnerFilter;
  label: string;
}> = [
  { value: "all", label: "كل الحالات" },
  ...partnerStatusOptions.filter((option) => option.value !== "in_review"),
];

export function isPartnerApiRecord(value: unknown): value is ApiRecord {
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

export function partnerApplicationFromApi(
  record: ApiRecord,
): PartnerApplication {
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

export function partnerApplicationsFromApi(value: unknown) {
  const rows = Array.isArray(value)
    ? value
    : isPartnerApiRecord(value) && Array.isArray(value.results)
      ? value.results
      : [];
  return rows.filter(isPartnerApiRecord).map(partnerApplicationFromApi);
}

export function partnerStatusLabel(status: PartnerStatus) {
  return (
    partnerStatusOptions.find((option) => option.value === status)?.label ??
    "قيد الانتظار"
  );
}

export function partnerStatusTone(
  status: PartnerStatus,
): "blue" | "green" | "red" | "secondary" {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "pending") return "blue";
  return "secondary";
}

export function partnerDecisionValue(status: PartnerStatus) {
  return status === "approved" || status === "rejected" ? status : undefined;
}

export function partnerBusinessTypeLabel(value: string) {
  const labels: Record<string, string> = {
    shop: "متجر",
    restaurant: "مطعم",
    service_provider: "مقدم خدمات",
  };
  return labels[value] ?? value;
}

export function partnerApplicantRoleLabel(value: string) {
  const labels: Record<string, string> = {
    owner_partner: "مالك / شريك",
    manager_legal_representative: "مدير / ممثل قانوني",
  };
  return labels[value] ?? value;
}

export function formatPartnerDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function filterPartnerApplications(
  applications: PartnerApplication[],
  filter: PartnerFilter,
  search: string,
) {
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
}

export function partnerApplicationCounts(
  applications: PartnerApplication[],
) {
  return {
    total: applications.length,
    pending: applications.filter((item) => item.status === "pending").length,
    approved: applications.filter((item) => item.status === "approved").length,
    rejected: applications.filter((item) => item.status === "rejected").length,
  };
}
