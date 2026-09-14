import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/demo",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://127.0.0.1:4177",
  },
  webServer: {
    command: "npx next start --hostname 127.0.0.1 --port 4177",
    url: "http://127.0.0.1:4177",
    timeout: 30000,
  },
});
