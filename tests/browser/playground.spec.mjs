import { test, expect } from "@playwright/test";
const url = "http://127.0.0.1:4173/";
const apiPath = "/api/cart.json";
const boot = async (page) => {
  await page.goto(url);
  await expect(page.locator("body")).toHaveAttribute("data-ready", "real");
  await expect(page.locator("#cart")).toContainText("$42.00");
};

test("DevTools commands activate custom values and refresh the actual app without clicking", async ({
  page,
}) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === apiPath) requests.push(req);
  });
  await boot(page);
  expect(requests).toHaveLength(1);
  await page.evaluate(
    (path) => window.test.patch(path, { total: 8.75 }),
    apiPath,
  );
  await expect(page.locator("#cart")).toContainText("$8.75");
  await expect(page.locator("#cart")).toContainText("Canvas tote");
  await expect(page.locator("html")).toHaveAttribute("data-test-mode", "true");
  await expect(page.locator("#runtime-state")).toHaveText("● Test mode 켜짐");
  expect(requests).toHaveLength(2);
  await page.evaluate(
    (path) =>
      window.test.mock(path, {
        items: [{ name: "My own product", price: 3.14 }],
        total: 3.14,
      }),
    apiPath,
  );
  await expect(page.locator("#cart")).toContainText("My own product");
  await expect(page.locator("#cart")).toContainText("$3.14");
  expect(requests).toHaveLength(2);
  await page.evaluate(() => window.test.clear());
  await expect(page.locator("#cart")).toContainText("$42.00");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-test-mode",
    "true",
  );
  expect(requests).toHaveLength(3);
  expect(errors).toEqual([]);
});

test("JSON editor runs the same package API, supports errors, and preserves working input on invalid JSON", async ({
  page,
}) => {
  await boot(page);
  await page.getByLabel("응답에 적용할 JSON").fill('{"total": 12.34}');
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#cart")).toContainText("$12.34");
  await page.getByLabel("응답에 적용할 JSON").fill("{broken");
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.getByRole("alert")).toContainText("JSON 형식");
  await expect(page.locator("#cart")).toContainText("$12.34");
  await page.getByRole("button", { name: "Mock 응답 전체 교체" }).click();
  await page
    .getByLabel("응답에 적용할 JSON")
    .fill('{"message":"직접 입력한 오류"}');
  await page.locator("#mock-status").fill("503");
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#http-status")).toHaveText(
    "503 Service Unavailable",
  );
  await expect(page.locator("#cart")).toContainText("직접 입력한 오류");
  await page.getByRole("button", { name: "원래 응답", exact: true }).click();
  await expect(page.locator("#cart")).toContainText("$42.00");
});

test("presets still use real transport, story mocks and response patches", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: "빈 목록", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ready", "empty");
  await expect(page.locator("#cart")).toContainText(
    "장바구니가 비어 있습니다.",
  );
  await expect(page.locator("#request-count")).toHaveText("HTTP 1회");
  await page.getByRole("button", { name: "503 오류", exact: true }).click();
  await expect(page.locator("#http-status")).toHaveText(
    "503 Service Unavailable",
  );
  await page.getByRole("button", { name: "할인 적용", exact: true }).click();
  await expect(page.locator("#cart")).toContainText("$32.00");
  await expect(page.locator("#request-count")).toHaveText("HTTP 2회");
  await page.evaluate(
    (path) => window.test.patch(path, { total: 15 }),
    apiPath,
  );
  await expect(page.locator("#cart")).toContainText("$15.00");
});

test("arbitrary response shapes and HTML strings are displayed safely and reset after reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await boot(page);
  await page.evaluate(
    (path) =>
      window.test.mock(path, {
        items: [{ name: "<img src=x onerror=alert(1)>", price: 1 }],
        total: 1,
      }),
    apiPath,
  );
  await expect(page.locator("#cart")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator("#cart img")).toHaveCount(0);
  await page.evaluate((path) => window.test.mock(path, null), apiPath);
  await expect(page.locator("#cart")).toContainText("앱이 처리할 수 없는 응답");
  await expect(page.locator("#payload")).toHaveText("null");
  await page.reload();
  await expect(page.locator("#cart")).toContainText("$42.00");
  expect(await page.evaluate(() => window.test.overrides())).toEqual([]);
  expect(errors).toEqual([]);
});

test("the editor and response remain usable on a phone viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await boot(page);
  await page.getByLabel("응답에 적용할 JSON").fill('{"total": 7.77}');
  await page.getByRole("button", { name: "적용하고 테스트 모드 켜기" }).click();
  await expect(page.locator("#cart")).toContainText("$7.77");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("production build works under a nested hosting path without root-relative assets", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4175/nested/");
  await expect(page.locator("#cart")).toContainText("$42.00");
  await expect(page.locator("#quick-command")).toContainText(
    "/nested/api/cart.json",
  );
  await page.evaluate(() =>
    window.test.patch("/nested/api/cart.json", { total: 6.25 }),
  );
  await expect(page.locator("#cart")).toContainText("$6.25");
});

test("rapid console changes do not let an older HTTP response overwrite the latest value", async ({
  page,
}) => {
  await boot(page);
  await page.route("**/api/cart.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    await route.fulfill({
      json: { items: [{ name: "Slow network item", price: 42 }], total: 42 },
    });
  });
  await page.evaluate((path) => window.test.patch(path, { total: 1 }), apiPath);
  await page.evaluate((path) => window.test.patch(path, { total: 2 }), apiPath);
  await expect(page.locator("#cart")).toContainText("$2.00");
  await expect(page.locator("#cart")).not.toContainText("$1.00");
  await expect(page.locator("#http-status")).toHaveText("200 OK");
});

test("copyable console command and keyboard submit support the quickest demo flow", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await boot(page);
  await page.getByRole("button", { name: "명령 복사", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'test.patch("/api/cart.json", { total: 9.99 })',
  );
  await page.getByLabel("응답에 적용할 JSON").fill('{"total": 5.55}');
  await page.getByLabel("응답에 적용할 JSON").press("Control+Enter");
  await expect(page.locator("#cart")).toContainText("$5.55");
});
