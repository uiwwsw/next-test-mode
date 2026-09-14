import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cli = resolve("bin/test-mode.mjs");
const fixture = (context, typescript = false) => {
  const root = mkdtempSync(join(tmpdir(), "test-mode-init-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { next: "16.3.5" } }),
  );
  if (typescript) writeFileSync(join(root, "tsconfig.json"), "{}");
  return root;
};
const run = (root) =>
  spawnSync(process.execPath, [cli, "init", "--next", "--dir", root], {
    encoding: "utf8",
  });

test("migration replaces only unchanged old generated hooks and adds Draft Mode", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "app"));
  const oldServer = `export async function register() {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupNextTestMode } = await import('@uiwwsw/test-mode/next');
    setupNextTestMode();
  }
}\n`;
  const oldClient = `import { setupTestMode } from '@uiwwsw/test-mode';\n\nsetupTestMode({ enabled: process.env.NODE_ENV === 'development', ssr: true });\n`;
  writeFileSync(join(root, "instrumentation.js"), oldServer);
  writeFileSync(join(root, "instrumentation-client.js"), oldClient);
  assert.equal(run(root).status, 1);
  const migrate = () =>
    spawnSync(process.execPath, [cli, "init", "--migrate", "--dir", root], {
      encoding: "utf8",
    });
  writeFileSync(
    join(root, "instrumentation-client.js"),
    oldClient + "// custom tracing\n",
  );
  assert.equal(migrate().status, 1);
  assert.equal(
    readFileSync(join(root, "instrumentation.js"), "utf8"),
    oldServer,
  );
  assert.equal(
    existsSync(join(root, "app/api/next-test-mode/route.js")),
    false,
  );
  writeFileSync(join(root, "instrumentation-client.js"), oldClient);
  assert.equal(migrate().status, 0);
  assert.match(
    readFileSync(join(root, "instrumentation.js"), "utf8"),
    /@uiwwsw\/next-test-mode\/next/,
  );
  assert.match(
    readFileSync(join(root, "instrumentation-client.js"), "utf8"),
    /setupNextTestModeClient/,
  );
  assert.match(
    readFileSync(join(root, "app/api/next-test-mode/route.js"), "utf8"),
    /createDraftModeHandler/,
  );
  assert.equal(migrate().status, 0);
});

test("Next init detects src and TypeScript without touching page call sites", (context) => {
  const root = fixture(context, true);
  mkdirSync(join(root, "src/app"), { recursive: true });
  writeFileSync(join(root, "src/app/page.tsx"), "// existing app");
  assert.equal(run(root).status, 0);
  assert.match(
    readFileSync(join(root, "src/instrumentation.ts"), "utf8"),
    /NEXT_RUNTIME === 'nodejs'/,
  );
  assert.match(
    readFileSync(join(root, "src/instrumentation-client.ts"), "utf8"),
    /setupNextTestModeClient/,
  );
  assert.equal(
    readFileSync(join(root, "src/app/page.tsx"), "utf8"),
    "// existing app",
  );
  assert.equal(existsSync(join(root, "instrumentation.ts")), false);
});

test("Next init never overwrites either hook or partially installs on conflict", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "app"));
  writeFileSync(join(root, "instrumentation-client.ts"), "// user's tracing");
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No files changed/);
  assert.match(result.stderr, /setupNextTestMode/);
  assert.equal(
    readFileSync(join(root, "instrumentation-client.ts"), "utf8"),
    "// user's tracing",
  );
  assert.equal(existsSync(join(root, "instrumentation.js")), false);
});

test("Next init creates JavaScript at root and is idempotent", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "app"));
  assert.equal(run(root).status, 0);
  const before = readFileSync(join(root, "instrumentation.js"), "utf8");
  assert.equal(run(root).status, 0);
  assert.equal(readFileSync(join(root, "instrumentation.js"), "utf8"), before);
});

test("Next init rejects non-Next apps and unknown options without writing files", (context) => {
  const root = fixture(context);
  writeFileSync(join(root, "package.json"), "{}");
  assert.equal(run(root).status, 1);
  assert.equal(existsSync(join(root, "instrumentation.js")), false);
  assert.equal(
    spawnSync(process.execPath, [cli, "init", "--force"], { cwd: root }).status,
    1,
  );
});

test("Next init adds a guarded Draft Mode route and leaves app fetching unchanged", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "app"));
  writeFileSync(join(root, "app/page.jsx"), "// application");
  assert.equal(run(root).status, 0);
  const route = readFileSync(
    join(root, "app/api/next-test-mode/route.js"),
    "utf8",
  );
  assert.match(route, /createDraftModeHandler/);
  assert.match(route, /NEXT_PUBLIC_NEXT_TEST_MODE/);
  assert.equal(
    readFileSync(join(root, "app/page.jsx"), "utf8"),
    "// application",
  );
});
