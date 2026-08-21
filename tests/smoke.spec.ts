import { expect, test } from "@playwright/test";

import { navGroups, pageFromPathname } from "../features/dashboard/routes";

test("archives use one dedicated navigation section and distinct routes", () => {
  const archiveItem = navGroups
    .flatMap((group) => group.items)
    .find((item) =>
      item.children?.some((child) => child.page === "archived-items"),
    );

  expect(archiveItem?.children?.map((child) => [child.href, child.page])).toEqual(
    [
      ["/archives/products", "archived-items"],
      ["/archives/shops", "archived-shops"],
      ["/archives/offers", "archived-offers"],
      ["/archives/cities", "archived-cities"],
      ["/archives/delivery-zones", "archived-delivery-zones"],
    ],
  );
  expect(pageFromPathname("/archives/products")).toBe("archived-items");
  expect(pageFromPathname("/archives/shops")).toBe("archived-shops");
  expect(pageFromPathname("/archives/offers")).toBe("archived-offers");
  expect(pageFromPathname("/archives/cities")).toBe("archived-cities");
  expect(pageFromPathname("/archives/delivery-zones")).toBe(
    "archived-delivery-zones",
  );
});

test("categories use a dedicated navigation section below products", () => {
  const menuItems = navGroups[0].items;
  const productsIndex = menuItems.findIndex((item) =>
    item.children?.some((child) => child.page === "items"),
  );
  const categoriesIndex = menuItems.findIndex((item) =>
    item.children?.some((child) => child.page === "categories"),
  );
  const productsItem = menuItems[productsIndex];
  const categoriesItem = menuItems[categoriesIndex];

  expect(categoriesIndex).toBe(productsIndex + 1);
  expect(
    productsItem?.children?.some((child) => child.page === "categories"),
  ).toBe(false);
  expect(
    productsItem?.children?.some(
      (child) =>
        child.href === "/items/store-subcategories" &&
        child.page === "store-subcategories",
    ),
  ).toBe(true);
  expect(
    categoriesItem?.children?.map((child) => [child.href, child.page]),
  ).toEqual([
    ["/categories/markets", "categories"],
    ["/categories/market-types", "market-types"],
  ]);
  expect(pageFromPathname("/categories/markets")).toBe("categories");
  expect(pageFromPathname("/categories/market-types")).toBe("market-types");
  expect(pageFromPathname("/items/store-subcategories")).toBe(
    "store-subcategories",
  );
});

test("protected dashboard routes redirect to login with a safe return path", async ({
  page,
}) => {
  await page.goto("/dashboard?from=smoke");

  await expect(page).toHaveURL(
    /\/login\?next=%2Fdashboard%3Ffrom%3Dsmoke$/,
  );
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("archive routes are protected and preserve their return path", async ({
  page,
}) => {
  await page.goto("/archives/products");

  await expect(page).toHaveURL(
    /\/login\?next=%2Farchives%2Fproducts$/,
  );
});

test("category routes are protected and preserve their return path", async ({
  page,
}) => {
  await page.goto("/categories/market-types");

  await expect(page).toHaveURL(
    /\/login\?next=%2Fcategories%2Fmarket-types$/,
  );
});

test("public responses include browser security headers", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response).not.toBeNull();

  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-robots-tag"]).toContain("noindex");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

for (const viewport of [
  { name: "compact phone", width: 320, height: 568 },
  { name: "large phone", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`login remains usable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");

    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const submit = page.getByRole("button", { name: "دخول", exact: true });
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);

    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });
}
