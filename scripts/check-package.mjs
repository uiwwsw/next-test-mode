import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "test-mode-package-"));
const run = (command, args, cwd = root) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(process.platform === "win32" && command === npm ? { shell: true } : {}),
  });
try {
  const [pack] = JSON.parse(
    run(npm, [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      temp,
    ]),
  );
  const files = new Set(pack.files.map((file) => file.path));
  for (const required of [
    "bin/test-mode.mjs",
    "dist/index.js",
    "dist/core.js",
    "dist/browser.js",
    "dist/fetch.js",
    "dist/server.js",
    "dist/server.d.ts",
    "dist/setup.js",
    "dist/node.js",
    "dist/next.js",
    "dist/client.js",
    "dist/index.d.ts",
    "dist/types.d.ts",
    "src/types.ts",
    "src/index.ts",
    "src/fetch.ts",
    "templates/test-mode/install.ts",
    "README.md",
    "LICENSE",
  ]) {
    assert.ok(files.has(required), `Missing published file: ${required}`);
  }
  for (const file of files)
    assert.ok(
      !/^(tests|scripts|\.github|node_modules)\//.test(file),
      `Unexpected published file: ${file}`,
    );
  const readme = readFileSync("README.md", "utf8");
  for (const match of readme.matchAll(
    /https:\/\/raw\.githubusercontent\.com\/uiwwsw\/next-test-mode\/[^/]+\/([^"\s)]+)/g,
  )) {
    assert.ok(
      existsSync(resolve(match[1])),
      `README asset does not exist: ${match[1]}`,
    );
    assert.ok(
      !files.has(match[1]),
      `README media should not inflate the npm tarball: ${match[1]}`,
    );
  }
  writeFileSync(
    join(temp, "package.json"),
    JSON.stringify({
      name: "test-mode-consumer",
      private: true,
      type: "module",
    }),
  );
  run(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(temp, pack.filename),
    ],
    temp,
  );
  const installed = join(temp, "node_modules/@uiwwsw/next-test-mode");
  const manifest = JSON.parse(
    readFileSync(join(installed, "package.json"), "utf8"),
  );
  assert.equal(manifest.name, "@uiwwsw/next-test-mode");
  assert.match(
    run(
      process.execPath,
      [join(installed, manifest.bin["next-test-mode"]), "--help"],
      temp,
    ),
    /init/,
  );
  for (const entry of Object.values(manifest.exports)) {
    assert.ok(
      files.has(entry.import.replace(/^\.\//, "")),
      "Missing runtime entry",
    );
    assert.ok(
      files.has(entry.types.replace(/^\.\//, "")),
      "Missing declaration entry",
    );
  }
  run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { createTestMode, defineMock, createMockFetch } from '@uiwwsw/next-test-mode';
    const core = await import('@uiwwsw/next-test-mode/core');
    const browser = await import('@uiwwsw/next-test-mode/browser');
    const adapter = await import('@uiwwsw/next-test-mode/fetch');
    const server = await import('@uiwwsw/next-test-mode/server');
    const node = await import('@uiwwsw/next-test-mode/node');
    const setup = await import('@uiwwsw/next-test-mode/setup');
    assert.equal(typeof node.withTestMode, 'function');
    assert.equal(typeof node.installServerTestMode, 'function');
    assert.equal(typeof setup.setupTestMode, 'function');
    const client = await import('@uiwwsw/next-test-mode/client');
    const disabled = client.setupNextTestModeClient({ enabled: false });
    await disabled.ready;
    assert.equal(disabled.cache.status().phase, 'disabled');
    disabled.stop();
    assert.equal(core.createTestMode, createTestMode);
    assert.equal(adapter.createMockFetch, createMockFetch);
    assert.equal(typeof browser.installConsole, 'function');
    assert.equal(core.installConsole, undefined);
    const runtime = createTestMode({ enabled: true, definitions: [defineMock('/api/packed', () => ({ packed: true }))] });
    runtime.add('/api/packed');
    const fetch = createMockFetch(runtime, { originalFetch: () => { throw new Error('unexpected transport'); } });
    assert.deepEqual(await (await fetch('https://example.com/api/packed')).json(), { packed: true });
    const scope = server.createServerTestMode({ enabled: true, cookieHeader: null });
    scope.runtime.setMock('/api/packed', { server: true });
    assert.deepEqual(await (await scope.fetch('https://example.com/api/packed', { headers: { Cookie: 'session=upstream' } })).json(), { server: true });
  `,
    ],
    temp,
  );
  cpSync(join(installed, "templates/test-mode"), join(temp, "template"), {
    recursive: true,
  });
  // Node entry consumers use Node's standard type declarations. Browser/root
  // imports remain independent from Node and the optional Next.js peer.
  cpSync(
    resolve("node_modules/@types/node"),
    join(temp, "node_modules/@types/node"),
    { recursive: true },
  );
  cpSync(
    resolve("node_modules/undici-types"),
    join(temp, "node_modules/undici-types"),
    { recursive: true },
  );
  writeFileSync(
    join(temp, "consumer.ts"),
    `
    import { createTestMode, defineMock, definePatch, createMockFetch } from '@uiwwsw/next-test-mode';
    const mock = defineMock<{ name: string }, { greeting: string }>('/hello', ({ body }) => ({ greeting: body?.name ?? 'world' }));
    const patch = definePatch<unknown, { total: number }>('/total', (data) => ({ total: data.total + 1 }));
    const runtime = createTestMode({ enabled: true, definitions: [mock], patchDefinitions: [patch] });
    runtime.setMock('/cart', { items: [] }, { status: 200 });
    runtime.setPatch('/cart', { total: 9.99 }, { method: 'GET' });
    const overrides: readonly import('@uiwwsw/next-test-mode/core').ResponseOverride[] = runtime.overrides();
    runtime.resetOverrides('/cart', { method: 'GET' });
    void overrides;
    const wrapped: typeof fetch = createMockFetch(runtime);
    const core: typeof import('@uiwwsw/next-test-mode').createTestMode = (await import('@uiwwsw/next-test-mode/core')).createTestMode;
    const adapter: typeof createMockFetch = (await import('@uiwwsw/next-test-mode/fetch')).createMockFetch;
    const browser: typeof import('@uiwwsw/next-test-mode').installConsole = (await import('@uiwwsw/next-test-mode/browser')).installConsole;
    const server: typeof import('@uiwwsw/next-test-mode').createServerTestMode = (await import('@uiwwsw/next-test-mode/server')).createServerTestMode;
    const scope = server({ cookieHeader: null, definitions: [mock], patchDefinitions: [patch] });
    const serverFetch: typeof fetch = scope.fetch;
    void [core, adapter, browser, serverFetch];
    void wrapped;
    const { setupTestMode } = await import('@uiwwsw/next-test-mode/setup');
    const { withTestMode, installServerTestMode } = await import('@uiwwsw/next-test-mode/node');
    const { setupNextTestMode }: typeof import('@uiwwsw/next-test-mode/next') = {} as typeof import('@uiwwsw/next-test-mode/next');
    const wrappedHandler = withTestMode((request, response) => { response.end(request.url); }, { enabled: false });
    const cleanup: () => void = wrappedHandler.dispose;
    const { setupNextTestModeClient } = await import('@uiwwsw/next-test-mode/client');
    const preview = setupNextTestModeClient({ enabled: false, timeoutMs: 1000 });
    const cacheStatus: import('@uiwwsw/next-test-mode/client').NextCacheStatus = preview.cache.status();
    const cachePolicy: 'unknown' | 'bypass' | 'default' = cacheStatus.cache;
    void [setupTestMode, installServerTestMode, setupNextTestMode, cleanup, cachePolicy];
  `,
  );
  writeFileSync(
    join(temp, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes: true,
        noEmit: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
      },
      include: ["consumer.ts", "template/**/*.ts"],
    }),
  );
  run(
    process.execPath,
    [
      resolve("node_modules/typescript/bin/tsc"),
      "-p",
      join(temp, "tsconfig.json"),
    ],
    temp,
  );
  console.log(
    `Verified ${manifest.name}@${manifest.version}: ${files.size} files, tarball install, ESM import, typed handlers and starter template.`,
  );
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
