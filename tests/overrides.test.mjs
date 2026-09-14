import test from "node:test";
import assert from "node:assert/strict";
import { createTestMode, createMockFetch, defineMock } from "../dist/index.js";

const request = (path = "/api/cart", method = "GET") => ({ path, method });
const upstream = {
  items: [{ name: "Original", price: 42 }],
  total: 42,
  settings: { a: 1, b: 2 },
};
const setup = (options) => {
  const runtime = createTestMode({ enabled: true, ...options });
  let calls = 0;
  const fetch = createMockFetch(runtime, {
    originalFetch: async () => {
      calls++;
      return new Response(JSON.stringify(upstream), {
        headers: { "content-type": "application/json", "x-original": "yes" },
      });
    },
  });
  return { runtime, fetch, calls: () => calls };
};

test("one call activates a custom mock without a registered feature or network request", async () => {
  const { runtime, fetch, calls } = setup();
  runtime.setMock("/api/cart", { items: [], total: 0 });
  assert.deepEqual(await (await fetch("https://app.example/api/cart")).json(), {
    items: [],
    total: 0,
  });
  assert.equal(calls(), 0);
  assert.equal(runtime.isActiveForPage("/any-page"), true);
  runtime.clear();
  assert.deepEqual(
    await (await fetch("https://app.example/api/cart")).json(),
    upstream,
  );
  assert.equal(calls(), 1);
  assert.equal(runtime.isActiveForPage("/any-page"), false);
});

test("patch fields reuse real HTTP responses and replace nested values without mutating upstream", async () => {
  const { runtime, fetch, calls } = setup();
  runtime.setPatch("/api/cart", { total: 9.99, settings: { a: 4 } });
  const response = await fetch("https://app.example/api/cart");
  assert.deepEqual(await response.json(), {
    ...upstream,
    total: 9.99,
    settings: { a: 4 },
  });
  assert.equal(response.headers.get("x-original"), "yes");
  assert.equal(calls(), 1);
  assert.deepEqual(upstream.settings, { a: 1, b: 2 });
});

test("temporary patch wins over a selected mock, and reset restores that feature", async () => {
  const { runtime, fetch, calls } = setup({
    definitions: [defineMock("/api/cart", () => ({ from: "feature" }))],
  });
  runtime.add("/api/cart");
  runtime.setPatch("/api/cart", { total: 7 });
  assert.equal(
    (await (await fetch("https://app.example/api/cart")).json()).total,
    7,
  );
  assert.equal(calls(), 1);
  runtime.resetOverrides("/api/cart");
  assert.deepEqual(await (await fetch("https://app.example/api/cart")).json(), {
    from: "feature",
  });
  runtime.setMock("/api/cart", { from: "custom" });
  runtime.setMock("/api/cart", { from: "replacement" });
  assert.equal(runtime.overrides().length, 1);
  assert.deepEqual((await runtime.resolve(request())).data, {
    from: "replacement",
  });
});

test("overrides match exact path and method, with method-specific removal", async () => {
  const { runtime } = setup();
  runtime.setMock("/api/cart?x=1", { method: "get" });
  runtime.setMock("/api/cart", { method: "post" }, { method: "post" });
  assert.equal(
    (await runtime.resolve(request("/api/cart", "POST"))).data.method,
    "post",
  );
  assert.equal(runtime.hasMock(request("/cart")), false);
  assert.equal(runtime.hasMock(request("/api/cart/child")), false);
  assert.equal(runtime.hasMock(request("/api/cart", "DELETE")), false);
  runtime.resetOverrides("/api/cart", { method: "POST" });
  assert.equal(runtime.overrides().length, 1);
  assert.equal(runtime.hasMock(request("/api/cart", "POST")), false);
  runtime.resetOverrides("/api/cart");
  assert.deepEqual(runtime.overrides(), []);
});

test("custom values are detached on input, inspection and response resolution", async () => {
  const { runtime } = setup();
  const data = { items: [{ name: "Before" }] };
  runtime.setMock("/api/cart", data);
  data.items[0].name = "Input changed";
  runtime.overrides()[0].data.items[0].name = "Inspection changed";
  (await runtime.resolve(request())).data.items[0].name = "Response changed";
  assert.equal((await runtime.resolve(request())).data.items[0].name, "Before");
});

test("invalid JSON values and HTTP options fail before replacing the previous override", async () => {
  const { runtime } = setup();
  runtime.setMock("/api/cart", { good: true });
  const cycle = {};
  cycle.self = cycle;
  for (const data of [
    undefined,
    NaN,
    { value: Infinity },
    { value: undefined },
    () => {},
    cycle,
    new Date(),
    {
      get value() {
        throw new Error("must not execute");
      },
    },
  ]) {
    assert.throws(() => runtime.setMock("/api/cart", data), TypeError);
  }
  for (const data of [null, [], "bad"])
    assert.throws(() => runtime.setPatch("/api/cart", data), TypeError);
  for (const path of ["", "api/cart", "//example.com/cart"])
    assert.throws(() => runtime.setMock(path, {}), TypeError);
  for (const status of [199, 600, 2.5, "200"])
    assert.throws(
      () => runtime.setMock("/api/cart", {}, { status }),
      RangeError,
    );
  assert.throws(
    () => runtime.setMock("/api/cart", {}, { statusText: "ok\r\nx: y" }),
    TypeError,
  );
  assert.throws(
    () => runtime.setMock("/api/cart", {}, { method: "" }),
    TypeError,
  );
  assert.deepEqual((await runtime.resolve(request())).data, { good: true });
});

test("mock status, null bodies and bodyless HTTP statuses use the fetch adapter", async () => {
  const { runtime, fetch } = setup();
  runtime.setMock("/api/cart", { message: "Retry" }, { status: 503 });
  const error = await fetch("https://app.example/api/cart");
  assert.equal(error.status, 503);
  assert.equal(error.statusText, "Service Unavailable");
  for (const value of [null, "custom text", 12, true, [1, 2]]) {
    runtime.setMock("/api/cart", value);
    const response = await fetch("https://app.example/api/cart");
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.deepEqual(await response.json(), value);
  }
  runtime.setMock("/api/cart", { ignored: true }, { status: 204 });
  assert.equal(await (await fetch("https://app.example/api/cart")).text(), "");
});

test("overrides cannot activate a disabled runtime or leak into cookie-scoped server requests", async () => {
  const runtime = createTestMode({ enabled: false });
  runtime.setMock("/api/cart", {});
  runtime.setPatch("/api/cart", { total: 1 });
  assert.deepEqual(runtime.overrides(), []);
  assert.equal(runtime.isActiveForPage("/"), false);
  const enabled = createTestMode({ enabled: true });
  enabled.setMock("/api/cart", {});
  assert.equal(enabled.hasMock({ ...request(), cookieHeader: "" }), false);
  assert.equal(
    enabled.hasMock({ ...request(), cookieHeader: "session=abc" }),
    false,
  );
  assert.equal(enabled.isActiveForPage("/", ""), false);
  assert.deepEqual(createTestMode({ enabled: true }).overrides(), []);
});

test("each successful override change sends one notification, rejected changes send none", () => {
  const { runtime } = setup();
  let notifications = 0;
  const stop = runtime.subscribe(() => notifications++);
  runtime.setMock("/api/cart", {});
  runtime.setPatch("/api/cart", { total: 1 });
  assert.throws(() => runtime.setPatch("/api/cart", null));
  assert.equal(notifications, 2);
  runtime.resetOverrides("/api/cart");
  runtime.clear();
  assert.equal(notifications, 4);
  stop();
});

test("object patches reject non-object upstream payloads explicitly", async () => {
  const { runtime } = setup();
  runtime.setPatch("/api/cart", { total: 0 });
  await assert.rejects(
    runtime.applyPatch({ ...request(), data: null }),
    /non-object/,
  );
  await assert.rejects(
    runtime.applyPatch({ ...request(), data: [] }),
    /non-object/,
  );
});
