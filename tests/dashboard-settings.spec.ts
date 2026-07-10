import { expect, test, type Page } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";
const sessionExpiryKey = "yalla_admin_session_expires_at";

function jwt() {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
}

async function authenticate(page: Page) {
  await page.context().addCookies([
    { name: "yalla_access_token", value: jwt(), sameSite: "Lax", url: baseURL },
    { name: "yalla_refresh_token", value: "refresh", sameSite: "Lax", url: baseURL },
    { name: "yalla_remember", value: "true", sameSite: "Lax", url: baseURL },
  ]);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, String(value)),
    [sessionExpiryKey, Date.now() + 3600_000],
  );
}

test("saved dashboard branding updates sidebar, branch dropdown, and persisted settings", async ({ page }) => {
  const settings = {
    primary_color: "#16794f",
    subtle_color: "#e8f7ef",
    accent_color: "#23695c",
    font_family: "Cairo",
    brand_name: "Server Brand",
    brand_tagline: "Server Tagline",
    logo_url: null,
  };
  await authenticate(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
    const headers = { "content-type": "application/json" };
    if (path === "auth/me") {
      await route.fulfill({ headers, json: { id: "1", first_name: "Admin", last_name: "User", email: "admin@example.com", phone: "01000000000", role: "admin" } });
      return;
    }
    if (path === "dashboard/settings") {
      if (route.request().method() === "PATCH") Object.assign(settings, route.request().postDataJSON());
      await route.fulfill({ headers, json: settings });
      return;
    }
    await route.fulfill({ headers, json: [] });
  });

  await page.goto("/settings");
  await expect(page.getByTestId("sidebar-brand-name")).toHaveText("Server Brand");
  await page.getByTestId("dashboard-brand-name-input").fill("Saved Brand");
  await page.getByTestId("dashboard-brand-tagline-input").fill("Saved Tagline");
  await page.getByTestId("save-dashboard-settings").click();

  await expect(page.getByTestId("sidebar-brand-name")).toHaveText("Saved Brand");
  await expect(page.getByTestId("sidebar-branch-name")).toHaveText("Saved Tagline");
  await page.getByTestId("sidebar-branch-toggle").click();
  await expect(page.getByTestId("sidebar-branch-dropdown")).toContainText("Saved Tagline");
  await page.reload();
  await expect(page.getByTestId("sidebar-brand-name")).toHaveText("Saved Brand");
  await expect(page.getByTestId("sidebar-branch-name")).toHaveText("Saved Tagline");
});
