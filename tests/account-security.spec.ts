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

function testJwt() {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }),
  );
  return `${header}.${payload}.signature`;
}

const adminUser = {
  id: "admin-1",
  first_name: "Admin",
  last_name: "User",
  email: "admin@example.com",
  phone: "01000000000",
  role: "admin",
};

async function authenticateAccount(page: Page) {
  await page.context().addCookies([
    { name: "yalla_access_token", value: testJwt(), sameSite: "Lax", url: baseURL },
    { name: "yalla_refresh_token", value: "refresh-token", sameSite: "Lax", url: baseURL },
    { name: "yalla_remember", value: "true", sameSite: "Lax", url: baseURL },
  ]);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, String(value)),
    [sessionExpiryKey, Date.now() + 60 * 60 * 1000],
  );
}

async function mockAccountApi(page: Page, patches: string[]) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
    const headers = { "content-type": "application/json" };

    if (path === "auth/me") {
      if (route.request().method() === "PATCH") patches.push(route.request().postData() ?? "");
      await route.fulfill({ headers, json: adminUser });
      return;
    }
    if (path === "auth/forgot-password") {
      await route.fulfill({ headers, json: { resend_after_seconds: 30 } });
      return;
    }
    if (path === "auth/reset-password" || path === "auth/logout") {
      await route.fulfill({ headers, json: { detail: "ok" } });
      return;
    }
    await route.fulfill({ headers, json: [] });
  });
}

test("account email is read-only and profile payloads omit email", async ({ page }) => {
  const patches: string[] = [];
  await authenticateAccount(page);
  await mockAccountApi(page, patches);
  await page.goto("/account");

  const emailInput = page.getByTestId("account-email-input");
  await expect(emailInput).toHaveAttribute("readonly", "");
  await page.getByTestId("account-name-input").fill("Updated Admin");
  await page.locator('form button[type="submit"]').click();
  await expect.poll(() => patches.length).toBe(1);
  expect(JSON.parse(patches[0])).toEqual({ first_name: "Updated", last_name: "Admin" });

  await page.locator('input[type="file"]').setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.locator('form button[type="submit"]').click();
  await expect.poll(() => patches.length).toBe(2);
  expect(patches[1]).toContain('name="first_name"');
  expect(patches[1]).toContain('name="last_name"');
  expect(patches[1]).not.toContain('name="email"');
});

test("password change is enabled and requesting a code opens the OTP form without a dev code", async ({
  page,
}) => {
  const patches: string[] = [];
  await authenticateAccount(page);
  await mockAccountApi(page, patches);
  await page.goto("/account");

  const changeButton = page.getByTestId("change-password-button");
  await expect(changeButton).toBeEnabled();
  await changeButton.click();
  await expect(page.getByTestId("password-otp-input")).toBeVisible();
  await expect(page.getByTestId("new-password-input")).toBeVisible();
  await expect(page.getByTestId("confirm-password-input")).toBeVisible();
  await expect(page.getByTestId("save-password-button")).toBeVisible();
  await expect(page.getByText("كود التطوير المحلي")).toHaveCount(0);
});

test("successful password reset logs out and redirects to login", async ({ page }) => {
  const patches: string[] = [];
  await authenticateAccount(page);
  await mockAccountApi(page, patches);
  await page.goto("/account");
  await page.getByTestId("change-password-button").click();
  await page.getByTestId("password-otp-input").fill("123456");
  await page.getByTestId("new-password-input").fill("NewPassword123!");
  await page.getByTestId("confirm-password-input").fill("NewPassword123!");
  await page.getByTestId("save-password-button").click();

  await page.waitForURL("**/login**");
});
