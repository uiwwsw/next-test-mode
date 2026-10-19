import { test, expect } from "@playwright/test";
for (const mode of ["csr", "ssr", "isr", "ssg"]) {
  test(`${mode.toUpperCase()} demo uses real data, Console overrides and an independent visitor`, async ({
    page,
    browser,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${mode}`);
    await expect(page.locator("[data-demo-total]")).toHaveText("42");
    await expect(
      page.getByRole("button", { name: "적용하고 화면 확인" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "원래 응답", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "적용하고 화면 확인" }),
    ).toBeEnabled();
    const navigation = page.waitForResponse(
      (response) =>
        response.request().isNavigationRequest() &&
        response.url().endsWith("/" + mode),
    );
    await page.getByRole("button", { name: "적용하고 화면 확인" }).click();
    await expect(page.locator("[data-demo-total]")).toHaveText("9.99", {
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: "적용하고 화면 확인" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "적용하고 화면 확인" }).click();
    await expect(
      page.getByRole("button", { name: "적용하고 화면 확인" }),
    ).toBeEnabled();
    const html = await navigation;
    if (mode !== "csr")
      expect(await html.text()).toContain(
        'data-demo-total="true">9.99</strong>',
      );
    const other = await browser.newContext();
    try {
      const visitor = await other.newPage();
      await visitor.goto(`http://127.0.0.1:4177/${mode}`);
      await expect(visitor.locator("[data-demo-total]")).toHaveText("42");
    } finally {
      await other.close();
    }
    await page.waitForFunction(() => typeof window.test === "function");
    await page.evaluate(() =>
      window.test.mock(
        "/api/cart.json",
        { message: "Try again" },
        { status: 503 },
      ),
    );
    await expect(page.getByText("HTTP 503", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "원래 응답", exact: true }).click();
    await expect(page.locator("[data-demo-total]")).toHaveText("42");
    expect(errors).toEqual([]);
  });
}
test("mobile editor, keyboard apply and invalid JSON keep the demo usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ssg");
  await expect(page.locator("#json-input")).toBeEnabled();
  await page.locator("#json-input").fill("{bad");
  await page.getByRole("button", { name: "적용하고 화면 확인" }).click();
  await expect(page.locator('.error[role="alert"]')).toBeVisible();
  await expect(page.locator("[data-demo-total]")).toHaveText("42");
  await page.locator("#json-input").fill('{"total":3.14}');
  await page.locator("#json-input").press("Control+Enter");
  await expect(page.locator("[data-demo-total]")).toHaveText("3.14");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("demo can bypass server caches without mock data and restore the static result", async ({
  page,
}) => {
  await page.goto("/ssg");
  await expect(
    page.getByRole("button", { name: "서버 캐시 우회", exact: true }),
  ).toBeEnabled();
  const original = await page.locator("[data-rendered-at]").textContent();
  await page
    .getByRole("button", { name: "서버 캐시 우회", exact: true })
    .click();
  await expect(page.locator("[data-rendered-at]")).not.toHaveText(original);
  await expect(page.locator("[data-cache-status]")).toContainText(
    "우회하는 중",
  );
  await expect(page.locator("[data-demo-total]")).toHaveText("42");
  const preview = await page.locator("[data-rendered-at]").textContent();
  await page.getByRole("button", { name: "다시 렌더", exact: true }).click();
  await expect(page.locator("[data-rendered-at]")).not.toHaveText(preview);
  await page.getByRole("button", { name: "원래 응답", exact: true }).click();
  await expect(page.locator("[data-rendered-at]")).toHaveText(original);
  await expect(page.locator("[data-cache-status]")).toContainText(
    "기본 캐시 경로",
  );
});

for (const locale of ['ko', 'en']) {
  test(`${locale} pages expose localized server HTML and reciprocal search metadata`, async ({ request }) => {
    for (const path of ['', '/csr', '/ssr', '/isr', '/ssg']) {
      const prefix = locale === 'en' ? '/en' : '';
      const response = await request.get(`${prefix}${path || '/'}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(locale === 'en' ? 'Test server data, too.' : '서버 데이터까지 테스트.');
      expect(html).toContain(`rel="canonical" href="https://test-mode-tau.vercel.app${prefix}${path}"`);
      expect(html).toContain(`hrefLang="ko" href="https://test-mode-tau.vercel.app${path}"`);
      expect(html).toContain(`hrefLang="en" href="https://test-mode-tau.vercel.app/en${path}"`);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('application/ld+json');
    }
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain('https://test-mode-tau.vercel.app/en/ssr');
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Sitemap: https://test-mode-tau.vercel.app/sitemap.xml');
  });
}

test('English console values reach static and server HTML and language navigation works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/en/ssg');
  await expect(page.locator('#json-input')).toBeEnabled();
  await page.evaluate(() => window.test.patch('/api/cart.json', { total: 7.25 }));
  await expect(page.locator('[data-demo-total]')).toHaveText('7.25');
  await page.getByRole('link', { name: 'SSR Server' }).click();
  await expect(page).toHaveURL(/\/en\/ssr$/);
  await expect(page.locator('[data-demo-total]')).toHaveText('7.25');
  await expect(page.getByRole('heading', { name: 'Result rendered into server HTML' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: '한국어', exact: true }).click();
  await expect(page).toHaveURL(/\/ssr$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('[data-demo-total]')).toHaveText('7.25');
});
