import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "test-mode-next-"));
try {
  cpSync("tests/fixtures/next", temp, { recursive: true, filter: source => !source.includes("node_modules") });
  execFileSync("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: temp, stdio: "inherit" });
  const [pack] = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temp], { encoding: "utf8" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--no-save", "--no-audit", "--no-fund", join(temp, pack.filename)], { cwd: temp, stdio: "inherit" });
  execFileSync(process.execPath, [join(temp, "node_modules/@uiwwsw/test-mode/bin/test-mode.mjs"), "init", "--next"], { cwd: temp, stdio: "inherit" });
  execFileSync(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.next.config.mjs"], {
    cwd: root, stdio: "inherit", env: { ...process.env, NEXT_FIXTURE_DIR: temp },
  });
} finally { rmSync(temp, { recursive: true, force: true }); }
