import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: [
    {
      command: "node scripts/serve-example.mjs",
      url: "http://127.0.0.1:4173",
      timeout: 15000,
    },
    {
      command: "node scripts/serve-example.mjs",
      env: { DEMO_ROOT: "demo-dist", DEMO_BASE: "/nested/", PORT: "4175" },
      url: "http://127.0.0.1:4175/nested/",
      timeout: 15000,
    },
    {
      command: "node examples/server/server.mjs",
      url: "http://127.0.0.1:4176",
      timeout: 15000,
    },
  ],
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: { browserName: "chromium", headless: true },
});
