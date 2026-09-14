import { test, expect } from "@playwright/test";

for (const path of [
  "/",
  "/ssg",
  "/isr",
  "/forced",
  "/products/one",
  "/cached",
]) {
  test(`Production ${path}: Draft overrides are private and clear returns to ordinary rendering`, async ({
    page,
    browser,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = `http://127.0.0.1:4180${path}`;
    const original = await page.goto(url);
    await expect(page.locator("[data-total]")).toHaveText("42");
    const render =
      path === "/" ? null : await page.locator("[data-render]").textContent();
    if (["/ssg", "/isr", "/forced"].includes(path))
      expect(original.headers()["x-nextjs-cache"]).toBe("HIT");
    await page.waitForFunction(() => typeof window.test === "function");
    const navigation = page.waitForResponse(
      (response) =>
        response.url() === url && response.request().isNavigationRequest(),
    );
    await page.evaluate(() => test.patch("/api/cart", { total: 12.34 }));
    await expect(page.locator("[data-total]")).toHaveText("12.34", {
      timeout: 15000,
    });
    // Use the actual browser document: Chromium accepts Secure cookies on loopback,
    // while Playwright APIRequestContext correctly omits them on plain HTTP.
    const html = await navigation;
    expect(await html.text()).toContain('data-total="true">12.34</strong>');
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === "__prerender_bypass",
      ),
    ).toBe(true);
    const other = await browser.newContext();
    try {
      const visitor = await other.newPage();
      await visitor.goto(url);
      await expect(visitor.locator("[data-total]")).toHaveText("42");
      if (render)
        await expect(visitor.locator("[data-render]")).toHaveText(render);
    } finally {
      await other.close();
    }
    await page.waitForFunction(() => typeof window.test === "function");
    await page.evaluate(() => test.clear());
    await expect(page.locator("[data-total]")).toHaveText("42");
    if (render) await expect(page.locator("[data-render]")).toHaveText(render);
    expect(
      (await page.context().cookies()).some(
        (cookie) => cookie.name === "__prerender_bypass",
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
  });
}
