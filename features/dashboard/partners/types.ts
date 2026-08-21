export type PartnerStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected";

export type PartnerFilter = "all" | PartnerStatus;

export type PartnerApplication = {
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
