import { expect, test, type Page } from "@playwright/test";
import { mediaSpecs } from "../lib/media-specs";

const user = { id: "1", first_name: "Media", last_name: "Test", email: "media@example.test", phone: "", role: "admin" };
const contract = { version: 1, images: Object.fromEntries(Object.entries(mediaSpecs).map(([key, spec]) => [key, {
  ...spec, ratioRequired: spec.ratioRequired ?? spec.fit === "cover", maxBytes: 5 * 1024 * 1024,
  contentTypes: ["image/jpeg", "image/png", "image/webp"],
}])), video: { maxBytes: 30 * 1024 * 1024, maxSeconds: 30, outputMaxBytes: 15 * 1024 * 1024 } };
const published = {
  onboarding_one_url: null, onboarding_two_url: null, onboarding_three_url: null,
  market_login_url: "https://media.example.test/old.mp4", market_login_poster_url: "https://media.example.test/poster.svg",
  delivery_login_url: null, market_login_focus: { x: 0.5, y: 0 }, delivery_login_focus: { x: 0.5, y: 0 },
};

async function session(page: Page) {
  const token = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
  await page.context().addCookies([
    { name: "yalla_access_token", value: token, url: "http://127.0.0.1:3000" },
    { name: "yalla_refresh_token", value: "media-test-refresh", url: "http://127.0.0.1:3000" },
    { name: "yalla_auth_user", value: encodeURIComponent(JSON.stringify(user)), url: "http://127.0.0.1:3000" },
    { name: "yalla_remember", value: "true", url: "http://127.0.0.1:3000" },
  ]);
  await page.addInitScript(() => localStorage.setItem("yalla_admin_session_expires_at", String(Date.now() + 3600000)));
  await page.route("https://media.example.test/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="#ff8a00"/></svg>' }));
}

test("store cover stays complete without crop controls at phone and desktop widths", async ({ page }) => {
  await session(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = contract;
    else if (path.endsWith("/market-classifications/")) data = [{ id: 1, name: "صيدليات" }];
    else if (path.endsWith("/market-types/")) data = [{ id: 1, classification_id: 1, name_ar: "صيدلية", is_active: true }];
    await route.fulfill({ json: data });
  });
  await page.goto("/items/shops");
  await page.getByRole("button", { name: "إضافة محل", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 900;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#00a5c9"; ctx.fillRect(0, 0, 1600, 900);
    ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 100, 900);
    ctx.fillStyle = "#ffff00"; ctx.fillRect(1500, 0, 100, 900);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await dialog.locator('input[type="file"]').nth(1).setInputFiles({
    name: "cover.png", mimeType: "image/png", buffer: Buffer.from(image, "base64"),
  });
  const preview = dialog.getByAltText("معاينة غلاف المحل");
  await expect(preview).toBeVisible();
  await expect(dialog.locator('input[type="range"]')).toHaveCount(0);
  await expect(dialog.getByText("موضع القص:", { exact: false })).toHaveCount(0);
  for (const width of [320, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(preview).toHaveCSS("object-fit", "contain");
    const dimensions = await preview.evaluate((element) => {
      const image = element as HTMLImageElement;
      return { width: image.naturalWidth, height: image.naturalHeight, bounds: image.getBoundingClientRect().toJSON() };
    });
    expect(dimensions.width / dimensions.height).toBeCloseTo(16 / 9);
    expect(dimensions.bounds.width / dimensions.bounds.height).toBeCloseTo(16 / 9, 1);
    await preview.screenshot({ path: `test-results/store-cover-${width}.png` });
  }
});

test("video replacement keeps published media until preparation is ready and publication succeeds", async ({ page }) => {
  await session(page);
  let polls = 0;
  const patches: string[] = [];
  let attached = false;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    let status = 200;
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = contract;
    else if (path.endsWith("/media-jobs/stats/")) data = { counts: { pending: 0, processing: 0, ready: 0, failed: 0 }, stalled: 0 };
    else if (path.endsWith("/app-media/")) {
      if (route.request().method() === "PATCH") { patches.push(route.request().postData() ?? ""); attached = true; }
      data = { ...published, market_login_url: attached ? "https://media.example.test/new.mp4" : published.market_login_url };
    } else if (path.includes("/media-jobs/")) {
      const create = route.request().method() === "POST";
      const ready = !create && ++polls >= 3;
      data = { id: "99999999-1111-4111-8111-111111111111", state: ready ? "ready" : "processing", slot: "market_login", retryable: false, error: "", created_at: new Date().toISOString(), video_url: ready ? "https://media.example.test/new.mp4" : null, poster_url: ready ? published.market_login_poster_url : null };
      status = create ? 202 : 200;
    }
    await route.fulfill({ status, json: data });
  });
  await page.goto("/app-media");
  const input = page.locator('input[type="file"][accept*="video/mp4"]');
  await expect(input).toHaveCount(1);
  // Only the HTTP lifecycle is mocked here; backend tests decode real MP4 files.
  await input.setInputFiles({ name: "intro.mp4", mimeType: "video/mp4", buffer: Buffer.from("browser-upload-fixture") });
  const publish = page.getByRole("button", { name: "نشر الفيديو الجاهز" });
  await expect(publish).toBeDisabled();
  expect(patches).toHaveLength(0);
  await expect(page.locator(`video[src="${published.market_login_url}"]`)).toHaveCount(1);
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.locator('video[src="https://media.example.test/new.mp4"]')).toHaveCount(1);
  expect(patches).toHaveLength(1);
  expect(patches[0]).toContain("video_job_id");
  expect(patches[0]).toContain("99999999-1111-4111-8111-111111111111");
  expect(patches[0]).not.toContain("browser-upload-fixture");
});

test("image preview shows all four crop widths before uploading the original", async ({ page }) => {
  await session(page);
  const patches: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") patches.push(route.request().postData() ?? "");
    const data = path.endsWith("/auth/me/") ? user : path.endsWith("/media-specs/") ? contract
      : path.endsWith("/app-media/") ? published : path.endsWith("/media-jobs/stats/") ? { counts: {}, stalled: 0 } : [];
    await route.fulfill({ json: data });
  });
  await page.goto("/app-media");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 800;
    const ctx = canvas.getContext("2d")!; ctx.fillStyle = "#ff8a00"; ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(256, 160, 768, 480);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator('input[type="file"][accept*="video/mp4"]').setInputFiles({ name: "original.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  const publish = page.getByRole("button", { name: "نشر الصورة بعد المعاينة" });
  await expect(publish).toBeVisible();
  for (const width of [320, 390, 430, 768]) await expect(page.getByText(`${width}px`, { exact: true })).toBeVisible();
  expect(patches).toHaveLength(0);
  await page.screenshot({ path: "test-results/media-crop-preview.png", fullPage: true });
  await publish.click();
  await expect(publish).toHaveCount(0);
  expect(patches[0]).toContain('filename="original.png"');
  expect(patches[0]).toContain("market_login_focus");
});

test("small images with any ratio can be previewed and published with only a tiny size hint", async ({ page }) => {
  await session(page);
  const patches: string[] = [];
  const legacyContract = { ...contract, images: Object.fromEntries(Object.entries(contract.images).map(([key, spec]) => [key, {
    ...spec, minimumWidth: 1200, minimumHeight: 675, ratioRequired: true,
  }])) };
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/app-media/") && route.request().method() === "PATCH") patches.push(route.request().postData() ?? "");
    const data = path.endsWith("/auth/me/") ? user : path.endsWith("/media-specs/") ? legacyContract
      : path.endsWith("/app-media/") ? published : path.endsWith("/media-jobs/stats/") ? { counts: {}, stalled: 0 } : [];
    await route.fulfill({ json: data });
  });
  await page.goto("/app-media");
  const hint = page.getByText("المقاس المقترح: 1600×1000px", { exact: true }).first();
  await expect(hint).toHaveCSS("font-size", "10px");
  await expect(page.getByText("الحد الأدنى", { exact: false })).toHaveCount(0);
  await expect(page.getByText("نسبة مطلوبة", { exact: false })).toHaveCount(0);
  for (const [width, height] of [[1, 1], [32, 96], [96, 32]]) {
    const image = await page.evaluate(({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#00a5c9"; ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { width, height });
    const name = `small-${width}x${height}.png`;
    await page.locator('input[type="file"][accept*="video/mp4"]').setInputFiles({ name, mimeType: "image/png", buffer: Buffer.from(image, "base64") });
    const publish = page.getByRole("button", { name: "نشر الصورة بعد المعاينة" });
    await expect(publish).toBeVisible();
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    if (width === 32) await page.screenshot({ path: "test-results/small-image-upload.png", fullPage: true });
    await publish.click();
    await expect(publish).toHaveCount(0);
    expect(patches.at(-1)).toContain(`filename="${name}"`);
  }
  expect(patches).toHaveLength(3);
});

test("switching campaign media type cancels the obsolete video and saves without attaching it", async ({ page }) => {
  await session(page);
  let cancellations = 0;
  let mediaUploads = 0;
  let savedType = "";
  const job = { id: "99999999-1111-4111-8111-111111111111", state: "processing", slot: "campaign", retryable: false, error: "", created_at: new Date().toISOString(), video_url: null, poster_url: null };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    let status = 200;
    if (path.endsWith("/auth/me/")) data = user;
    else if (path.endsWith("/media-specs/")) data = contract;
    else if (path.includes("/media-jobs/")) {
      if (request.method() === "DELETE") { cancellations++; await route.fulfill({ status: 204 }); return; }
      data = job; status = request.method() === "POST" ? 202 : 200;
    } else if (path.endsWith("/home-campaigns/") && request.method() === "POST") {
      savedType = request.postDataJSON().media_type;
      data = { id: 44 };
    } else if (path.endsWith("/media/") && request.method() === "POST") mediaUploads++;
    await route.fulfill({ status, json: data });
  });
  await page.goto("/offers/home-campaigns/create");
  await page.getByLabel("اسم الحملة").fill("Media switch regression");
  const mediaType = page.getByRole("combobox").filter({ hasText: "بدون ميديا" });
  await mediaType.click();
  await page.getByRole("option", { name: "فيديو MP4", exact: true }).click();
  await page.locator('input[type="file"][accept="video/mp4"]').setInputFiles({ name: "obsolete.mp4", mimeType: "video/mp4", buffer: Buffer.from("fixture") });
  await expect(page.getByRole("button", { name: "إلغاء التجهيز", exact: true })).toBeVisible();
  await page.getByRole("combobox").filter({ hasText: "فيديو MP4" }).click();
  await page.getByRole("option", { name: "بدون ميديا", exact: true }).click();
  // Development Strict Mode may also cancel its discarded first effect.
  await expect.poll(() => cancellations).toBeGreaterThanOrEqual(1);
  await page.getByRole("button", { name: "حفظ الحملة", exact: true }).click();
  await expect(page).toHaveURL(/\/offers\/home-campaigns$/);
  expect(savedType).toBe("none");
  expect(mediaUploads).toBe(0);
});
