import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";
import { createTestMode, defineMock } from "../dist/core.js";
import { createServerTestMode } from "../dist/server.js";
import { withTestMode, installServerTestMode } from "../dist/node.js";
import {
  encodeSSRState,
  readSSRState,
  SSR_COOKIE_LIMIT,
} from "../dist/internal/ssr-state.js";

const cookie = (overrides) =>
  "test-mode.entries.ssr=" + encodeSSRState({ entries: [], overrides });
const mock = (total) => ({
  path: "/api/cart",
  method: "GET",
  mode: "mock",
  data: { total },
});

test("SSR snapshot decoding validates the complete document and respects the existing opt-in boundary", async () => {
  const value = cookie([mock(12.34)]);
  const plain = createServerTestMode({ enabled: true, cookieHeader: value });
  const sync = createServerTestMode({
    enabled: true,
    cookieHeader: value,
    ssr: true,
  });
  assert.equal(
    plain.runtime.hasMock({ path: "/api/cart", method: "GET" }),
    false,
  );
  assert.equal(
    (await sync.runtime.resolve({ path: "/api/cart", method: "GET" })).data
      .total,
    12.34,
  );
  for (const value of [
    "%ZZ",
    "{}",
    JSON.stringify({ v: 2, entries: [], overrides: [] }),
    JSON.stringify({
      v: 1,
      entries: [],
      overrides: [mock(1), { ...mock(2), mode: "code" }],
    }),
    "x".repeat(SSR_COOKIE_LIMIT + 1),
  ]) {
    assert.equal(readSSRState("qa=" + value, "qa"), null);
  }
  assert.throws(
    () => encodeSSRState({ entries: [], overrides: [mock("x".repeat(4000))] }),
    RangeError,
  );
});

test("state guards reject changes atomically, including resets and feature selection", async () => {
  let reject = false;
  let count = 0;
  const runtime = createTestMode({
    enabled: true,
    definitions: [defineMock("/api/cart", () => ({ total: 0 }))],
    beforeChange: (state) => {
      if (reject) throw Error("blocked");
      encodeSSRState(state);
    },
  });
  runtime.subscribe(() => count++);
  runtime.setMock("/api/cart", { total: 7 });
  assert.throws(
    () => runtime.setMock("/api/cart", { text: "x".repeat(4000) }),
    RangeError,
  );
  reject = true;
  for (const change of [
    () => runtime.clear(),
    () => runtime.resetOverrides(),
    () => runtime.setPatch("/api/cart", { total: 3 }),
    () => runtime.add("/api/cart"),
  ])
    assert.throws(change, /blocked/);
  assert.equal(
    (await runtime.resolve({ path: "/api/cart", method: "GET" })).data.total,
    7,
  );
  assert.deepEqual(runtime.active(), []);
  assert.equal(count, 1);
});

test("one server wrapper handles simultaneous visitors through unchanged fetch calls", async (t) => {
  const original = globalThis.fetch;
  const handler = withTestMode(
    async (request, response) => {
      if (request.url === "/api/cart") {
        response.end(JSON.stringify({ total: 42 }));
        return;
      }
      const data = await (
        await fetch(`http://127.0.0.1:${server.address().port}/api/cart`)
      ).json();
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(data));
    },
    { enabled: true, allowedPaths: ["/api/cart"] },
  );
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        handler.dispose();
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const url = `http://127.0.0.1:${server.address().port}/`;
  const results = await Promise.all(
    Array.from({ length: 30 }, async (_, i) => {
      const response = await original(url, {
        headers: i % 2 ? { Cookie: cookie([mock(i)]) } : {},
      });
      if (i % 2)
        assert.equal(
          response.headers.get("cache-control"),
          "private, no-store",
        );
      return (await response.json()).total;
    }),
  );
  assert.deepEqual(
    results,
    Array.from({ length: 30 }, (_, i) => (i % 2 ? i : 42)),
  );
  // Global fetch outside the handler has no visitor's state.
  assert.equal((await (await fetch(url + "api/cart")).json()).total, 42);
  handler.dispose();
  assert.equal(globalThis.fetch, original);
});

test("disabled server setup has no global mutation and nested wrappers unwind in either order", () => {
  const original = globalThis.fetch;
  const disabled = withTestMode(() => {}, { enabled: false });
  assert.equal(globalThis.fetch, original);
  disabled.dispose();
  const outer = withTestMode(() => {}, { enabled: true });
  const inner = withTestMode(() => {}, { enabled: true });
  outer.dispose();
  inner.dispose();
  assert.equal(globalThis.fetch, original);
  inner.dispose();
});

test("framework integration follows later fetch replacements without caching overridden responses", async (t) => {
  const original = globalThis.fetch;
  const context = new AsyncLocalStorage();
  let transports = 0;
  globalThis.fetch = async () => {
    transports++;
    return Response.json({ total: 42 });
  };
  const stop = installServerTestMode({
    enabled: true,
    getRequest: () => context.getStore() ?? null,
  });
  t.after(() => {
    stop();
    globalThis.fetch = original;
  });
  const upstream = globalThis.fetch;
  let cached;
  const framework = Object.assign(
    async (...args) => {
      cached ??= await upstream(...args);
      return cached.clone();
    },
    { frameworkMarker: true },
  );
  globalThis.fetch = framework;
  assert.equal(globalThis.fetch.frameworkMarker, true);
  const a = { key: {}, cookieHeader: cookie([{ ...mock(12), mode: "patch" }]) };
  const b = { key: {}, cookieHeader: null };
  const [patched, real] = await Promise.all(
    [a, b].map((scope) =>
      context.run(scope, async () =>
        (await fetch("https://api.example/api/cart")).json(),
      ),
    ),
  );
  assert.equal(patched.total, 12);
  assert.equal(real.total, 42);
  assert.equal((await cached.clone().json()).total, 42);
  assert.ok(transports >= 1);
  stop();
  assert.equal(globalThis.fetch, framework);
});

test("framework request identity isolates counters and forwards startup fetches unchanged", async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ real: true });
  const context = new AsyncLocalStorage();
  const stop = installServerTestMode({
    enabled: true,
    getRequest: () => context.getStore() ?? null,
    definitions: [
      defineMock("/api/cart", ({ requestCount }) => ({ requestCount })),
    ],
  });
  t.after(() => {
    stop();
    globalThis.fetch = original;
  });
  const selected =
    "test-mode.entries=" + encodeURIComponent(JSON.stringify(["/api/cart"]));
  const a = { key: {}, cookieHeader: selected };
  const b = { key: {}, cookieHeader: selected };
  const get = (scope) =>
    context.run(scope, async () =>
      (await fetch("https://api.example/api/cart")).json(),
    );
  assert.equal((await get(a)).requestCount, 1);
  assert.equal((await get(a)).requestCount, 2);
  assert.equal((await get(b)).requestCount, 1);
  assert.deepEqual(await (await fetch("https://api.example/api/cart")).json(), {
    real: true,
  });
});

test("control-route work bypasses server mocks, including authorization fetches", async (t) => {
  const { withoutTestMode } = await import(
    "../dist/internal/server-context.js"
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ total: 42 });
  const stop = installServerTestMode({
    enabled: true,
    getRequest: () => ({ key: {}, cookieHeader: cookie([mock(99)]) }),
  });
  t.after(() => {
    stop();
    globalThis.fetch = original;
  });
  assert.equal(
    (await (await fetch("https://api.example/api/cart")).json()).total,
    99,
  );
  assert.equal(
    (
      await withoutTestMode(async () =>
        (await fetch("https://api.example/api/cart")).json(),
      )
    ).total,
    42,
  );
});
