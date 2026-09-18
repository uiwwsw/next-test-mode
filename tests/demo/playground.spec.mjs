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
