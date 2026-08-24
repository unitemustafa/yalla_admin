import { describe, expect, it } from "vitest";

import { navGroups } from "../routes";
import {
  activeGroupLabelForPage,
  navItemIsActive,
  sidebarChildLabel,
  sidebarItemLabel,
  sidebarUserName,
} from "./navigation-logic";

const t = (key: string) => `t:${key}`;
const pageTitle = (page: Parameters<typeof sidebarChildLabel>[0]) =>
  `page:${page}`;

describe("sidebar navigation logic", () => {
  it("marks both direct and child navigation items active", () => {
    const direct = navGroups[0].items[0];
    const products = navGroups[0].items[1];

    expect(navItemIsActive(direct, "overview")).toBe(true);
    expect(navItemIsActive(products, "items")).toBe(true);
    expect(navItemIsActive(products, "create-item")).toBe(true);
    expect(navItemIsActive(products, "orders")).toBe(false);
  });

  it("finds the route-owned expandable group", () => {
    expect(activeGroupLabelForPage(navGroups, "create-item")).toBe("المنتجات");
    expect(activeGroupLabelForPage(navGroups, "overview")).toBeNull();
  });

  it("keeps special parent and child labels", () => {
    expect(sidebarItemLabel(navGroups[0].items[1], t, pageTitle)).toBe(
      "t:nav.products",
    );
    expect(sidebarChildLabel("items", t, pageTitle)).toBe(
      "t:nav.allProducts",
    );
    expect(sidebarItemLabel(navGroups[0].items[2], t, pageTitle)).toBe(
      "t:nav.shops",
    );
    expect(sidebarChildLabel("shops", t, pageTitle)).toBe("t:nav.allShops");
    expect(sidebarChildLabel("cities", t, pageTitle)).toBe("page:cities");
  });

  it("keeps the existing user-name precedence", () => {
    expect(
      sidebarUserName(
        { first_name: "أحمد", last_name: "علي", username: "admin" },
        "fallback",
      ),
    ).toBe("أحمد علي");
    expect(sidebarUserName({ username: "admin" }, "fallback")).toBe("admin");
    expect(sidebarUserName(null, "fallback")).toBe("fallback");
  });
});
