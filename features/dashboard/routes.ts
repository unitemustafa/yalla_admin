import {
  Archive,
  BadgeCheck,
  Handshake,
  Layers3,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  Users,
} from "lucide-react";

import type { BreadcrumbItem, NavChild, NavGroup, PageKey } from "./types";

type DashboardRoute = {
  href?: string;
  matches: readonly string[];
  prefixMatches?: readonly string[];
  breadcrumbs: readonly BreadcrumbItem[];
};

const dashboardCrumb: BreadcrumbItem = {
  label: "لوحة التحكم",
  href: "/dashboard",
};

export const dashboardRoutes = {
  overview: {
    href: "/dashboard",
    matches: ["/", "/dashboard", "/overview"],
    breadcrumbs: [{ label: "لوحة التحكم" }],
  },
  items: {
    href: "/items",
    matches: ["/items"],
    prefixMatches: ["/items/edit/"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات" }],
  },
  "create-item": {
    href: "/items/create",
    matches: ["/items/create"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات", href: "/items" }, { label: "إضافة منتج" }],
  },
  shops: {
    href: "/items/shops",
    matches: ["/items/shops"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات", href: "/items" }, { label: "المحلات" }],
  },
  categories: {
    href: "/categories/markets",
    matches: ["/categories", "/categories/markets"],
    breadcrumbs: [dashboardCrumb, { label: "الفئات" }, { label: "الفئات الأساسية للمحلات" }],
  },
  "market-types": {
    href: "/categories/market-types",
    matches: ["/categories/market-types"],
    breadcrumbs: [dashboardCrumb, { label: "الفئات" }, { label: "الفئات الثانوية للمحلات" }],
  },
  "store-subcategories": {
    href: "/items/store-subcategories",
    matches: ["/items/store-subcategories"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات", href: "/items" }, { label: "أقسام منتجات المحلات" }],
  },
  addons: {
    href: "/items/addons",
    matches: ["/items/addons"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات", href: "/items" }, { label: "الإضافات" }],
  },
  orders: {
    href: "/orders",
    matches: ["/orders"],
    breadcrumbs: [dashboardCrumb, { label: "الطلبات" }],
  },
  "create-order": {
    href: "/orders/create",
    matches: ["/orders/create"],
    breadcrumbs: [dashboardCrumb, { label: "الطلبات", href: "/orders" }, { label: "إنشاء طلب" }],
  },
  "order-detail": {
    prefixMatches: ["/orders/view/"],
    matches: [],
    breadcrumbs: [dashboardCrumb, { label: "الطلبات", href: "/orders" }, { label: "تفاصيل الطلب" }],
  },
  offers: {
    href: "/offers",
    matches: ["/offers"],
    breadcrumbs: [dashboardCrumb, { label: "العروض" }],
  },
  "create-offer": {
    href: "/offers/create",
    matches: ["/offers/create"],
    breadcrumbs: [dashboardCrumb, { label: "العروض", href: "/offers" }, { label: "إنشاء عرض" }],
  },
  cities: {
    href: "/cities",
    matches: ["/cities"],
    breadcrumbs: [dashboardCrumb, { label: "المدن" }],
  },
  "delivery-zone": {
    href: "/delivery-zone",
    matches: ["/delivery-zone"],
    breadcrumbs: [dashboardCrumb, { label: "مناطق التوصيل" }],
  },
  couriers: {
    href: "/delivery/couriers",
    matches: ["/delivery/couriers"],
    prefixMatches: ["/delivery/couriers/"],
    breadcrumbs: [dashboardCrumb, { label: "التوصيل" }, { label: "المندوبين" }],
  },
  "create-courier": {
    href: "/delivery/couriers/new",
    matches: ["/delivery/couriers/new"],
    breadcrumbs: [dashboardCrumb, { label: "التوصيل" }, { label: "المندوبين", href: "/delivery/couriers" }, { label: "إضافة مندوب" }],
  },
  customers: {
    href: "/customers",
    matches: ["/customers"],
    prefixMatches: ["/customers/"],
    breadcrumbs: [dashboardCrumb, { label: "العملاء" }],
  },
  partners: {
    href: "/partners",
    matches: ["/partners"],
    prefixMatches: ["/partners/"],
    breadcrumbs: [dashboardCrumb, { label: "الشركاء" }],
  },
  "archived-items": {
    href: "/archives/products",
    matches: ["/archives/products"],
    breadcrumbs: [dashboardCrumb, { label: "المؤرشفات" }, { label: "المنتجات المؤرشفة" }],
  },
  "archived-shops": {
    href: "/archives/shops",
    matches: ["/archives/shops"],
    breadcrumbs: [dashboardCrumb, { label: "المؤرشفات" }, { label: "المحلات المؤرشفة" }],
  },
  "archived-offers": {
    href: "/archives/offers",
    matches: ["/archives/offers"],
    breadcrumbs: [dashboardCrumb, { label: "المؤرشفات" }, { label: "العروض المؤرشفة" }],
  },
  "archived-cities": {
    href: "/archives/cities",
    matches: ["/archives/cities"],
    breadcrumbs: [dashboardCrumb, { label: "المؤرشفات" }, { label: "المدن المؤرشفة" }],
  },
  "archived-delivery-zones": {
    href: "/archives/delivery-zones",
    matches: ["/archives/delivery-zones"],
    breadcrumbs: [dashboardCrumb, { label: "المؤرشفات" }, { label: "مناطق التوصيل المؤرشفة" }],
  },
  memberships: {
    matches: [],
    breadcrumbs: [dashboardCrumb, { label: "العضويات" }],
  },
  account: {
    href: "/account",
    matches: ["/account"],
    breadcrumbs: [dashboardCrumb, { label: "Account" }],
  },
  settings: {
    href: "/settings",
    matches: ["/settings"],
    prefixMatches: ["/settings/"],
    breadcrumbs: [dashboardCrumb, { label: "الإعدادات" }],
  },
  notifications: {
    href: "/notifications",
    matches: ["/notifications"],
    breadcrumbs: [dashboardCrumb, { label: "Notifications" }],
  },
} as const satisfies Record<PageKey, DashboardRoute>;

function navChild(page: PageKey, label: string): NavChild {
  const route: DashboardRoute = dashboardRoutes[page];
  const href = route.href;
  if (!href) throw new Error(`Missing navigation path for ${page}`);
  return { label, href, page };
}

export const navGroups: NavGroup[] = [
  {
    label: "القائمة",
    items: [
      { icon: LayoutDashboard, ...navChild("overview", "لوحة التحكم") },
      {
        label: "المنتجات",
        icon: ShoppingBag,
        children: [
          navChild("items", "كل المنتجات"),
          navChild("create-item", "إضافة منتج"),
          navChild("shops", "المحلات"),
          navChild("store-subcategories", "أقسام منتجات المحلات"),
          navChild("addons", "الإضافات"),
        ],
      },
      {
        label: "الفئات",
        icon: Layers3,
        children: [
          navChild("categories", "الفئات الأساسية للمحلات"),
          navChild("market-types", "الفئات الثانوية للمحلات"),
        ],
      },
      {
        label: "الطلبات",
        icon: ShoppingCart,
        children: [navChild("orders", "كل الطلبات"), navChild("create-order", "إنشاء طلب")],
      },
      {
        label: "العروض",
        icon: Tag,
        children: [navChild("offers", "كل العروض"), navChild("create-offer", "إنشاء عرض")],
      },
      { icon: MapPinned, ...navChild("cities", "المدن") },
    ],
  },
  {
    label: "الإدارة",
    items: [
      {
        label: "التوصيل",
        icon: Truck,
        children: [
          navChild("delivery-zone", "مناطق التوصيل"),
          navChild("couriers", "المندوبين"),
          navChild("create-courier", "إضافة مندوب"),
        ],
      },
      { icon: Users, ...navChild("customers", "العملاء") },
      { icon: Handshake, ...navChild("partners", "الشركاء") },
      {
        label: "المؤرشفات",
        icon: Archive,
        children: [
          navChild("archived-items", "المنتجات المؤرشفة"),
          navChild("archived-shops", "المحلات المؤرشفة"),
          navChild("archived-offers", "العروض المؤرشفة"),
          navChild("archived-cities", "المدن المؤرشفة"),
          navChild("archived-delivery-zones", "مناطق التوصيل المؤرشفة"),
        ],
      },
      { label: "العضويات", icon: BadgeCheck, page: "memberships", soon: true },
      { label: "الشات", icon: MessageCircle, soon: true },
    ],
  },
];

export function pageFromPathname(pathname: string): PageKey {
  for (const [page, route] of Object.entries(dashboardRoutes) as Array<
    [PageKey, DashboardRoute]
  >) {
    if (route.matches.includes(pathname)) return page;
  }

  for (const [page, route] of Object.entries(dashboardRoutes) as Array<
    [PageKey, DashboardRoute]
  >) {
    if (route.prefixMatches?.some((prefix) => pathname.startsWith(prefix))) {
      return page;
    }
  }

  return "overview";
}

export function breadcrumbsFromPathname(pathname: string): BreadcrumbItem[] {
  return [...dashboardRoutes[pageFromPathname(pathname)].breadcrumbs];
}
