import { test, expect } from "@playwright/test";

test("Next server fetch call sites stay unchanged while console JSON refreshes actual SSR HTML", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4180");
  await expect(page.locator("[data-total]")).toHaveText("42");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.patch("/api/cart", { total: 12.34 }));
  await expect(page.locator("[data-total]")).toHaveText("12.34", {
    timeout: 30000,
  });
  const html = await page.request.get("http://127.0.0.1:4180");
  expect(await html.text()).toContain('data-total="true">12.34</strong>');
  // The framework's force-cache must not retain a visitor's patched response.
  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto("http://127.0.0.1:4180");
    await expect(visitor.locator("[data-total]")).toHaveText("42");
  } finally {
    await other.close();
  }
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() =>
    test.mock("/api/cart", {
      total: 3.14,
      items: [{ name: "Custom", price: 3.14 }],
    }),
  );
  await expect(page.locator("[data-total]")).toHaveText("3.14");
  await expect(page.locator("[data-cart]")).toContainText("Custom");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.clear());
  await expect(page.locator("[data-total]")).toHaveText("42");
  expect(errors.filter((message) => /hydrat/i.test(message))).toEqual([]);
});
