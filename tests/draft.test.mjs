import test from "node:test";
import assert from "node:assert/strict";
import { createDraftControl } from "../dist/internal/draft-handler.js";
import { requestFromDraft } from "../dist/internal/next-request.js";
const request = (body = { enabled: true }, headers = {}) =>
  new Request("https://qa.example/api/next-test-mode", {
    method: "POST",
    headers: {
      origin: "https://qa.example",
      "content-type": "application/json",
      "x-next-test-mode": "1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const context = () => {
  const jar = new Map();
  const writes = [];
  const draft = {
    isEnabled: false,
    enable() {
      this.isEnabled = true;
    },
    disable() {
      this.isEnabled = false;
    },
  };
  return {
    draft,
    cookies: {
      get: (name) => jar.get(name),
      set: (name, value, options) => {
        jar.set(name, { value });
        writes.push({ name, value, options });
      },
    },
    writes,
  };
};
test("Draft controls enable and release only their own preview session", async () => {
  const state = context();
  const handler = createDraftControl(async () => state, { enabled: true });
  const started = await handler(request());
  assert.deepEqual(await started.json(), { enabled: true, changed: true });
  assert.equal(started.headers.get("cache-control"), "private, no-store");
  assert.equal(state.writes[0].options.httpOnly, true);
  assert.equal(state.writes[0].options.secure, true);
  assert.deepEqual(await (await handler(request())).json(), {
    enabled: true,
    changed: false,
  });
  assert.deepEqual(await (await handler(request({ enabled: false }))).json(), {
    enabled: false,
    changed: true,
  });
  assert.equal(state.writes.at(-1).options.maxAge, 0);
  const cms = context();
  cms.draft.enable();
  const shared = createDraftControl(async () => cms, { enabled: true });
  await shared(request());
  assert.deepEqual(await (await shared(request({ enabled: false }))).json(), {
    enabled: true,
    changed: false,
  });
  assert.deepEqual(cms.writes, []);
});
test("Draft controls reject disabled, cross-origin, unauthorized and malformed requests before mutation", async () => {
  let accessed = 0;
  const provider = async () => {
    accessed++;
    return context();
  };
  assert.equal(
    (await createDraftControl(provider, { enabled: false })(request())).status,
    404,
  );
  assert.equal(
    (
      await createDraftControl(provider, {
        enabled: true,
        authorize: () => false,
      })(request())
    ).status,
    403,
  );
  const handler = createDraftControl(provider, { enabled: true });
  assert.equal(
    (await handler(new Request("https://qa.example/api/next-test-mode")))
      .status,
    405,
  );
  for (const headers of [
    { origin: "https://evil.example" },
    { "x-next-test-mode": "0" },
    { "sec-fetch-site": "cross-site" },
  ])
    assert.equal(
      (await handler(request({ enabled: true }, headers))).status,
      403,
    );
  assert.equal(
    (
      await handler(
        request({ enabled: true }, { "content-type": "text/plain" }),
      )
    ).status,
    415,
  );
  assert.equal((await handler(request({ enabled: "yes" }))).status, 400);
  assert.equal(
    (await handler(request({ enabled: true, data: "x".repeat(1024) }))).status,
    413,
  );
  assert.equal(accessed, 0);
});
test("Next request bridge reads only test cookies and keeps provider identity across cache scopes", () => {
  const provider = {
    _mutableCookies: {
      get: (name) =>
        name === "qa.ssr"
          ? { value: '{"v":1}' }
          : name === "qa"
            ? { value: "[]" }
            : { value: "secret" },
    },
  };
  const scope = requestFromDraft({ _provider: provider }, "qa");
  assert.equal(scope.key, provider);
  assert.equal(scope.cookieHeader, "qa=%5B%5D; qa.ssr=%7B%22v%22%3A1%7D");
  assert.throws(() => requestFromDraft({}, "qa"), /Unsupported Next.js/);
});
