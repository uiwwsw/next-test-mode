import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";

// Serve the actual ESM build in a real browser, without an app framework.
const buildDirectory = new URL("../../dist/", import.meta.url);
const files = [
  ...(await readdir(buildDirectory)).filter((name) => name.endsWith(".js")),
  ...(await readdir(new URL("internal/", buildDirectory)))
    .filter((name) => name.endsWith(".js"))
    .map((name) => `internal/${name}`),
];
const sources = new Map(
  await Promise.all(
    files.map(async (name) => [
      `/${name}`,
      await readFile(new URL(name, buildDirectory), "utf8"),
    ]),
  ),
);

test.beforeEach(async ({ page }) => {
  await page.route("http://test-mode.local/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (sources.has(path))
      return route.fulfill({
        contentType: "text/javascript",
        body: sources.get(path),
      });
    if (path.startsWith("/api/"))
      return route.fulfill({
        contentType: "application/json",
        headers: { "x-upstream": "yes" },
        body: '{"source":"real"}',
      });
    return route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><head><title>Test mode fixture</title></head><body><main>App</main></body></html>",
    });
  });
  await page.goto("http://test-mode.local/cart");
  await page.evaluate(async () => {
    const api = await import("/index.js");
    window.api = api;
    window.runtime = api.createTestMode({
      enabled: true,
      definitions: [
        api.defineMock("/api/items", () => ({ items: [] }), {
          caseKey: "empty",
          pages: ["/cart"],
        }),
      ],
      stories: [
        api.defineStory({
          key: "cart.empty",
          title: "Empty cart",
          description: "No items",
          entries: [api.entry("/api/items", "empty")],
        }),
      ],
    });
  });
});

test("console story controls fetch and page-aware overlay end to end", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.originalFetch = window.fetch;
    window.originalPushState = history.pushState;
    window.stopOverlay = api.installTestModeOverlay(runtime);
    window.stopFetch = api.installMockFetch(runtime);
    test.story("cart.empty");
  });
  await expect(page.locator("html")).toHaveAttribute("data-test-mode", "true");
  expect(
    await page.evaluate(async () => (await fetch("/api/items")).json()),
  ).toEqual({ items: [] });
  expect(
    await page.evaluate(() => test.search("empty").stories[0].active),
  ).toBe(true);
  await page.evaluate(() => history.pushState({}, "", "/account"));
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-test-mode",
    "true",
  );
  await page.evaluate(() => history.replaceState({}, "", "/cart/checkout"));
  await expect(page.locator("html")).toHaveAttribute("data-test-mode", "true");
  await page.evaluate(() => {
    test.clear();
    stopFetch();
    stopOverlay();
  });
  expect(
    await page.evaluate(() => ({
      fetch: fetch === originalFetch,
      history: history.pushState === originalPushState,
      consoleRemoved: !("test" in window),
    })),
  ).toEqual({ fetch: true, history: true, consoleRemoved: true });
});

test("server factory rejects browser use before changing persistence or globals", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const before = {
      cookie: document.cookie,
      storage: JSON.stringify(localStorage),
      fetch: window.fetch,
    };
    let error;
    try {
      api.createServerTestMode({ enabled: true, cookieHeader: null });
    } catch (caught) {
      error = caught.message;
    }
    return {
      error,
      unchanged:
        before.cookie === document.cookie &&
        before.storage === JSON.stringify(localStorage) &&
        before.fetch === window.fetch,
    };
  });
  expect(result.error).toContain("must run on the server");
  expect(result.unchanged).toBe(true);
});

test("one browser change emits one notification per runtime and persists cookies", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    let local = 0;
    let sibling = 0;
    const other = api.createTestMode({
      enabled: true,
      definitions: [
        api.defineMock("/api/items", () => ({}), { caseKey: "empty" }),
      ],
    });
    runtime.subscribe(() => local++);
    const stop = other.subscribe(() => sibling++);
    runtime.story("cart.empty");
    const cookie = document.cookie;
    const persisted = JSON.parse(localStorage.getItem(runtime.storageKey));
    stop();
    runtime.clear();
    return { local, sibling, cookie, persisted, cleared: other.active() };
  });
  expect(result.local).toBe(2);
  expect(result.sibling).toBe(1);
  expect(result.cookie).toContain("test-mode.entries=");
  expect(result.persisted).toEqual(["/api/items:empty"]);
  expect(result.cleared).toEqual([]);
});

test("blocked storage and cookies fall back to instance memory", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
      Object.defineProperty(document, "cookie", {
        get() {
          throw new Error("blocked");
        },
        set() {
          throw new Error("blocked");
        },
      });
      runtime.story("cart.empty");
      const active = runtime.active();
      const extension = api.createToggleExtension({
        key: "popup",
        label: "Popup",
      });
      extension.enable();
      const enabled = extension.isActive();
      extension.disable();
      return { active, enabled, disabled: !extension.isActive() };
    }),
  ).toEqual({ active: ["/api/items:empty"], enabled: true, disabled: true });
});

test("storage quota failure preserves usable runtime and extension controls", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("full", "QuotaExceededError");
      };
      runtime.story("cart.empty");
      const extension = api.createToggleExtension({
        key: "popup",
        label: "Popup",
      });
      extension.enable();
      return { active: runtime.active(), extension: extension.isActive() };
    }),
  ).toEqual({ active: ["/api/items:empty"], extension: true });
});

test("overlay cleanup cancels queued navigation and removes dataset markers", async ({
  page,
}) => {
  await page.evaluate(() => {
    const stop = api.installTestModeOverlay(runtime);
    runtime.story("cart.empty");
    history.pushState({}, "", "/cart/checkout");
    stop();
    stop();
  });
  await expect(page.locator("[data-test-mode]")).toHaveCount(0);
  await expect(page.locator('div[aria-hidden="true"]')).toHaveCount(0);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
  await expect(page.locator('div[aria-hidden="true"]')).toHaveCount(0);
});

test("console installer restores existing property descriptors", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const before = () => "existing";
      Object.defineProperty(window, "test", {
        configurable: true,
        value: before,
        writable: false,
      });
      const stop = api.installConsole(runtime);
      test.story("cart.empty");
      stop();
      return {
        restored: window.test === before,
        writable: Object.getOwnPropertyDescriptor(window, "test").writable,
      };
    }),
  ).toEqual({ restored: true, writable: false });
});

test("real response patches retain application headers", async ({ page }) => {
  expect(
    await page.evaluate(async () => {
      const mode = api.createTestMode({
        enabled: true,
        patchDefinitions: [
          api.definePatch("/api/items", (data) => ({ ...data, patched: true })),
        ],
      });
      mode.add("/api/items");
      const mockFetch = api.createMockFetch(mode);
      const response = await mockFetch("/api/items");
      return {
        data: await response.json(),
        header: response.headers.get("x-upstream"),
        url: response.url,
      };
    }),
  ).toEqual({
    data: { source: "real", patched: true },
    header: "yes",
    url: "http://test-mode.local/api/items",
  });
});

test("default browser runtime stays disabled", async ({ page }) => {
  expect(await page.evaluate(() => api.createTestMode().isAvailable())).toBe(
    false,
  );
});

test("disabled installers add no console, overlay, or extension side effects", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const mode = api.createTestMode({ enabled: false });
      let installed = false;
      const extension = api.createToggleExtension({
        key: "popup",
        label: "Popup",
        setup() {
          installed = true;
        },
      });
      api.installTestModeOverlay(mode, { extensions: [extension] });
      api.installConsole(mode, { extensions: [extension] });
      return {
        installed,
        console: "test" in window,
        overlay: document.querySelector('div[aria-hidden="true"]') !== null,
      };
    }),
  ).toEqual({ installed: false, console: false, overlay: false });
});

test("unknown story names preserve the current scenario while an empty list clears it", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      api.installConsole(runtime);
      test.story("cart.empty");
      test.story("cart.typo");
      const preserved = test.active();
      test.story.set([]);
      return { preserved, cleared: test.active() };
    }),
  ).toEqual({ preserved: ["/api/items:empty"], cleared: [] });
});

test("console cleanup preserves newer installs and restores the original after out-of-order teardown", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      window.test = "original";
      const first = api.installConsole(runtime);
      const second = api.installConsole(runtime);
      const newest = window.test;
      first();
      first();
      const preserved = window.test === newest;
      second();
      return {
        preserved,
        original: window.test,
        namespaceRemoved: !("__testMode" in window),
      };
    }),
  ).toEqual({ preserved: true, original: "original", namespaceRemoved: true });
});

test("console teardown does not overwrite a later app-owned global", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const stop = api.installConsole(runtime);
      Object.defineProperty(window, "test", {
        configurable: true,
        value: "application",
      });
      stop();
      return window.test;
    }),
  ).toBe("application");
});

test("failed extension setup rolls back earlier extensions, subscriptions and browser globals", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const calls = [];
      const extension = (key, fail = false) => ({
        key,
        label: key,
        enable() {},
        disable() {},
        isActive: () => false,
        subscribe() {
          calls.push(`subscribe:${key}`);
          return () => calls.push(`unsubscribe:${key}`);
        },
        install() {
          if (fail) throw new Error("setup failed");
          calls.push(`install:${key}`);
          return () => calls.push(`cleanup:${key}`);
        },
      });
      const pushState = history.pushState;
      let failed = false;
      try {
        api.installTestModeOverlay(runtime, {
          extensions: [extension("a"), extension("b", true)],
        });
      } catch {
        failed = true;
      }
      return {
        failed,
        calls,
        restored: history.pushState === pushState,
        consoleRemoved: !("test" in window),
        overlay: !!document.querySelector('div[aria-hidden="true"]'),
      };
    }),
  ).toEqual({
    failed: true,
    calls: [
      "subscribe:a",
      "install:a",
      "subscribe:b",
      "unsubscribe:b",
      "cleanup:a",
      "unsubscribe:a",
    ],
    restored: true,
    consoleRemoved: true,
    overlay: false,
  });
});

test("cleanup restores all resources even if an extension teardown throws", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      const pushState = history.pushState;
      const extension = api.createToggleExtension({
        key: "throws",
        label: "Throws",
        setup: () => () => {
          throw new Error("teardown failed");
        },
      });
      const stop = api.installTestModeOverlay(runtime, {
        extensions: [extension],
      });
      runtime.story("cart.empty");
      let failed = false;
      try {
        stop();
      } catch (error) {
        failed = error instanceof AggregateError;
      }
      stop();
      return {
        failed,
        restored: history.pushState === pushState,
        consoleRemoved: !("test" in window),
        markers: document.querySelectorAll("[data-test-mode]").length,
        overlays: document.querySelectorAll('div[aria-hidden="true"]').length,
      };
    }),
  ).toEqual({
    failed: true,
    restored: true,
    consoleRemoved: true,
    markers: 0,
    overlays: 0,
  });
});

test("nested overlays preserve visible markers and restore history after out-of-order cleanup", async ({
  page,
}) => {
  expect(
    await page.evaluate(() => {
      runtime.story("cart.empty");
      const original = history.pushState;
      const first = api.installTestModeOverlay(runtime);
      const second = api.installTestModeOverlay(runtime);
      first();
      const visible = document.documentElement.dataset.testMode;
      second();
      return {
        visible,
        restored: history.pushState === original,
        markerRemoved: !("testMode" in document.documentElement.dataset),
      };
    }),
  ).toEqual({ visible: "true", restored: true, markerRemoved: true });
});

test("removing browser storage does not resurrect the cookie selection in another tab", async ({
  page,
  context,
}) => {
  await page.evaluate(() => runtime.story("cart.empty"));
  const other = await context.newPage();
  await other.route("http://test-mode.local/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
  );
  await other.goto("http://test-mode.local/cart");
  await page.evaluate(() => {
    window.changes = [];
    runtime.subscribe((paths) => changes.push(paths));
  });
  await other.evaluate(() => localStorage.removeItem("test-mode.entries"));
  await expect.poll(() => page.evaluate(() => runtime.active())).toEqual([]);
  expect(await page.evaluate(() => changes)).toEqual([[]]);
});

test("one-call setup stays memory-only by default and cleanup cancels refresh", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const original = window.fetch;
    let refreshes = 0;
    const { runtime, stop } = api.setupTestMode({
      enabled: true,
      refresh: () => {
        refreshes++;
      },
    });
    test.mock("/api/cart", { total: 7 });
    const response = await (await fetch("/api/cart")).json();
    const cookie = document.cookie;
    stop();
    stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      response,
      cookie,
      refreshes,
      restored: window.fetch === original,
      consoleRemoved: window.test === undefined,
      overrides: runtime.overrides().length,
    };
  });
  expect(result).toMatchObject({
    response: { total: 7 },
    refreshes: 0,
    restored: true,
    consoleRemoved: true,
    overrides: 1,
  });
  expect(result.cookie).not.toContain(".ssr=");
});

test("SSR setup rejects unavailable cookies before installing any globals", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const original = window.fetch;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: () => {},
    });
    let message;
    try {
      api.setupTestMode({ enabled: true, ssr: true });
    } catch (error) {
      message = error.message;
    }
    delete document.cookie;
    return {
      message,
      restored: window.fetch === original,
      consoleRemoved: window.test === undefined,
    };
  });
  expect(result.message).toMatch(/cookie/i);
  expect(result).toMatchObject({ restored: true, consoleRemoved: true });
});

test("disabled setup never touches cookie, fetch or Console even with SSR requested", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const original = window.fetch;
    const cookie = document.cookie;
    const installation = api.setupTestMode({ enabled: false, ssr: true });
    installation.stop();
    return {
      sameFetch: window.fetch === original,
      sameCookie: cookie === document.cookie,
      consoleRemoved: window.test === undefined,
    };
  });
  expect(result).toEqual({
    sameFetch: true,
    sameCookie: true,
    consoleRemoved: true,
  });
});

test("Next client uses the original transport for Draft control and refreshes after acknowledgement", async ({
  page,
}) => {
  const calls = [];
  let active = false;
  await page.route("**/api/next-test-mode", (route) => {
    const { enabled } = route.request().postDataJSON();
    const changed = active !== enabled;
    active = enabled;
    calls.push(enabled);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabled, changed }),
    });
  });
  await page.evaluate(async () => {
    const { setupNextTestModeClient } = await import("/client.js");
    window.refreshes = 0;
    window.controller = setupNextTestModeClient({
      enabled: true,
      refresh: () => {
        window.refreshes++;
      },
    });
    await controller.ready;
    // The internal control call must never be intercepted by a Console override.
    controller.runtime.setMock(
      "/api/next-test-mode",
      { enabled: false, changed: false },
      { method: "POST" },
    );
    controller.runtime.setPatch("/api/cart", { total: 9.99 });
  });
  await expect.poll(() => page.evaluate(() => window.refreshes)).toBe(1);
  expect(calls).toEqual([false, true]);
  await page.evaluate(() => controller.runtime.clear());
  await expect.poll(() => page.evaluate(() => window.refreshes)).toBe(2);
  expect(calls).toEqual([false, true, false]);
  await page.evaluate(() => controller.stop());
});

test("Next client reports Draft failures without reloading or pretending SSR was connected", async ({
  page,
}) => {
  await page.route("**/api/next-test-mode", (route) =>
    route.fulfill({ status: 403, body: "Forbidden" }),
  );
  const result = await page.evaluate(async () => {
    const { setupNextTestModeClient } = await import("/client.js");
    const errors = [];
    let reloads = 0;
    const controller = setupNextTestModeClient({
      enabled: true,
      refresh: () => {
        reloads++;
      },
      onError: (error) => errors.push(error.message),
    });
    await controller.ready.catch(() => {});
    controller.stop();
    return { errors, reloads };
  });
  expect(result.reloads).toBe(0);
  expect(result.errors[0]).toContain("HTTP 403");
});

test("Next client serializes rapid changes while Draft activation is in flight", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const calls = [];
  let active = false;
  await page.route("**/api/next-test-mode", async (route) => {
    const { enabled } = route.request().postDataJSON();
    calls.push(enabled);
    if (enabled) await gate;
    const changed = active !== enabled;
    active = enabled;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabled, changed }),
    });
  });
  try {
    await page.evaluate(async () => {
      const { setupNextTestModeClient } = await import("/client.js");
      window.refreshes = 0;
      window.controller = setupNextTestModeClient({
        enabled: true,
        refresh: () => {
          window.refreshes++;
        },
      });
      await controller.ready;
      controller.runtime.setMock("/api/cart", { total: 7 });
    });
    await expect.poll(() => calls).toEqual([false, true]);
    await page.evaluate(() => controller.runtime.clear());
    release();
    await expect.poll(() => calls).toEqual([false, true, false]);
    await expect.poll(() => page.evaluate(() => window.refreshes)).toBe(1);
    await page.evaluate(() => controller.stop());
  } finally {
    release();
  }
});

test("Next Console exposes cache diagnostics under custom names and restores all test state", async ({
  page,
}) => {
  let active = false;
  await page.route("**/api/next-test-mode", (route) => {
    const { enabled } = route.request().postDataJSON();
    const changed = active !== enabled;
    active = enabled;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabled, changed }),
    });
  });
  const state = await page.evaluate(async () => {
    const { setupNextTestModeClient } = await import("/client.js");
    let refreshes = 0;
    const controller = setupNextTestModeClient({
      enabled: true,
      refresh: () => {
        refreshes++;
      },
      overlay: { globalName: "qa", namespace: "__qa" },
    });
    await controller.ready;
    const help = qa();
    await qa.cache.bypass();
    const bypass = qa.cache.status();
    qa.patch("/api/cart", { total: 8 });
    await controller.sync();
    await qa.cache.refresh();
    await qa.cache.restore();
    const restored = qa.cache.status();
    const overrides = qa.overrides();
    const cookie = document.cookie;
    controller.stop();
    return {
      help,
      bypass,
      restored,
      refreshes,
      overrides,
      cookie,
      removed: window.qa === undefined,
    };
  });
  expect(state.help.commands["test.cache.status()"]).toContain("Draft");
  expect(state.bypass).toMatchObject({
    cache: "bypass",
    manualBypass: true,
    draftEnabled: true,
    phase: "idle",
  });
  expect(state.restored).toMatchObject({
    cache: "default",
    manualBypass: false,
    draftEnabled: false,
  });
  expect(state.refreshes).toBe(4);
  expect(state.overrides).toEqual([]);
  expect(state.cookie).not.toContain(".preview=");
  expect(state.removed).toBe(true);
});

test("Draft timeouts are visible and cleanup aborts the control transport", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { setupNextTestModeClient } = await import("/client.js");
    const original = window.fetch;
    window.fetch = (_url, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => reject(init.signal.reason),
          { once: true },
        ),
      );
    const errors = [];
    const controller = setupNextTestModeClient({
      enabled: true,
      timeoutMs: 30,
      onError: (error) => errors.push(error.message),
    });
    await controller.ready.catch(() => {});
    const status = test.cache.status();
    controller.stop();
    window.fetch = original;
    return { status, errors, removed: window.test === undefined };
  });
  expect(result.status).toMatchObject({
    phase: "error",
    draftEnabled: null,
    cache: "unknown",
  });
  expect(result.errors[0]).toContain("timed out");
  expect(result.removed).toBe(true);
});

test("custom Console namespaces cannot shadow built-in commands or leak a partial installation", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const original = window.fetch;
    let error;
    try {
      api.setupTestMode({
        enabled: true,
        overlay: { commands: { clear: () => {} } },
      });
    } catch (cause) {
      error = cause.message;
    }
    return {
      error,
      restored: window.fetch === original,
      removed: window.test === undefined,
    };
  });
  expect(result).toEqual({
    error: "Console command already exists: clear",
    restored: true,
    removed: true,
  });
});
