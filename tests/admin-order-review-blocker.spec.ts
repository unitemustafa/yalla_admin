import { expect, test, type Page } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

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

async function authenticate(page: Page) {
  const token = testJwt();

  await page.context().addCookies([
    {
      name: "yalla_access_token",
      sameSite: "Lax",
      value: token,
      url: baseURL,
    },
    {
      name: "yalla_refresh_token",
      sameSite: "Lax",
      value: "refresh-token",
      url: baseURL,
    },
    {
      name: "yalla_remember",
      sameSite: "Lax",
      value: "true",
      url: baseURL,
    },
  ]);
}

async function openAccount(page: Page, onBlockerRequest: () => Promise<void>) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
    const jsonHeaders = { "content-type": "application/json" };

    if (path === "auth/me") {
      await route.fulfill({
        headers: jsonHeaders,
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

    if (path === "admin/order-review/blocker") {
      await onBlockerRequest();
      await route.fulfill({
        headers: jsonHeaders,
        json: { blocked: false, pending_count: 0, orders: [] },
      });
      return;
    }

    await route.fulfill({ headers: jsonHeaders, json: {} });
  });

  await authenticate(page);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "الحساب" })).toBeVisible();
}

test("refreshes the admin order-review blocker on its schedule, order events, and tab return", async ({
  page,
}) => {
  let blockerRequests = 0;

  await page.clock.install();
  await openAccount(page, async () => {
    blockerRequests += 1;
  });

  await page.clock.runFor(0);
  await expect.poll(() => blockerRequests).toBe(1);

  await page.clock.fastForward(179_999);
  expect(blockerRequests).toBe(1);

  await page.clock.fastForward(1);
  await expect.poll(() => blockerRequests).toBe(2);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dashboard-orders:changed"));
  });
  await expect.poll(() => blockerRequests).toBe(3);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => blockerRequests).toBe(4);
});

test("does not overlap blocker refreshes while a request is in flight", async ({ page }) => {
  let blockerRequests = 0;
  let firstRequestCompleted = false;
  let releaseFirstRequest: (() => void) | null = null;
  const firstRequest = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });

  await page.clock.install();
  await openAccount(page, async () => {
    blockerRequests += 1;
    if (blockerRequests === 1) {
      await firstRequest;
      firstRequestCompleted = true;
    }
  });

  await page.clock.runFor(0);
  await expect.poll(() => blockerRequests).toBe(1);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("dashboard-orders:changed"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(180_000);
  expect(blockerRequests).toBe(1);

  releaseFirstRequest?.();
  await expect.poll(() => firstRequestCompleted).toBe(true);
});
