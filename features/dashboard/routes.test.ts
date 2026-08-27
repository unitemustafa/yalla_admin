import { describe, expect, it } from "vitest";

import {
  breadcrumbsFromPathname,
  dashboardRoutes,
  navGroups,
  pageFromPathname,
} from "./routes";

describe("dashboard routes", () => {
  it.each([
    ["/dashboard", "overview"],
    ["/items/create", "create-item"],
    ["/items/edit/42", "items"],
    ["/categories/markets", "categories"],
    ["/items/store-subcategories", "store-subcategories"],
    ["/orders/view/ORD-1", "order-detail"],
    ["/delivery/couriers/new", "create-courier"],
    ["/delivery/couriers/9", "couriers"],
    ["/delivery/shipping-companies", "shipping-companies"],
    ["/archives/shipping-companies", "archived-shipping-companies"],
  ] as const)("maps %s to %s", (pathname, page) => {
    expect(pageFromPathname(pathname)).toBe(page);
  });

  it.each([
    "/items/add",
    "/items/categories",
    "/categories/store-subcategories",
  ])("does not recognize removed route %s", (pathname) => {
    expect(pageFromPathname(pathname)).toBe("overview");
  });

  it("derives navigation links from canonical route entries", () => {
    const children = navGroups.flatMap((group) =>
      group.items.flatMap((item) => item.children ?? []),
    );

    for (const child of children) {
      const route = dashboardRoutes[child.page];
      expect(child.href).toBe("href" in route ? route.href : undefined);
    }
  });

  it("orders categories, shops, and products after the dashboard", () => {
    const menuItems = navGroups[0].items;
    const categories = menuItems.find((item) => item.label === "الفئات");
    const products = menuItems.find((item) => item.label === "المنتجات");
    const shops = menuItems.find((item) => item.label === "المحلات");

    expect(menuItems.slice(0, 4).map((item) => item.label)).toEqual([
      "لوحة التحكم",
      "الفئات",
      "المحلات",
      "المنتجات",
    ]);
    expect(categories?.children?.map((child) => child.page)).toEqual([
      "categories",
      "market-types",
    ]);
    expect(products?.children?.map((child) => child.page)).toEqual([
      "items",
      "store-subcategories",
      "addons",
    ]);
    expect(shops?.children?.map((child) => child.page)).toEqual(["shops"]);
  });

  it("keeps couriers in their own pilots group", () => {
    const managementItems = navGroups[1].items;
    const delivery = managementItems.find((item) => item.label === "التوصيل");
    const pilots = managementItems.find((item) => item.label === "الطيارين");

    expect(delivery?.children?.map((child) => child.page)).toEqual([
      "delivery-zone",
      "shipping-companies",
    ]);
    expect(pilots?.children?.map((child) => [child.page, child.label])).toEqual([
      ["couriers", "كل الطيارين"],
      ["create-courier", "إضافة طيار"],
    ]);
  });

  it("uses a neutral dynamic order breadcrumb", () => {
    expect(breadcrumbsFromPathname("/orders/view/123").at(-1)?.label).toBe(
      "تفاصيل الطلب",
    );
  });
});
