import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/next",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { browserName: "chromium", headless: true },
  webServer: {
    command: "npm run dev",
    cwd: process.env.NEXT_FIXTURE_DIR,
    url: "http://127.0.0.1:4180",
    timeout: 120000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
