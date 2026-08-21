import type { DashboardOrderLike } from "../order-display";

export type AdminOrder = DashboardOrderLike & {
  id: number;
  status: string;
  review_status?: string | null;
  total_price: string;
  customer?: { first_name?: string; last_name?: string; phone?: string };
  assigned_representative?: number | string | { id?: number | string | null } | null;
  assigned_representative_id?: number | string | null;
};

export type CourierDraft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
  vehicleType: string;
  plateNumber: string;
  serviceCity: string;
  maxActiveOrders: string;
  isAvailable: string;
};

export type CourierFormErrors = Partial<Record<keyof CourierDraft, string>>;

export type CourierOrderStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed_delivery"
  | "cancelled";

export type CourierOrder = DashboardOrderLike & {
  id: number;
  order_number?: string | null;
  status: CourierOrderStatus;
  total_price?: string | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  delivery_note?: string | null;
  customer?: {
    id?: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  assigned_representative?: number | string | { id?: number | string | null } | null;
  assigned_representative_id?: number | string | null;
};
