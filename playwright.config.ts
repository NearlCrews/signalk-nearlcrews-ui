import { defineConfig, devices } from "@playwright/test";
import { BROWSER_URL } from "./fixtures/browser/browser-server.js";

/**
 * Hosted baseline families are named by the workflow that generates them
 * (`ubuntu24-x64`, `ubuntu24-arm64`). A local run gets a `local-` prefix so its
 * images can never collide with, or be mistaken for, a hosted family; they are
 * ignored by Git and exist for inspection only.
 */
const snapshotVariant =
  process.env.SNUI_SNAPSHOT_VARIANT ?? `local-${process.arch}`;

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/playwright",
  snapshotPathTemplate: `{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}-${snapshotVariant}{ext}`,
  fullyParallel: true,
  failOnFlakyTests: Boolean(process.env.CI),
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
