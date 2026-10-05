import { expect, test, type Page } from "@playwright/test";
import { mediaSpecs } from "../lib/media-specs";

async function setup(page: Page) {
  const user = { id: "1", first_name: "Offer", last_name: "Test", email: "offer@example.test", role: "admin" };
  const token = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.context().addCookies([
    { name: "yalla_access_token", value: token, url: "http://127.0.0.1:3000" },
    { name: "yalla_refresh_token", value: "offer-test-refresh", url: "http://127.0.0.1:3000" },
    { name: "yalla_auth_user", value: encodeURIComponent(JSON.stringify(user)), url: "http://127.0.0.1:3000" },
    { name: "yalla_remember", value: "true", url: "http://127.0.0.1:3000" },
  ]);
  await page.addInitScript(() => localStorage.setItem("yalla_admin_session_expires_at", String(Date.now() + 3600000)));
  const offer = { id: 7, title: "إعلان الاختبار", type: "announcement", discount: "0", status: "active", show_in_general: true,
    image: "https://offer.example.test/banner.svg", image_focus: { x: 0.2, y: 0.8 },
    start_time: new Date(Date.now() - 3600000).toISOString(), end_time: new Date(Date.now() + 90061000).toISOString(),
    announcement_url: "https://example.com/offer", announcement_cta_label: "جرّب الآن" };
  const saved: Record<string, unknown>[] = [];
  const uploads: string[] = [];
  await page.route("https://offer.example.test/**", (route) => route.fulfill({ contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#177ca1"/><circle cx="900" cy="300" r="250" fill="#ffae37"/></svg>' }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = { version: 1, images: Object.fromEntries(Object.entries(mediaSpecs).map(([key, spec]) => [key, {
      ...spec, ratioRequired: false, maxBytes: 5 * 1024 * 1024, contentTypes: ["image/jpeg", "image/png", "image/webp"],
    }])), video: { maxBytes: 30 * 1024 * 1024, maxSeconds: 30, outputMaxBytes: 15 * 1024 * 1024 } };
    else if (path.endsWith("/offers/7/image/")) { uploads.push(request.postData() ?? ""); data = offer; }
    else if (path.endsWith("/offers/7/")) {
      if (request.method() === "PATCH") saved.push(request.postDataJSON());
      data = offer;
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/offers/create?edit=7");
  const open = page.getByRole("button", { name: "🎯 معاينة البانر وضبط العرض", exact: true });
  await expect(open).toBeVisible();
  return { open, saved, uploads };
}

test("published offer preview preserves cancelled focus and saves applied focus", async ({ page }) => {
  const { open, saved } = await setup(page);
  await expect(page.getByText("زر العرض", { exact: true })).toHaveCount(0);
  await open.click();
  const dialog = page.getByRole("dialog", { name: "معاينة وضبط بانر العرض الترويجي" });
  const x = dialog.getByRole("slider", { name: "محاذاة أفقية" });
  const y = dialog.getByRole("slider", { name: "محاذاة رأسية" });
  await expect(x).toHaveValue("0.2");
  await expect(y).toHaveValue("0.8");
  await expect(dialog.getByTestId("offer-cta")).toHaveText("جرّب الآن");
  await expect(dialog.getByTestId("offer-countdown")).toBeVisible();
  for (const width of [320, 360, 390, 430]) {
    await dialog.getByRole("button", { name: `${width}px`, exact: true }).click();
    await expect(dialog.getByTestId("offer-phone")).toHaveCSS("width", `${width + 10}px`);
    const phone = await dialog.getByTestId("offer-phone").boundingBox();
    expect(phone!.width).toBe(width + 10);
    const banner = await dialog.getByTestId("offer-banner").boundingBox();
    const safe = await dialog.getByTestId("offer-safe-zone").boundingBox();
    expect(banner!.width / banner!.height).toBeCloseTo(8 / 3, 2);
    expect(safe!.width / banner!.width).toBeCloseTo(0.75, 2);
    expect(safe!.height / banner!.height).toBeCloseTo(0.75, 2);
  }
  await x.press("End");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await open.click();
  await expect(x).toHaveValue("0.2");
  const banner = await dialog.getByTestId("offer-banner").boundingBox();
  await page.mouse.move(banner!.x + banner!.width * 0.25, banner!.y + banner!.height * 0.75);
  await page.mouse.down();
  await page.mouse.up();
  await expect(x).toHaveValue("0.25");
  await expect(y).toHaveValue("0.75");
  await expect(dialog.getByAltText("معاينة بانر العرض")).toHaveCSS("object-position", "25% 75%");
  await dialog.getByRole("button", { name: "اعتماد المظهر", exact: true }).click();
  await open.click();
  await expect(x).toHaveValue("0.25");
  await page.setViewportSize({ width: 360, height: 900 });
  await dialog.getByRole("button", { name: "ليل 🌙", exact: true }).click();
  await expect(dialog.getByTestId("offer-phone")).toHaveCSS("background-color", "rgb(17, 24, 39)");
  await expect.poll(async () => {
    const phone = await dialog.getByTestId("offer-phone").boundingBox();
    return phone!.x >= 0 && phone!.x + phone!.width <= 360;
  }).toBe(true);
  await dialog.screenshot({ path: "test-results/offer-preview-mobile.png" });
  await dialog.getByRole("button", { name: "إغلاق", exact: true }).last().click();
  await page.getByRole("button", { name: "حفظ التعديل", exact: true }).click();
  await expect.poll(() => saved.length).toBe(1);
  expect(saved[0].image_focus).toEqual({ x: 0.25, y: 0.75 });
});

test("new image opens preview automatically and uploads focus with the image", async ({ page }) => {
  const { open, saved, uploads } = await setup(page);
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 600;
    const context = canvas.getContext("2d")!; context.fillStyle = "#ed8c16"; context.fillRect(0, 0, 1600, 600);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "new-banner.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") });
  const dialog = page.getByRole("dialog", { name: "معاينة وضبط بانر العرض الترويجي" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("slider", { name: "محاذاة أفقية" })).toHaveValue("0.5");
  await dialog.getByRole("button", { name: "أعلى اليمين", exact: true }).click();
  await dialog.getByRole("button", { name: "اعتماد المظهر", exact: true }).click();
  await open.click();
  await expect(dialog.getByRole("slider", { name: "محاذاة أفقية" })).toHaveValue("1");
  await expect(dialog.getByRole("slider", { name: "محاذاة رأسية" })).toHaveValue("0");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "حفظ التعديل", exact: true }).click();
  await expect.poll(() => uploads.length).toBe(1);
  expect(saved[0]).not.toHaveProperty("image_focus");
  expect(uploads[0]).toContain('name="image_focus"');
  expect(uploads[0]).toContain('{"x":1,"y":0}');
  expect(uploads[0]).toContain('filename="new-banner.png"');
});
