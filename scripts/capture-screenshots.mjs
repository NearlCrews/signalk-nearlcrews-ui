/**
 * Regenerates the three README showcase images from the browser fixture.
 *
 * They are served from version-pinned unpkg URLs that the package contract
 * checks, so a release that changes the palette or the component set has to
 * refresh them or it publishes images that contradict its own release notes.
 * Run this after any visual change, before tagging.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "@playwright/test";

import { repositoryPath } from "./lib/paths.mjs";

const URL = "http://127.0.0.1:4173/showcase.html";
const THEMES = ["light", "dark", "night"];
/* Twice the 1440 by 1000 viewport, matching the images already committed. */
const VIEWPORT = { width: 1440, height: 1000 };
const SCALE = 2;

const server = spawn(
  "npx",
  ["vite", "--config", "fixtures/browser/vite.config.ts", "--port", "4173"],
  { cwd: repositoryPath(), stdio: "ignore" },
);

try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(URL);
      if (response.ok) break;
    } catch {
      /* The server is still starting. */
    }
    await delay(1000);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
  });
  await page.goto(URL);
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  for (const theme of THEMES) {
    const name = theme[0].toUpperCase() + theme.slice(1);
    await page.getByRole("radio", { name }).first().click();
    await page
      .locator(`[data-snui-version][data-snui-theme="${theme}"]`)
      .first()
      .waitFor();
    /* Let the theme transition settle so the capture is not mid-fade. */
    await delay(500);
    const file = repositoryPath("docs", "screenshots", `showcase-${theme}.png`);
    /*
     * The viewport, not the full page: `SaveActionBar` docks with
     * sticky="viewport-bottom", so only a viewport capture shows it at the
     * bottom edge clipping the content behind it, which is what the README
     * describes and what the committed images show.
     */
    await page.screenshot({ path: file, animations: "disabled" });
    console.log(`wrote ${file}`);
  }

  await browser.close();
} finally {
  server.kill();
  await once(server, "close");
}
