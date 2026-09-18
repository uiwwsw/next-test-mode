import { test, expect } from "@playwright/test";
test("folder scenarios and Console cache controls preserve ordinary static output", async ({
  page,
  browser,
}) => {
  const url = "http://127.0.0.1:4180/ssg";
  await page.goto(url);
  await expect(page.locator("[data-total]")).toHaveText("42");
  const original = await page.locator("[data-render]").textContent();
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  await page.evaluate(() => test.feat.add("/api/cart:folder"));
  await expect(page.locator("[data-total]")).toHaveText("7");
  await expect(page.locator("[data-cart]")).toContainText(
    "NTM_TEST_CATALOG_ONLY_7D621",
  );
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  await page.evaluate(() => {
    void test.cache.restore();
  });
  await expect(page.locator("[data-total]")).toHaveText("42");
  await expect(page.locator("[data-render]")).toHaveText(original);
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  await page.evaluate(() => {
    void test.cache.bypass();
  });
  await expect(page.locator("[data-render]")).not.toHaveText(original);
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  expect(await page.evaluate(() => test.cache.status())).toMatchObject({
    cache: "bypass",
    manualBypass: true,
    draftEnabled: true,
    pendingChanges: false,
  });
  const draftRender = await page.locator("[data-render]").textContent();
  await page.evaluate(() => {
    void test.cache.refresh();
  });
  await expect(page.locator("[data-render]")).not.toHaveText(draftRender);
  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto(url);
    await expect(visitor.locator("[data-render]")).toHaveText(original);
  } finally {
    await other.close();
  }
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  await page.evaluate(() => test.clear());
  await expect(page.locator("[data-render]")).toHaveText(original);
  await page.waitForFunction(
    () => window.test?.cache?.status().phase === "idle",
  );
  expect(await page.evaluate(() => test.cache.status())).toMatchObject({
    cache: "default",
    manualBypass: false,
    draftEnabled: false,
  });
});

test("separate test bootstrap runs before the first application CSR fetch", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      {
        name: "test-mode.entries.ssr",
        value: encodeURIComponent(
          JSON.stringify({
            v: 1,
            entries: [],
            overrides: [
              {
                path: "/api/cart",
                method: "GET",
                mode: "mock",
                data: { total: 73 },
              },
            ],
          }),
        ),
        url: "http://127.0.0.1:4180",
      },
    ]);
  let realRequests = 0;
  await page.route("**/api/cart", (route) => {
    realRequests++;
    return route.fulfill({
      contentType: "application/json",
      body: '{"total":42}',
    });
  });
  await page.goto("http://127.0.0.1:4180/csr");
  await expect(page.locator("[data-csr-total]")).toHaveText("73");
  expect(realRequests).toBe(0);
});
