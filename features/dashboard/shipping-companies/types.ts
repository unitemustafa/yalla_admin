export type ShippingCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  cityIds: string[];
  cityNames: string[];
  status: "active" | "inactive";
  deletionMode: "delete" | null;
};

export type ShippingCompanyDraft = {
  name: string;
  cityIds: string[];
  status: "active" | "inactive";
  logoFile: File | null;
  removeLogo: boolean;
};
