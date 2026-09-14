import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/next",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { browserName: "chromium", headless: true },
  webServer: {
    command: process.env.NEXT_FIXTURE_COMMAND ?? "npm run dev",
    cwd: process.env.NEXT_FIXTURE_DIR,
    url: "http://127.0.0.1:4180",
    timeout: 120000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_NEXT_TEST_MODE: process.env.NEXT_PUBLIC_NEXT_TEST_MODE ?? "1",
    },
  },
});
