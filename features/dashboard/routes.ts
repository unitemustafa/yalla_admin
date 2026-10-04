import {
  BadgeCheck,
  Handshake,
  LayoutDashboard,
  MapPinned,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  Users,
} from "lucide-react";

import type { BreadcrumbItem, NavChild, NavGroup, PageKey } from "./types";
import { ar } from "./locales/ar";

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
    breadcrumbs: [dashboardCrumb, { label: "المحلات" }, { label: "كل المحلات" }],
  },
  categories: {
    href: "/categories/markets",
    matches: ["/categories", "/categories/markets"],
    breadcrumbs: [dashboardCrumb, { label: ar["nav.categories"] }, { label: ar["page.categories"] }],
  },
  "market-types": {
    href: "/categories/market-types",
    matches: ["/categories/market-types"],
    breadcrumbs: [dashboardCrumb, { label: ar["nav.categories"] }, { label: ar["page.marketTypes"] }],
  },
  "store-subcategories": {
    href: "/items/store-subcategories",
    matches: ["/items/store-subcategories"],
    breadcrumbs: [dashboardCrumb, { label: "المنتجات", href: "/items" }, { label: "أقسام المنتجات" }],
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
  "home-campaigns": {
    href: "/offers/home-campaigns",
    matches: ["/offers/home-campaigns"],
    breadcrumbs: [dashboardCrumb, { label: "العروض", href: "/offers" }, { label: "حملة إعلانية" }],
  },
  "create-home-campaign": {
    href: "/offers/home-campaigns/create",
    matches: ["/offers/home-campaigns/create"],
    breadcrumbs: [dashboardCrumb, { label: "حملة إعلانية", href: "/offers/home-campaigns" }, { label: "إنشاء حملة إعلانية" }],
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
  "shipping-companies": {
    href: "/delivery/shipping-companies",
    matches: ["/delivery/shipping-companies"],
    breadcrumbs: [dashboardCrumb, { label: "التوصيل" }, { label: "شركات الشحن" }],
  },
  couriers: {
    href: "/delivery/couriers",
    matches: ["/delivery/couriers"],
    prefixMatches: ["/delivery/couriers/"],
    breadcrumbs: [dashboardCrumb, { label: ar["nav.couriers"] }],
  },
  "create-courier": {
    href: "/delivery/couriers/new",
    matches: ["/delivery/couriers/new"],
    breadcrumbs: [dashboardCrumb, { label: ar["nav.couriers"], href: "/delivery/couriers" }, { label: ar["page.createCourier"] }],
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
  memberships: {
    matches: [],
    breadcrumbs: [dashboardCrumb, { label: "العضويات" }],
  },
  account: {
    href: "/account",
    matches: ["/account"],
    breadcrumbs: [dashboardCrumb, { label: "Account" }],
  },
  "app-media": {
    href: "/app-media",
    matches: ["/app-media"],
    breadcrumbs: [dashboardCrumb, { label: ar["page.appMedia"] }],
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
        label: ar["nav.categories"],
        icon: Tag,
        children: [
          navChild("categories", ar["nav.primaryCategories"]),
          navChild("market-types", ar["nav.marketTypes"]),
        ],
      },
      {
        label: "المحلات",
        icon: Store,
        children: [navChild("shops", "كل المحلات")],
      },
      {
        label: "المنتجات",
        icon: ShoppingBag,
        activePages: ["create-item"],
        children: [
          navChild("items", "كل المنتجات"),
          navChild("store-subcategories", "أقسام المنتجات"),
          navChild("addons", "الإضافات"),
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
        activePages: ["create-offer", "create-home-campaign"],
        children: [
          navChild("offers", "كل العروض"),
          navChild("home-campaigns", "حملة إعلانية"),
        ],
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
        ],
      },
      {
        label: ar["nav.couriers"],
        icon: Users,
        children: [
          navChild("couriers", ar["nav.allCouriers"]),
          navChild("shipping-companies", "شركات الشحن"),
        ],
      },
      { icon: Users, ...navChild("customers", "العملاء") },
      { icon: Handshake, ...navChild("partners", "الشركاء") },
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
  const breadcrumbs: BreadcrumbItem[] = [
    ...dashboardRoutes[pageFromPathname(pathname)].breadcrumbs,
  ];
  const orderId = /^\/orders\/view\/([1-9]\d*)\/?$/.exec(pathname)?.[1];
  if (orderId) {
    breadcrumbs[breadcrumbs.length - 1] = { label: `تفاصيل الطلب #${orderId}` };
  }
  return breadcrumbs;
}
