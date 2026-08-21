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

export const neutralDashboardUserName = "مستخدم النظام";
