import { test, expect } from "@playwright/test";
test("Production builds without QA opt-in expose no Console controls and reject Draft activation", async ({
  page,
}) => {
  const state = {
    v: 1,
    entries: [],
    overrides: [
      { path: "/api/cart", method: "GET", mode: "mock", data: { total: 99 } },
    ],
  };
  await page
    .context()
    .addCookies([
      {
        name: "test-mode.entries.ssr",
        value: encodeURIComponent(JSON.stringify(state)),
        url: "http://127.0.0.1:4180",
      },
    ]);
  await page.goto("http://127.0.0.1:4180/cached");
  await expect(page.locator("[data-total]")).toHaveText("42");
  expect(await page.evaluate(() => typeof window.test)).toBe("undefined");
  const response = await page.request.post(
    "http://127.0.0.1:4180/api/next-test-mode",
    {
      headers: { Origin: "http://127.0.0.1:4180", "X-Next-Test-Mode": "1" },
      data: { enabled: true },
    },
  );
  expect(response.status()).toBe(404);
  expect(
    (await page.context().cookies()).some(
      (cookie) => cookie.name === "__prerender_bypass",
    ),
  ).toBe(false);
});
