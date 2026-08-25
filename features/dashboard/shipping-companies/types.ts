export type ShippingCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  cityIds: string[];
  cityNames: string[];
  status: "active" | "inactive";
  archivedAt: string | null;
  deletionMode: "delete" | "archive";
};

export type ShippingCompanyDraft = {
  name: string;
  cityIds: string[];
  status: "active" | "inactive";
  logoFile: File | null;
  removeLogo: boolean;
};
