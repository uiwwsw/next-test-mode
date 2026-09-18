import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewSession } from "../dist/internal/preview-session.js";
const gate = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
test("preview flushes edits made during async refresh and explicit refresh of unchanged values", async () => {
  let key = "initial";
  let refreshes = 0;
  const pause = gate();
  const entered = gate();
  const session = createPreviewSession({
    read: () => ({ key, enabled: key !== "initial" }),
    connect: async (enabled) => ({ enabled, changed: false }),
    refresh: async () => {
      refreshes++;
      if (refreshes === 1) {
        entered.resolve();
        await pause.promise;
      }
    },
  });
  await session.sync();
  key = "first";
  const pending = session.sync();
  await entered.promise;
  key = "second";
  assert.equal(session.sync(), pending);
  pause.resolve();
  await pending;
  assert.equal(refreshes, 2);
  assert.equal(session.status().pendingChanges, false);
  await session.sync(true);
  assert.equal(refreshes, 3);
  session.stop();
  assert.equal(session.status().phase, "stopped");
});
test("failed activation can be retried without losing a required render", async () => {
  let key = "initial";
  let fail = false;
  let refreshes = 0;
  const session = createPreviewSession({
    read: () => ({ key, enabled: true }),
    connect: async () => {
      if (fail) throw new Error("offline");
      return { enabled: true, changed: false };
    },
    refresh: () => {
      refreshes++;
    },
  });
  await session.sync();
  key = "edited";
  fail = true;
  await assert.rejects(session.sync(), /offline/);
  assert.equal(session.status().phase, "error");
  assert.equal(session.status().pendingChanges, true);
  fail = false;
  await session.sync();
  assert.equal(refreshes, 1);
  assert.equal(session.status().error, null);
});
test("stopping an in-flight preview prevents refresh and preserves stopped status", async () => {
  const pause = gate();
  let refreshes = 0;
  const session = createPreviewSession({
    read: () => ({ key: "initial", enabled: true }),
    connect: async () => {
      await pause.promise;
      return { enabled: true, changed: true };
    },
    refresh: () => {
      refreshes++;
    },
  });
  const pending = session.sync();
  session.stop();
  pause.resolve();
  await pending;
  assert.equal(refreshes, 0);
  assert.equal(session.status().phase, "stopped");
});
