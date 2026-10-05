import { expect, test } from "@playwright/test";
import { mediaSpecs } from "../lib/media-specs";
import { presets } from "../features/dashboard/home-campaigns/domain";

test("legacy campaign edits use the fixed centered Hero layout without layout selectors", async ({ page }) => {
  const user = { id: "1", first_name: "Campaign", last_name: "Test", email: "campaign@example.test", phone: "", role: "admin" };
  const token = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.context().addCookies([
    { name: "yalla_access_token", value: token, url: "http://127.0.0.1:3000" },
    { name: "yalla_refresh_token", value: "campaign-test-refresh", url: "http://127.0.0.1:3000" },
    { name: "yalla_auth_user", value: encodeURIComponent(JSON.stringify(user)), url: "http://127.0.0.1:3000" },
    { name: "yalla_remember", value: "true", url: "http://127.0.0.1:3000" },
  ]);
  await page.addInitScript(() => localStorage.setItem("yalla_admin_session_expires_at", String(Date.now() + 3600000)));
  const saved: Record<string, unknown>[] = [];
  const contract = { version: 1, images: Object.fromEntries(Object.entries(mediaSpecs).map(([key, spec]) => [key, {
    ...spec, ratioRequired: spec.ratioRequired ?? spec.fit === "cover", maxBytes: 5 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
  }])), video: { maxBytes: 30 * 1024 * 1024, maxSeconds: 30, outputMaxBytes: 15 * 1024 * 1024 } };
  const campaign = {
    id: 7, internal_name: "Legacy campaign", title: "انسخ الكود واستخدمه", description: "اضغط الزر لنسخ الكود فورًا.",
    start_time: new Date().toISOString(), end_time: new Date(Date.now() + 86400000).toISOString(),
    template: "split", sheet_size: "near_full", content_alignment: "start", show_in_general: true,
    media_type: "image", sheet_image: "https://campaign.example.test/image.svg", additional_images: [],
    action_type: "copy_text", cta_label: "انسخ الكود", copy_text: "SAVE",
  };
  await page.route("https://campaign.example.test/**", (route) => route.fulfill({
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#ff8a00"/></svg>',
  }));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = contract;
    else if (path.endsWith("/home-campaigns/7/")) {
      if (request.method() === "PATCH") saved.push(request.postDataJSON());
      data = campaign;
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/offers/home-campaigns/create?edit=7");
  await expect(page.getByRole("heading", { name: "تعديل الحملة الإعلانية", exact: true })).toBeVisible();
  for (const label of ["القالب", "حجم النافذة", "محاذاة النص"]) await expect(page.getByText(label, { exact: true })).toHaveCount(0);
  const preview = page.getByRole("region", { name: "معاينة الحملة الإعلانية" });
  const title = preview.getByRole("heading", { name: campaign.title });
  const image = preview.getByAltText("معاينة ميديا الحملة");
  await expect(title).toHaveCSS("text-align", "center");
  await expect(image).toBeVisible();
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await preview.screenshot({ path: `test-results/campaign-layout-${width}.png` });
    const mediaBox = await image.boundingBox();
    const titleBox = await title.boundingBox();
    expect(mediaBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(titleBox!.y).toBeGreaterThanOrEqual(mediaBox!.y + mediaBox!.height);
    expect(mediaBox!.width / mediaBox!.height).toBeCloseTo(16 / 9, 1);
    const closeBox = await preview.getByLabel("إغلاق").boundingBox();
    expect(closeBox!.x).toBeGreaterThanOrEqual(mediaBox!.x);
    expect(closeBox!.y).toBeGreaterThanOrEqual(mediaBox!.y);
    expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(mediaBox!.x + mediaBox!.width);
    expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(mediaBox!.y + mediaBox!.height);
    const actionBox = await preview.getByRole("button", { name: "انسخ الكود", exact: true }).boundingBox();
    const previewBox = await preview.boundingBox();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(previewBox!.y + previewBox!.height);
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await preview.screenshot({ path: "test-results/campaign-fixed-layout.png" });
  for (const [, preset] of presets) {
    await page.getByLabel("عنوان الإعلان", { exact: true }).fill(preset.title);
    await page.getByRole("textbox", { name: "الوصف", exact: true }).fill(preset.description);
    await expect(preview.getByRole("heading", { name: preset.title, exact: true })).toHaveCSS("font-size", "18px");
    await expect(preview.getByText(preset.description, { exact: true })).toHaveCSS("font-size", "14px");
  }
  const longTitle = "اكتشف أحدث المنتجات والعروض المتاحة لفترة محدودة واستمتع بتجربة تسوق جديدة مع توصيل سريع لحد باب البيت";
  await page.getByLabel("عنوان الإعلان", { exact: true }).fill(longTitle);
  const wrappedTitle = preview.getByRole("heading", { name: longTitle, exact: true });
  await expect(wrappedTitle).toHaveCSS("font-size", "18px");
  const titleLayout = await wrappedTitle.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    contentWidth: element.scrollWidth,
    width: element.clientWidth,
  }));
  expect(titleLayout.height).toBeGreaterThanOrEqual(titleLayout.lineHeight * 3);
  expect(titleLayout.contentWidth).toBeLessThanOrEqual(titleLayout.width);
  await page.getByLabel("عنوان الإعلان", { exact: true }).fill(campaign.title);
  await page.getByRole("textbox", { name: "الوصف", exact: true }).fill(campaign.description);
  await page.getByRole("button", { name: "حفظ الحملة", exact: true }).click();
  await expect(page).toHaveURL(/\/offers\/home-campaigns$/);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ template: "hero", sheet_size: "medium", content_alignment: "center", copy_text: "SAVE" });
});
