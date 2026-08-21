export type BackendRecord = Record<string, unknown>;

export type DashboardOverview = {
  range?: { from?: string; to?: string; timezone?: string };
  currency?: string;
  revenue?: {
    total?: string | number | null;
    percentage?: string | number | null;
  };
  orders?: {
    total?: string | number | null;
    completed?: string | number | null;
    incomplete?: string | number | null;
    completion_rate?: string | number | null;
  };
  customers?: {
    new?: string | number | null;
    returning?: string | number | null;
    return_rate?: string | number | null;
  };
  top_products?: BackendRecord[];
  active_orders?: BackendRecord[];
  top_shops?: BackendRecord[];
};

export type DateField = "from" | "to";

export type DateRange = {
  from: Date;
  to: Date;
};

export type ProductChartItem = {
  chartName: string;
  name: string;
  revenue: number;
  orders: number;
  sold: number;
  key: string;
};

export type ActiveOrderItem = {
  key: string;
  code: string;
  customerName: string;
  marketSummary: string;
  marketCount: number;
  href: string;
  amount: number;
  status: string;
};

export type TopShopItem = {
  key: string;
  rank: number;
  name: string;
  zone: string;
  revenue: number;
  orders: number;
  average: number;
};
