import { defineConfig, devices } from "@playwright/test";
import { BROWSER_URL } from "./fixtures/browser/browser-server.js";

const snapshotVariant = process.env.SNUI_SNAPSHOT_VARIANT ?? process.arch;

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/playwright",
  snapshotPathTemplate: `{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}-${snapshotVariant}{ext}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BROWSER_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "vite --config fixtures/browser/vite.config.ts",
    url: BROWSER_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
});
