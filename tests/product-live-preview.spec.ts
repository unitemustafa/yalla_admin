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

async function mockProductCatalog(page: Page) {
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

    if (path === "home/markets") {
      await route.fulfill({
        headers: jsonHeaders,
        json: [
          {
            id: 1,
            name: "محل الاختبار",
            branch: "فرع أول",
            status: "active",
            scope: "general",
            service_cities: [],
          },
        ],
      });
      return;
    }

    if (path === "catalog/product-additions") {
      await route.fulfill({
        headers: jsonHeaders,
        json: [
          { id: 7, name_ar: "جبنة", price: "15.00" },
          { id: 8, name_ar: "صوص", price: "5.00" },
        ],
      });
      return;
    }

    await route.fulfill({ headers: jsonHeaders, json: [] });
  });
}

async function selectOption(page: Page, attributeName: string, index: number, optionName: string) {
  await page.getByRole("combobox", { name: attributeName }).nth(index).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

test("product form live preview uses theme attributes without category or SKU", async ({
  page,
}) => {
  await mockProductCatalog(page);
  await authenticate(page);
  await page.goto("/items/add");

  const preview = page.getByTestId("product-live-preview");

  await page.getByRole("button", { name: /ملابس/ }).click();

  await expect(preview).toContainText("محل الاختبار");
  await expect(preview).not.toContainText("الاختيار المحدد");
  await expect(preview).not.toContainText("SKU");
  await expect(page.getByText("الفئة")).toHaveCount(0);

  await page.getByTestId("product-name-input").fill("قميص الاختبار");
  await page.getByTestId("product-description-input").fill("وصف سريع للمعاينة");
  await page.getByTestId("product-discount-input").fill("20");
  await page.getByTestId("variant-price-0").fill("800");
  await selectOption(page, "اللون", 0, "أسود");
  await selectOption(page, "المقاس", 0, "متوسط");
  await selectOption(page, "النوع", 0, "رجالي");

  await page.getByRole("button", { name: /إضافة متغير/ }).click();
  await page.getByTestId("variant-price-1").fill("900");
  await selectOption(page, "اللون", 1, "أحمر");
  await selectOption(page, "المقاس", 1, "كبير");
  await selectOption(page, "النوع", 1, "رجالي");
  await page.getByRole("button", { name: /اختيار الإضافات/ }).click();
  await page.getByRole("button", { name: /جبنة/ }).click();
  await page.getByRole("button", { name: "موافق" }).click();

  await expect(preview.getByTestId("preview-name")).toContainText("قميص الاختبار");
  await expect(preview.getByTestId("preview-description")).toContainText(
    "وصف سريع للمعاينة",
  );
  await expect(preview).toContainText("متاح");
  await expect(preview.getByTestId("preview-price")).toContainText(/800.*900/);
  await expect(preview.getByTestId("preview-price")).not.toContainText("~");
  await expect(page.getByText("SKU")).toHaveCount(0);
  await expect(preview.locator('span[style*="background-color"]').first()).toBeVisible();
  await preview.getByRole("button", { name: "أسود", exact: true }).click();
  await preview.getByRole("button", { name: "متوسط", exact: true }).click();
  await preview.getByRole("button", { name: "رجالي", exact: true }).click();
  await expect(preview.getByTestId("preview-price")).toContainText("800");
  await expect(preview).toContainText("EGP 1000");
  await expect(preview.getByTestId("preview-discount")).toContainText("20%");
  await expect(preview).not.toContainText("جبنة");
  await preview.getByRole("button", { name: /الإضافات/ }).click();
  await page.getByRole("button", { name: /جبنة/ }).click();
  await page.getByRole("button", { name: "موافق" }).click();
  await expect(preview).toContainText("جبنة");
  await expect(preview).not.toContainText("صوص");
  await expect(preview).not.toContainText("SKU");

  await preview.getByRole("button", { name: "أحمر", exact: true }).click();
  await preview.getByRole("button", { name: "كبير", exact: true }).click();
  await expect(preview.getByTestId("preview-price")).toContainText("900");

  await page.getByRole("switch").first().click();
  await expect(preview).toContainText("غير متاح");

  await page.getByRole("switch").nth(1).click();
  await expect(preview).toContainText("منتج شائع");

  await page.locator('input[type="file"]').setInputFiles({
    name: "product.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(preview.locator('img[alt="قميص الاختبار"]')).toHaveCount(1);
  await expect(preview.locator('img[src*="default-user-avatar"]')).toHaveCount(0);

  await page.getByTestId("product-discount-input").fill("0");
  await expect(preview.getByTestId("preview-discount")).toHaveCount(0);

  await page.getByTestId("variant-price-0").fill("");
  await page.getByTestId("variant-price-1").fill("");
  await expect(preview).toContainText("أدخل سعر المنتج");
});
