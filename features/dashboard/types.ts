import type { LucideIcon } from "lucide-react";

export type PageKey =
  | "overview"
  | "items"
  | "create-item"
  | "shops"
  | "categories"
  | "market-types"
  | "store-subcategories"
  | "addons"
  | "orders"
  | "create-order"
  | "order-detail"
  | "offers"
  | "create-offer"
  | "home-campaigns"
  | "create-home-campaign"
  | "cities"
  | "delivery-zone"
  | "shipping-companies"
  | "couriers"
  | "create-courier"
  | "customers"
  | "partners"
  | "archived-items"
  | "archived-shops"
  | "archived-offers"
  | "archived-cities"
  | "archived-delivery-zones"
  | "archived-shipping-companies"
  | "memberships"
  | "account"
  | "settings"
  | "notifications";

export type NavChild = {
  label: string;
  href: string;
  page: PageKey;
  soon?: boolean;
};

type NavItem = {
  label: string;
  href?: string;
  page?: PageKey;
  icon: LucideIcon;
  soon?: boolean;
  children?: NavChild[];
  activePages?: PageKey[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type BreadcrumbItem = {
  label: string;
  href?: string;
};
