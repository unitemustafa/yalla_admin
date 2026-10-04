export type ShippingCompany = {
  id: string;
  name: string;
  email?: string | null;
  courierAccountId?: string | null;
  logoUrl: string | null;
  cityIds: string[];
  cityNames: string[];
  status: "active" | "inactive";
  deletionMode: "delete" | null;
};

export type ShippingCompanyDraft = {
  name: string;
  email?: string;
  password?: string;
  cityIds: string[];
  status: "active" | "inactive";
  logoFile: File | null;
  removeLogo: boolean;
};
