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
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "@playwright/test";

// The extension is explicit because Node, unlike the Playwright and Vite
// configurations that read the same module, does not rewrite a .js specifier.
import {
  BROWSER_PORT,
  BROWSER_URL,
} from "../fixtures/browser/browser-server.ts";
import { packageBinaryEntry, repositoryPath } from "./lib/paths.mjs";

const require = createRequire(import.meta.url);

const SHOWCASE_URL = `${BROWSER_URL}/showcase.html`;
const THEMES = ["light", "dark", "night"];
const VIEWPORT = { width: 1440, height: 1000 };
/* Twice the 1440 by 1000 viewport, matching the images already committed. */
const SCALE = 2;
const READY_ATTEMPTS = 60;
const READY_INTERVAL_MS = 1000;

// The fixture configuration owns the host and the port, including the
// SNUI_BROWSER_PORT override, so no port argument is passed here.
const server = spawn(
  process.execPath,
  [
    packageBinaryEntry(require.resolve("vite/package.json"), "vite"),
    "--config",
    "fixtures/browser/vite.config.ts",
  ],
  { cwd: repositoryPath(), stdio: "ignore" },
);

let startFailure;
let exited = false;
let closed = false;
server.on("error", (error) => {
  startFailure = error;
});
server.on("exit", () => {
  exited = true;
});
server.on("close", () => {
  closed = true;
});

try {
  let ready = false;
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    if (startFailure !== undefined) {
      throw new Error("Could not start the browser fixture server.", {
        cause: startFailure,
      });
    }
    if (exited) {
      throw new Error(
        `The browser fixture server exited before serving ${SHOWCASE_URL}. Set SNUI_BROWSER_PORT to a free port if ${String(BROWSER_PORT)} is already in use.`,
      );
    }
    try {
      const response = await fetch(SHOWCASE_URL);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* The server is still starting. */
    }
    await delay(READY_INTERVAL_MS);
  }

  if (!ready) {
    throw new Error(
      `The browser fixture server did not serve ${SHOWCASE_URL} after ${String(READY_ATTEMPTS)} attempts.`,
    );
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
    });
    await page.goto(SHOWCASE_URL);
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
      const file = repositoryPath(
        "docs",
        "screenshots",
        `showcase-${theme}.png`,
      );
      /*
       * The viewport, not the full page: `SaveActionBar` docks with
       * sticky="viewport-bottom", so only a viewport capture shows it at the
       * bottom edge clipping the content behind it, which is what the README
       * describes and what the committed images show.
       */
      await page.screenshot({ path: file, animations: "disabled" });
      process.stdout.write(`wrote ${file}\n`);
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
  if (!closed) await once(server, "close");
}
