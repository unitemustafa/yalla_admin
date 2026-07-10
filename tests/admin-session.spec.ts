import { expect, test, type Page } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";
const sessionExpiryKey = "yalla_admin_session_expires_at";

function base64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function testJwt(expiresInSeconds = 60 * 60) {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
  );
  return `${header}.${payload}.signature`;
}

async function mockAuthApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
    const headers = { "content-type": "application/json" };

    if (path === "auth/login/admin") {
      const body = route.request().postDataJSON() as { remember?: boolean };
      await route.fulfill({
        headers,
        json: {
          accessToken: testJwt(),
          refreshToken: "rotated-refresh-token",
          user: {
            id: "admin-1",
            first_name: "Admin",
            last_name: "User",
            email: "admin@example.com",
            phone: "01000000000",
            role: "admin",
          },
          remember: body.remember,
        },
      });
      return;
    }
    if (path === "auth/refresh") {
      await route.fulfill({
        headers,
        json: { accessToken: testJwt(), refreshToken: "rotated-refresh-token" },
      });
      return;
    }
    if (path === "auth/me") {
      await route.fulfill({
        headers,
        json: {
          id: "admin-1",
          first_name: "Admin",
          last_name: "User",
          email: "admin@example.com",
          phone: "01000000000",
          role: "admin",
        },
      });
      return;
    }
    await route.fulfill({ headers, json: [] });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("yalla-login-splash-seen", "true");
  });
  await mockAuthApi(page);
});

test("remember checkbox is checked by default and can create an eight-hour temporary session", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  const remember = page.locator('input[name="remember"]');
  await expect(remember).toBeChecked();

  const before = Date.now();
  await remember.uncheck();
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("StrongPassword123!");
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/dashboard");

  const expiresAt = Number(
    await page.evaluate((key) => localStorage.getItem(key), sessionExpiryKey),
  );
  expect(expiresAt - before).toBeGreaterThan(7.9 * 60 * 60 * 1000);
  expect(expiresAt - before).toBeLessThanOrEqual(8 * 60 * 60 * 1000 + 2_000);
  expect(await page.evaluate(() => sessionStorage.getItem("yalla_temporary_session_active"))).toBe("true");
  expect((await context.cookies(baseURL)).find((cookie) => cookie.name === "yalla_remember")?.value).toBe("false");
});

test("remember login sets a seven-day absolute session", async ({ page, context }) => {
  await page.goto("/login");
  const before = Date.now();
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("StrongPassword123!");
  await page.locator('input[name="remember"]').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL("**/dashboard");

  const expiresAt = Number(
    await page.evaluate((key) => localStorage.getItem(key), sessionExpiryKey),
  );
  expect(expiresAt - before).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
  expect(expiresAt - before).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 2_000);
  expect((await context.cookies(baseURL)).find((cookie) => cookie.name === "yalla_remember")?.value).toBe("true");
});

test("offline login shows the localized network error", async ({ page }) => {
  await page.route("**/api/v1/auth/login/admin/", (route) => route.abort("failed"));
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("admin@example.com");
  await page.locator('input[name="password"]').fill("StrongPassword123!");
  await page.locator('form button[type="submit"]').click();

  await expect(
    page.getByText("تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مرة أخرى."),
  ).toBeVisible();
  await expect(page.getByText("Failed to fetch")).toHaveCount(0);
});

test("expired session redirects to login and displays the Arabic expiry message", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "yalla_access_token", value: testJwt(), sameSite: "Lax", url: baseURL },
    { name: "yalla_refresh_token", value: "refresh-token", sameSite: "Lax", url: baseURL },
    { name: "yalla_remember", value: "true", sameSite: "Lax", url: baseURL },
  ]);
  await page.addInitScript((key) => localStorage.setItem(key, String(Date.now() - 1)), sessionExpiryKey);

  await page.goto("/dashboard");
  await page.waitForURL(/\/login\?session=expired&next=/);
  await expect(page.getByRole("dialog").getByRole("heading")).toBeVisible();
});

test("refreshing tokens retains the original absolute session expiry", async ({
  page,
  context,
}) => {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await context.addCookies([
    { name: "yalla_access_token", value: testJwt(-60), sameSite: "Lax", url: baseURL },
    { name: "yalla_refresh_token", value: "refresh-token", sameSite: "Lax", url: baseURL },
    { name: "yalla_remember", value: "true", sameSite: "Lax", url: baseURL },
  ]);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, String(value)),
    [sessionExpiryKey, expiresAt],
  );

  await page.goto("/dashboard");
  await page.waitForResponse((response) => response.url().includes("/auth/refresh/") && response.ok());
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), sessionExpiryKey))
    .toBe(String(expiresAt));
});
