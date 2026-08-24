import type { NavGroup, PageKey } from "../types";

type NavItem = NavGroup["items"][number];
type Translate = (key: string) => string;
type PageTitle = (page: PageKey) => string;

export function navItemIsActive(item: NavItem, activePage: PageKey) {
  return (
    item.page === activePage ||
    Boolean(item.children?.some((child) => child.page === activePage)) ||
    Boolean(item.activePages?.includes(activePage))
  );
}

export function activeGroupLabelForPage(
  navGroups: NavGroup[],
  activePage: PageKey,
) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (
        item.children?.some((child) => child.page === activePage) ||
        item.activePages?.includes(activePage)
      ) {
        return item.label;
      }
    }
  }

  return null;
}

export function sidebarGroupLabel(index: number, t: Translate) {
  return index === 0
    ? t("sidebar.group.menu")
    : t("sidebar.group.management");
}

export function sidebarItemLabel(
  item: NavItem,
  t: Translate,
  pageTitle: PageTitle,
) {
  if (item.page) {
    return pageTitle(item.page);
  }

  const firstChildPage = item.children?.[0]?.page;

  if (firstChildPage === "items") return t("nav.products");
  if (firstChildPage === "shops") return t("nav.shops");
  if (firstChildPage === "orders") return t("nav.orders");
  if (firstChildPage === "offers") return t("nav.offers");
  if (firstChildPage === "delivery-zone") return t("nav.delivery");
  if (firstChildPage === "archived-items") return t("nav.archives");

  return item.soon ? t("nav.chat") : item.label;
}

export function sidebarChildLabel(
  page: PageKey,
  t: Translate,
  pageTitle: PageTitle,
) {
  if (page === "items") return t("nav.allProducts");
  if (page === "shops") return t("nav.allShops");
  if (page === "orders") return t("nav.allOrders");
  if (page === "offers") return t("nav.allOffers");

  return pageTitle(page);
}

export function sidebarUserName(
  user:
    | {
        first_name?: string;
        last_name?: string;
        username?: string;
      }
    | null
    | undefined,
  fallback: string,
) {
  return (
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    fallback
  );
}
