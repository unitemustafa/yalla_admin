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

  it("uses a neutral dynamic order breadcrumb", () => {
    expect(breadcrumbsFromPathname("/orders/view/123").at(-1)?.label).toBe(
      "تفاصيل الطلب",
    );
  });
});
