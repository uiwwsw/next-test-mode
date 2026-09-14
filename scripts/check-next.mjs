import assert from "node:assert/strict";
import {
  mkdtempSync,
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "next-test-mode-fixture-"));
const upstream = spawn(
  process.execPath,
  [resolve("tests/fixtures/upstream.mjs")],
  { stdio: ["ignore", "pipe", "inherit"] },
);
try {
  await new Promise((ready, reject) => {
    upstream.once("error", reject);
    upstream.once("exit", (code) =>
      reject(new Error(`Upstream exited ${code}`)),
    );
    upstream.stdout.once("data", ready);
  });
  cpSync("tests/fixtures/next", temp, {
    recursive: true,
    filter: (source) => !source.includes("node_modules"),
  });
  execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: temp,
    stdio: "inherit",
  });
  const [pack] = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp],
      { encoding: "utf8" },
    ),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-save",
      "--no-audit",
      "--no-fund",
      join(temp, pack.filename),
    ],
    { cwd: temp, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      join(temp, "node_modules/@uiwwsw/next-test-mode/bin/test-mode.mjs"),
      "init",
    ],
    { cwd: temp, stdio: "inherit" },
  );
  const env = {
    ...process.env,
    NEXT_FIXTURE_DIR: temp,
    NEXT_PUBLIC_NEXT_TEST_MODE: "1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const playwright = resolve("node_modules/@playwright/test/cli.js");
  const run = (args, extra = {}) =>
    execFileSync(
      process.execPath,
      [playwright, "test", "--config", "playwright.next.config.mjs", ...args],
      { cwd: root, stdio: "inherit", env: { ...env, ...extra } },
    );
  run(["automatic.spec.mjs"], { NEXT_FIXTURE_COMMAND: "npm run dev" });
  execFileSync("npm", ["run", "build"], { cwd: temp, stdio: "inherit", env });
  const manifest = JSON.parse(
    readFileSync(join(temp, ".next/prerender-manifest.json"), "utf8"),
  );
  assert.equal(
    manifest.routes["/ssg"].initialRevalidateSeconds,
    false,
    "SSG must stay prerendered with the adapter installed",
  );
  assert.equal(
    manifest.routes["/isr"].initialRevalidateSeconds,
    3600,
    "ISR must retain its revalidation policy",
  );
  assert.ok(
    manifest.routes["/products/one"],
    "generateStaticParams must still run at build time",
  );
  run(["production.spec.mjs"], { NEXT_FIXTURE_COMMAND: "npm run start" });
  for (const path of ["isr", "ssg", "products", "forced", "cached"])
    rmSync(join(temp, "app", path), { recursive: true, force: true });
  cpSync("tests/fixtures/cache-page", join(temp, "app/cached"), {
    recursive: true,
  });
  writeFileSync(
    join(temp, "next.config.mjs"),
    "export default { cacheComponents: true };\n",
  );
  rmSync(join(temp, ".next"), { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], { cwd: temp, stdio: "inherit", env });
  run(["cache-components.spec.mjs"], { NEXT_FIXTURE_COMMAND: "npm run start" });
  rmSync(join(temp, ".next"), { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], {
    cwd: temp,
    stdio: "inherit",
    env: { ...env, NEXT_PUBLIC_NEXT_TEST_MODE: "0" },
  });
  run(["disabled.spec.mjs"], {
    NEXT_FIXTURE_COMMAND: "npm run start",
    NEXT_PUBLIC_NEXT_TEST_MODE: "0",
  });
} finally {
  upstream.kill("SIGTERM");
  rmSync(temp, { recursive: true, force: true });
}
