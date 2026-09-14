import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cli = resolve("bin/test-mode.mjs");
const fixture = (context, typescript = false) => {
  const root = mkdtempSync(join(tmpdir(), "test-mode-init-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { next: "16.3.5" } }));
  if (typescript) writeFileSync(join(root, "tsconfig.json"), "{}");
  return root;
};
const run = root => spawnSync(process.execPath, [cli, "init", "--next", "--dir", root], { encoding: "utf8" });

test("Next init detects src and TypeScript without touching page call sites", context => {
  const root = fixture(context, true);
  mkdirSync(join(root, "src/app"), { recursive: true });
  writeFileSync(join(root, "src/app/page.tsx"), "// existing app");
  assert.equal(run(root).status, 0);
  assert.match(readFileSync(join(root, "src/instrumentation.ts"), "utf8"), /NEXT_RUNTIME === 'nodejs'/);
  assert.match(readFileSync(join(root, "src/instrumentation-client.ts"), "utf8"), /ssr: true/);
  assert.equal(readFileSync(join(root, "src/app/page.tsx"), "utf8"), "// existing app");
  assert.equal(existsSync(join(root, "instrumentation.ts")), false);
});

test("Next init never overwrites either hook or partially installs on conflict", context => {
  const root = fixture(context);
  mkdirSync(join(root, "app"));
  writeFileSync(join(root, "instrumentation-client.ts"), "// user's tracing");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No files changed/);
  assert.match(result.stderr, /setupNextTestMode/);
  assert.equal(readFileSync(join(root, "instrumentation-client.ts"), "utf8"), "// user's tracing");
  assert.equal(existsSync(join(root, "instrumentation.js")), false);
});

test("Next init creates JavaScript at root and refuses a second install", context => {
  const root = fixture(context);
  mkdirSync(join(root, "pages"));
  assert.equal(run(root).status, 0);
  const before = readFileSync(join(root, "instrumentation.js"), "utf8");
  assert.equal(run(root).status, 1);
  assert.equal(readFileSync(join(root, "instrumentation.js"), "utf8"), before);
});

test("Next init rejects non-Next apps and unknown options without writing files", context => {
  const root = fixture(context);
  writeFileSync(join(root, "package.json"), "{}");
  assert.equal(run(root).status, 1);
  assert.equal(existsSync(join(root, "instrumentation.js")), false);
  assert.equal(spawnSync(process.execPath, [cli, "init", "--force"], { cwd: root }).status, 1);
});
