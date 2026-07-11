export type DashboardUser = {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  avatar: string;
  gender?: string;
  role: string;
  branch: string;
  location: string;
  joinedAt: string;
  lastLogin: string;
  updatedAt?: string;
  orders: number;
  totalSpent: string;
  lastOrder: string;
  status: string;
  active?: boolean;
  notes: string;
  hasPassword?: boolean;
  hasSignedIn?: boolean;
  isLocal?: boolean;
};

export const dashboardUsers: DashboardUser[] = [
  {
    id: "default-user",
    name: "mohamed Gamal",
    username: "mohamed.gamal",
    phone: "+201121675495",
    email: "mohamed.gamal@yalla-market.com",
    avatar: "/default-user-avatar.svg",
    role: "مستخدم",
    branch: "أول أونلاين ماركت في التل الكبير",
    location: "القاهرة، مصر",
    joinedAt: "26 مايو 2026",
    lastLogin: "اليوم، 4:12 م",
    orders: 1,
    totalSpent: "250.00 EGP",
    lastOrder: "ORD-20260524-D2W0RJ",
    status: "مفعل",
    notes: "مستخدم افتراضي جاهز لاختبار بيانات لوحة التحكم.",
  },
];

export function findDashboardUser(userId: string) {
  return dashboardUsers.find((user) => user.id === userId);
}
