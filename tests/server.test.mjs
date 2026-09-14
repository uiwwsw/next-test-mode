import test from "node:test";
import assert from "node:assert/strict";
import {
  createServerTestMode,
  defineMock,
  definePatch,
} from "../dist/index.js";
import { createSSRDemoServer } from "../examples/server/server.mjs";

const url = "https://upstream.example/api/cart";
const cookie = (entries, key = "test-mode.entries") =>
  `${key}=${encodeURIComponent(JSON.stringify(entries))}`;
const definitions = [
  defineMock(
    "/api/cart",
    async ({ requestCount }) => {
      await Promise.resolve();
      return { total: 0, requestCount };
    },
    { caseKey: "empty" },
  ),
];
const originalFetch = async () => Response.json({ total: 42, items: [1] });
const create = (options = {}) =>
  createServerTestMode({
    enabled: true,
    cookieHeader: null,
    definitions,
    originalFetch,
    ...options,
  });

test("server selection comes from the incoming cookie, not upstream authentication cookies", async () => {
  const nativeFetch = globalThis.fetch;
  const a = create({ cookieHeader: cookie(["/api/cart:empty", "/unknown"]) });
  const b = create();
  assert.deepEqual(a.runtime.active(), ["/api/cart:empty"]);
  const [mock, real] = await Promise.all([
    a
      .fetch(url, { headers: { Cookie: "session=upstream" } })
      .then((r) => r.json()),
    b
      .fetch(url, { headers: { Cookie: cookie(["/api/cart:empty"]) } })
      .then((r) => r.json()),
  ]);
  assert.deepEqual(mock, { total: 0, requestCount: 1 });
  assert.deepEqual(real, { total: 42, items: [1] });
  assert.equal(globalThis.fetch, nativeFetch);
});

test("concurrent server requests isolate selections, overrides and request counters", async () => {
  const results = await Promise.all(
    Array.from({ length: 30 }, async (_, i) => {
      const scope = create({ cookieHeader: cookie(["/api/cart:empty"]) });
      if (i % 3 === 0) scope.runtime.setMock("/api/cart", { own: i });
      if (i % 3 === 1) scope.runtime.clear();
      const first = await (await scope.fetch(url)).json();
      const second = await (await scope.fetch(url)).json();
      return { first, second };
    }),
  );
  for (const [i, result] of results.entries()) {
    if (i % 3 === 0) assert.deepEqual(result.first, { own: i });
    else if (i % 3 === 1)
      assert.deepEqual(result.first, { total: 42, items: [1] });
    else {
      assert.deepEqual(result.first, { total: 0, requestCount: 1 });
      assert.deepEqual(result.second, { total: 0, requestCount: 2 });
    }
  }
});

test("server-authored overrides work with authenticated upstream requests and reset to the cookie scenario", async () => {
  const scope = create({ cookieHeader: cookie(["/api/cart:empty"]) });
  scope.runtime.setPatch("/api/cart", { total: 9.99 });
  const init = { headers: { Cookie: "session=upstream" } };
  assert.deepEqual(await (await scope.fetch(url, init)).json(), {
    total: 9.99,
    items: [1],
  });
  scope.runtime.setMock("/api/cart", { message: "Retry" }, { status: 503 });
  assert.equal((await scope.fetch(url, init)).status, 503);
  scope.runtime.resetOverrides();
  assert.equal((await (await scope.fetch(url, init)).json()).total, 0);
  scope.runtime.clear();
  assert.equal((await (await scope.fetch(url, init)).json()).total, 42);
});

test("custom cookie keys and registered patches work without forwarding incoming cookies", async () => {
  let sent;
  const scope = create({
    cookieKey: "qa",
    cookieHeader: `session=private; ${cookie(["/api/cart:discount"], "qa")}`,
    patchDefinitions: [
      definePatch("/api/cart", (data) => ({ ...data, total: 5 }), {
        caseKey: "discount",
      }),
    ],
    originalFetch: async (...args) => {
      sent = args;
      return originalFetch();
    },
  });
  const init = {
    cache: "no-store",
    headers: { Authorization: "test-upstream-auth" },
  };
  assert.equal((await (await scope.fetch(url, init)).json()).total, 5);
  assert.equal(sent[0], url);
  assert.equal(sent[1], init);
  assert.equal(new Headers(sent[1].headers).has("cookie"), false);
});

test("absent, malformed and unregistered cookies do not activate server scenarios", async () => {
  for (const cookieHeader of [
    null,
    "",
    "test-mode.entries=%ZZ",
    cookie(["/missing"]),
    cookie({ total: 1 }),
  ]) {
    const scope = create({ cookieHeader });
    assert.deepEqual(scope.runtime.active(), []);
    assert.equal((await (await scope.fetch(url)).json()).total, 42);
  }
  const disabled = create({
    enabled: false,
    cookieHeader: cookie(["/api/cart:empty"]),
  });
  disabled.runtime.setMock("/api/cart", { total: 1 });
  assert.equal((await (await disabled.fetch(url)).json()).total, 42);
});

test("unmatched server requests preserve the original Request, body and response stream", async () => {
  const input = new Request("https://upstream.example/upload", {
    method: "POST",
    body: "keep me",
  });
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event"));
      },
    }),
  );
  const scope = create({
    originalFetch: async (sent) => {
      assert.equal(sent, input);
      return response;
    },
  });
  assert.equal(await scope.fetch(input), response);
  assert.equal(input.bodyUsed, false);
  assert.equal(response.bodyUsed, false);
  await response.body.cancel();
});

test("SSR writes selected values into initial HTML even when no browser JavaScript runs", async (t) => {
  const server = createSSRDemoServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const page = `http://127.0.0.1:${server.address().port}/`;
  const responses = await Promise.all(
    [null, "/api/cart:discount", "/api/cart:empty"].map(async (entry) => {
      const response = await fetch(page, {
        headers: entry
          ? { Cookie: cookie([entry], "test-mode.ssr-example") }
          : {},
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      return response.text();
    }),
  );
  for (const [i, total] of [42, 9.99, 0].entries()) {
    assert.match(responses[i], new RegExp(`data-ssr-total>${total}</strong>`));
  }
});
