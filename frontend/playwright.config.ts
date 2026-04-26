import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/qa",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "npm run start -- -p 3100",
    port: 3100,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
