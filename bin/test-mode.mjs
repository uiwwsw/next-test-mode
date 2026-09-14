#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const usage = "Usage: test-mode init --next [--dir <app-directory>]";
if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log(`${usage}\nCreates browser and Node instrumentation for Next.js 16. Existing files are never overwritten.`);
} else {
  try {
    if (args[0] !== "init" || args[1] !== "--next" ||
        !([2, 4].includes(args.length)) || (args.length === 4 && args[2] !== "--dir"))
      throw new Error(usage);
    const root = resolve(args[3] ?? ".");
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (!manifest.dependencies?.next && !manifest.devDependencies?.next)
      throw new Error("Run this in a Next.js app, or pass --dir <app-directory>.");
    const folder = ["app", "pages"].some(name => existsSync(join(root, name))) ? root
      : ["app", "pages"].some(name => existsSync(join(root, "src", name))) ? join(root, "src") : root;
    const extension = existsSync(join(root, "tsconfig.json")) ? "ts" : "js";
    const snippets = {
      instrumentation: `export async function register() {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupNextTestMode } = await import('@uiwwsw/test-mode/next');
    setupNextTestMode();
  }
}
`,
      "instrumentation-client": `import { setupTestMode } from '@uiwwsw/test-mode';

setupTestMode({ enabled: process.env.NODE_ENV === 'development', ssr: true });
`,
    };
    const exists = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } };
    const conflicts = [root, join(root, "src")].flatMap(directory => Object.keys(snippets).flatMap(name =>
      ["ts", "js", "tsx", "jsx", "mjs", "cjs", "mts", "cts"].map(ext => join(directory, `${name}.${ext}`)).filter(exists)));
    if (conflicts.length) {
      const instructions = Object.entries(snippets).map(([name, snippet]) => `\n${name}.${extension}:\n${snippet}`).join("");
      throw new Error(`Existing instrumentation found: ${conflicts.map(path => relative(root, path)).join(", ")}.\nNo files changed. Merge these setup calls into your existing hooks:${instructions}`);
    }
    const created = [];
    try {
      for (const [name, snippet] of Object.entries(snippets)) {
        const file = join(folder, `${name}.${extension}`);
        writeFileSync(file, snippet, { flag: "wx" });
        created.push(file);
      }
    } catch (error) {
      for (const file of created) unlinkSync(file);
      throw error;
    }
    console.log(`Created ${created.map(path => relative(root, path)).join(" and ")}.\nRestart your dev server, open DevTools Console, then try:\n  test.patch('/api/cart', { total: 9.99 });\nUse your API pathname. Browser and SSR fetch calls stay unchanged; the page refreshes automatically.\nUse test.clear() to reset. SSR values share a session cookie (up to 3500 encoded bytes).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
