import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineConfig({
  testDir: "./tests",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? join(tmpdir(), "curiosity-coding-playwright-results"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:1314",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec astro dev --host 127.0.0.1 --port 1314",
    env: {
      ASTRO_DEV_BACKGROUND: "0",
    },
    url: "http://127.0.0.1:1314",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
