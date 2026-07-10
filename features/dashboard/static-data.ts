export type DashboardOrder = {
  index: string;
  number: string;
  customer: string;
  phone: string;
  type: string;
  status: string;
  total: number;
  date: string;
  time: string;
  payment: string;
};

export const dashboardOrders: DashboardOrder[] = [
  {
    index: "1",
    number: "ORD-20260524-UEETJE",
    customer: "أماني محمود",
    phone: "+201040377043",
    type: "توصيل",
    status: "قيد الانتظار",
    total: 135,
    date: "الأحد، 24 مايو",
    time: "9:03 م",
    payment: "نقدي",
  },
  {
    index: "2",
    number: "ORD-20260524-YY3TSD",
    customer: "أحمد مرسي",
    phone: "+201130309753",
    type: "توصيل",
    status: "قيد الانتظار",
    total: 440,
    date: "الأحد، 24 مايو",
    time: "8:05 م",
    payment: "نقدي",
  },
  {
    index: "3",
    number: "ORD-20260524-GK41OD",
    customer: "يحيى خشبة",
    phone: "+201127466586",
    type: "توصيل",
    status: "مؤكد",
    total: 1445,
    date: "الأحد، 24 مايو",
    time: "6:56 م",
    payment: "نقدي",
  },
  {
    index: "4",
    number: "ORD-20260524-V374YK",
    customer: "محمد سالم",
    phone: "+201152011771",
    type: "توصيل",
    status: "تم التسليم",
    total: 414,
    date: "الأحد، 24 مايو",
    time: "4:44 م",
    payment: "نقدي",
  },
  {
    index: "5",
    number: "ORD-20260524-D2W0RJ",
    customer: "mohamed Gamal",
    phone: "+201121675495",
    type: "توصيل",
    status: "تم التسليم",
    total: 250,
    date: "الأحد، 24 مايو",
    time: "4:34 م",
    payment: "نقدي",
  },
];

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
