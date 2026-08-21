export type LoginDashboardBranding = {
  brandName: string;
  brandTagline: string;
  logoUrl: string | null;
  fontFamily: "Cairo" | "Tajawal" | "Alexandria" | "System";
  primaryColor: string;
  subtleColor: string;
  accentColor: string;
};

export type LoginDashboardSnapshot = {
  todayOrders: number;
  availableCities: number;
  deliveryZones: number;
  branding: LoginDashboardBranding;
};

export const emptyLoginDashboardSnapshot: LoginDashboardSnapshot = {
  todayOrders: 0,
  availableCities: 0,
  deliveryZones: 0,
  branding: {
    brandName: "Yalla Market",
    brandTagline: "لوحة التحكم",
    logoUrl: null,
    fontFamily: "Cairo",
    primaryColor: "#155d72",
    subtleColor: "#e7f2f4",
    accentColor: "#f0b64f",
  },
};
