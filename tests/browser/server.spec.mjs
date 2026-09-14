import { test, expect } from "@playwright/test";

test("console story selection survives the browser-to-SSR cookie handoff and remains isolated per visitor", async ({
  page,
  browser,
}) => {
  await page.goto("http://127.0.0.1:4176");
  await expect(page.locator("[data-ssr-total]")).toHaveText("42");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.story("cart.discount"));
  const html = await page.reload();
  expect(await html.text()).toContain("data-ssr-total>9.99</strong>");
  await expect(page.locator("[data-ssr-total]")).toHaveText("9.99");

  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto("http://127.0.0.1:4176");
    await expect(visitor.locator("[data-ssr-total]")).toHaveText("42");
  } finally {
    await other.close();
  }

  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.story("cart.empty"));
  await page.reload();
  await expect(page.locator("[data-ssr-total]")).toHaveText("0");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.clear());
  await page.reload();
  await expect(page.locator("[data-ssr-total]")).toHaveText("42");
});

test("arbitrary console values affect browser fetch only and never become an SSR payload", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4176");
  await page.waitForFunction(() => typeof window.test === "function");
  expect(
    await page.evaluate(async () => {
      test.patch("/api/cart", { total: 123.45 });
      return (await (await fetch("/api/cart")).json()).total;
    }),
  ).toBe(123.45);
  await expect(page.locator("[data-ssr-total]")).toHaveText("42");
  const html = await page.reload();
  expect(await html.text()).toContain("data-ssr-total>42</strong>");
  await page.waitForFunction(() => typeof window.test === "function");
  expect(await page.evaluate(() => test.overrides())).toEqual([]);
});
