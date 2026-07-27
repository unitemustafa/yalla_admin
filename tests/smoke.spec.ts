import { expect, test } from "@playwright/test";

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
