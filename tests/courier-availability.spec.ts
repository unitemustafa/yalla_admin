import { expect, test } from "@playwright/test";
import { mediaSpecs } from "../lib/media-specs";

test("shipping company availability is saved without a service city", async ({ page }) => {
  const user = { id: "1", first_name: "Admin", email: "admin@example.test", role: "admin" };
  const token = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.context().addCookies([
    { name: "yalla_access_token", value: token, url: "http://127.0.0.1:3000" },
    { name: "yalla_refresh_token", value: "availability-test-refresh", url: "http://127.0.0.1:3000" },
    { name: "yalla_auth_user", value: encodeURIComponent(JSON.stringify(user)), url: "http://127.0.0.1:3000" },
    { name: "yalla_remember", value: "true", url: "http://127.0.0.1:3000" },
  ]);
  await page.addInitScript(() => localStorage.setItem("yalla_admin_session_expires_at", String(Date.now() + 3600000)));
  const company = {
    id: "7", first_name: "Shipping fixture", role: "representative", is_active: true,
    last_login: "2026-10-05T12:00:00Z",
    courier_profile: { service_city: null, service_city_name: "كل المدن", is_shipping_company: true, is_available: true, max_active_orders: null },
  };
  const changes: boolean[] = [];
  const contract = { version: 1, images: Object.fromEntries(Object.entries(mediaSpecs).map(([key, spec]) => [key, {
    ...spec, ratioRequired: spec.ratioRequired ?? spec.fit === "cover", maxBytes: 5 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  }])), video: { maxBytes: 30 * 1024 * 1024, maxSeconds: 30, outputMaxBytes: 15 * 1024 * 1024 } };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = contract;
    else if (path.endsWith("/auth/representatives/")) data = [company];
    else if (path.endsWith("/orders/")) data = { count: 0, results: [], courier_summary: [] };
    else if (path.endsWith("/auth/users/7/") && request.method() === "PATCH") {
      company.courier_profile.is_available = request.postDataJSON().courier_profile.is_available;
      changes.push(company.courier_profile.is_available);
      data = company;
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/delivery/couriers");
  const companyCard = page.locator("div.rounded-xl.bg-card").filter({ has: page.getByRole("heading", { name: company.first_name, exact: true }) });
  const availability = companyCard.getByRole("switch");
  await expect(availability).toBeEnabled();
  await expect(availability).toBeChecked();
  await availability.click();
  await expect.poll(() => changes).toEqual([false]);
  await expect(availability).not.toBeChecked();
  await availability.click();
  await expect.poll(() => changes).toEqual([false, true]);
  await expect(availability).toBeChecked();
});
