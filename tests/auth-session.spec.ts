import { expect, test, type BrowserContext } from "@playwright/test";
import { mediaSpecs, videoSpec } from "../lib/media-specs";

const admin = { id: "1", first_name: "Fixture", last_name: "Admin", email: "admin@example.test", phone: "", role: "admin" };
const mediaContract = {
  version: 1,
  images: Object.fromEntries(Object.entries(mediaSpecs).map(([key, spec]) => [key, {
    ...spec, maxBytes: 5 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  }])),
  video: videoSpec,
};
function fixtureData(path: string) {
  return path.endsWith("/auth/me/") ? admin : path.endsWith("/media-specs/") ? mediaContract : [];
}
const origin = "http://127.0.0.1:3000";
function accessToken(expiry: number) {
  return `fixture.${Buffer.from(JSON.stringify({ exp: expiry })).toString("base64url")}.fixture`;
}

async function savedSession(context: BrowserContext, expired = false) {
  await context.addCookies([
    { name: "yalla_access_token", value: accessToken(Math.floor(Date.now() / 1000) + (expired ? -60 : 3600)), url: origin },
    { name: "yalla_refresh_token", value: "fixture-refresh", url: origin },
    { name: "yalla_auth_user", value: encodeURIComponent(JSON.stringify(admin)), url: origin },
    { name: "yalla_remember", value: "true", url: origin },
  ]);
  await context.addInitScript(() => {
    if (!localStorage.getItem("yalla_admin_session_expires_at")) {
      localStorage.setItem("yalla_admin_session_expires_at", String(Date.now() + 3600000));
      localStorage.setItem("yalla_admin_session_identity", "fixture-session");
    }
  });
}

test("temporary startup network failure keeps the authenticated dashboard and saved credentials", async ({ context, page }) => {
  await savedSession(context);
  await context.route("**/api/v1/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/auth/me/")) await route.abort("failed");
    else await route.fulfill({ json: fixtureData(new URL(route.request().url()).pathname) });
  });
  await page.goto("/dashboard");
  await expect(page.getByText("Fixture Admin", { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await context.cookies()).find((cookie) => cookie.name === "yalla_refresh_token")?.value).toBe("fixture-refresh");
});

test("two tabs renew one rotating refresh token without logging each other out", async ({ context, page }) => {
  await savedSession(context, true);
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => { release = resolve; });
  let refreshRequests = 0;
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/refresh/")) {
      refreshRequests++;
      await responseReady;
      await route.fulfill({ json: { accessToken: accessToken(Math.floor(Date.now() / 1000) + 3600), refreshToken: "fixture-rotated" } });
    } else await route.fulfill({ json: fixtureData(path) });
  });
  await page.goto("/dashboard");
  await expect.poll(() => refreshRequests).toBe(1);
  const second = await context.newPage();
  await second.goto("/dashboard");
  await expect.poll(() => second.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBeGreaterThan(0);
  release();
  for (const tab of [page, second]) {
    await expect(tab.getByText("Fixture Admin", { exact: true }).first()).toBeVisible();
    await expect(tab).toHaveURL(/\/dashboard$/);
  }
  expect(refreshRequests).toBe(1);
  expect((await context.cookies()).find((cookie) => cookie.name === "yalla_refresh_token")?.value).toBe("fixture-rotated");
});

test("admin orders fetch the selected history page and keep server totals", async ({ context, page }) => {
  await savedSession(context);
  const requestedPages: string[] = [];
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = fixtureData(url.pathname);
    if (url.pathname === "/api/v1/orders/") {
      const current = url.searchParams.get("page") ?? "1";
      requestedPages.push(current);
      expect(url.searchParams.get("page_size")).toBe("10");
      data = { count: 20, metrics: { total: 20, assignmentReady: 0, assigned: 0, delivered: 20 },
        results: [{ id: current === "1" ? 1 : 11, order_number: current === "1" ? "YM-fixture-1" : "YM-fixture-11", status: "delivered", customer: { id: 7, name: "Test Customer" }, items: [], market_sections: [] }] };
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/orders");
  await expect(page.getByText("YM-fixture-1", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "الصفحة التالية", exact: true }).click();
  await expect(page.getByText("YM-fixture-11", { exact: true })).toBeVisible();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  expect(requestedPages).toContain("1");
  expect(requestedPages).toContain("2");
  await expect(page.getByRole("button", { name: "الصفحة التالية", exact: true })).toBeDisabled();
});

test("order details breadcrumb identifies the actual route instead of a sample order", async ({ context, page }) => {
  await savedSession(context);
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path === "/api/v1/orders/6/"
      ? { id: 6, order_number: "YM-20261002-000006", status: "confirmed", items: [], market_sections: [] }
      : fixtureData(path);
    await route.fulfill({ json: data });
  });
  await page.goto("/orders/view/6");
  const breadcrumbs = page.getByRole("navigation", { name: "مسار الصفحة", exact: true });
  await expect(breadcrumbs.getByText("تفاصيل الطلب #6", { exact: true })).toBeVisible();
  await expect(breadcrumbs.getByRole("link", { name: "الطلبات", exact: true })).toHaveAttribute("href", "/orders");
  await expect(breadcrumbs).not.toContainText("ORD-20260518-QYT6Y0");
});
