import { test, expect } from "@playwright/test";
test("Production use cache: Draft data bypasses cache without contaminating anonymous results", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4180/cached");
  await expect(page.locator("[data-total]")).toHaveText("42");
  const original = await page.locator("[data-render]").textContent();
  await page.waitForFunction(() => typeof window.test === "function");
  const navigation = page.waitForResponse(
    (response) =>
      response.url() === "http://127.0.0.1:4180/cached" &&
      response.request().isNavigationRequest(),
  );
  await page.evaluate(() => test.mock("/api/cart", { total: 7.77 }));
  await expect(page.locator("[data-total]")).toHaveText("7.77", {
    timeout: 15000,
  });
  const html = await navigation;
  expect(await html.text()).toContain('data-total="true">7.77</strong>');
  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto("http://127.0.0.1:4180/cached");
    await expect(visitor.locator("[data-total]")).toHaveText("42");
    await expect(visitor.locator("[data-render]")).toHaveText(original);
  } finally {
    await other.close();
  }
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.clear());
  await expect(page.locator("[data-render]")).toHaveText(original);
  expect(errors).toEqual([]);
});
