import { test, expect } from "@playwright/test";

test("Console JSON automatically changes server-generated HTML and restores on reload", async ({ page, browser }) => {
  await page.goto("http://127.0.0.1:4176/auto");
  await expect(page.locator("[data-ssr-total]")).toHaveText("42");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.patch("/api/cart.json", { total: 12.34 }));
  await expect(page.locator("[data-ssr-total]")).toHaveText("12.34");
  const html = await page.request.get("http://127.0.0.1:4176/auto");
  expect(await html.text()).toContain("data-ssr-total>12.34</div>");
  const other = await browser.newContext();
  try {
    const visitor = await other.newPage();
    await visitor.goto("http://127.0.0.1:4176/auto");
    await expect(visitor.locator("[data-ssr-total]")).toHaveText("42");
  } finally { await other.close(); }
  await page.waitForFunction(() => typeof window.test === "function");
  expect(await page.evaluate(() => test.overrides()[0].data.total)).toBe(12.34);
  await page.evaluate(() => test.mock("/api/cart.json", { items: [{name:"My product",price:3.14}], total:3.14 }));
  await expect(page.locator("[data-ssr-total]")).toHaveText("3.14");
  await expect(page.locator("[data-ssr-payload]")).toContainText("My product");
  await page.getByRole("button", { name: "원래 응답", exact: true }).click();
  await expect(page.locator("[data-ssr-total]")).toHaveText("42");
});

test("SSR editor rejects oversized values without corrupting the active value or reloading", async ({ page }) => {
  await page.goto("http://127.0.0.1:4176/auto");
  await page.getByRole("button", {name:"SSR에 적용"}).click();
  await expect(page.locator("[data-ssr-total]")).toHaveText("12.34");
  await page.waitForFunction(() => typeof window.test === "function");
  const cookies = await page.context().cookies();
  await page.locator("#ssr-input").fill(JSON.stringify({total:7, text:"x".repeat(4000)}));
  await page.getByRole("button", {name:"SSR에 적용"}).click();
  await expect(page.locator("#ssr-error")).toContainText("3500");
  expect(await page.evaluate(() => test.overrides()[0].data.total)).toBe(12.34);
  expect(await page.context().cookies()).toEqual(cookies);
  await expect(page.locator("[data-ssr-total]")).toHaveText("12.34");
});

test("SSR mocks preserve HTTP errors and escape HTML supplied from Console", async ({ page }) => {
  await page.goto("http://127.0.0.1:4176/auto");
  await page.waitForFunction(() => typeof window.test === "function");
  await page.evaluate(() => test.mock("/api/cart.json", {message:'<img src=x onerror="window.injected=true">'}, { status:503 }));
  await expect(page.locator("[data-ssr-payload]")).toContainText("<img");
  await expect(page.getByText("UPSTREAM HTTP 503")).toBeVisible();
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
