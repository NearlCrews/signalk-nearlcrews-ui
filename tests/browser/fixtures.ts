import { existsSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import {
  test as base,
  type ConsoleMessage,
  expect,
  type Locator,
  type Page,
  type PageAssertionsToHaveScreenshotOptions,
  type TestInfo,
} from "@playwright/test";

import { CSP_FIXTURE_PATH } from "../../fixtures/browser/browser-server.js";

interface AxeRuleException {
  /** The axe rule id left out of this one run. */
  readonly id: string;
  /** Why the rule misreports the state under test; it is recorded, not optional. */
  readonly reason: string;
}

interface AxeOptions {
  readonly disableRules?: readonly AxeRuleException[] | undefined;
}

/**
 * The desktop Chromium project, where an engine-independent check runs once.
 * Specs reach it only through skipOutsideChromium, and they compare against
 * WEBKIT_PROJECT and MOBILE_PROJECT rather than spelling a project name.
 */
const CHROMIUM_PROJECT = "chromium";

/** The desktop WebKit project. */
export const WEBKIT_PROJECT = "webkit";

/**
 * The one Playwright project that emulates a phone: a coarse pointer on a
 * narrow viewport.
 */
export const MOBILE_PROJECT = "mobile-chromium";

/**
 * The smallest a control may be, in CSS pixels, for the project under test.
 *
 * A coarse pointer means a wet or gloved finger on a moving boat, so the
 * package raises its control height there; a fine pointer keeps the ordinary
 * one. Every spec that measures targets reads the floor here, so no two of
 * them can hold controls to different sizes.
 */
export function controlTargetFloor(testInfo: TestInfo): number {
  return testInfo.project.name === MOBILE_PROJECT ? 44 : 40;
}

/**
 * Fails unless the page measures under the pointer the project emulates,
 * coarse in the mobile project only, so a coarse-pointer measurement is never
 * proved against the fine-pointer layout and a capture that drops the
 * emulation is caught.
 */
export async function expectProjectPointer(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  expect(
    await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches),
    "The project does not emulate the pointer it grades.",
  ).toBe(testInfo.project.name === MOBILE_PROJECT);
}

/** The explicit themes, by their accessible names in the theme selector. */
export const THEMES = ["Light", "Dark", "Night"] as const;

/** A theme option's accessible name in the panel's theme selector. */
export type ThemeName = (typeof THEMES)[number];

/** PanelRoot's element, by the attribute every root carries. */
const PANEL_ROOT_SELECTOR = "[data-snui-version]";

/** The panel root, or every root on a page that mounts several. */
export function panelRoot(page: Page): Locator {
  return page.locator(PANEL_ROOT_SELECTOR);
}

/**
 * Whether a screenshot can be compared: the current project, platform, and
 * snapshot variant has a committed baseline for it, or baselines are being
 * written. Hosted baselines come only from the refresh workflow, so any other
 * machine, and a CI run before a new screenshot's first refresh, has none; a
 * caller skips the comparison then rather than failing on a missing file. The
 * family completeness test is what fails until the images are committed.
 * Playwright's own update mode counts as writing, which is how a local run
 * writes the local family.
 */
function hasCommittedBaseline(testInfo: TestInfo, snapshot: string): boolean {
  const { updateSnapshots } = testInfo.config;
  return (
    process.env.SNUI_UPDATE_BASELINES === "true" ||
    updateSnapshots === "all" ||
    updateSnapshots === "changed" ||
    existsSync(testInfo.snapshotPath(snapshot))
  );
}

/** How every full-page visual baseline is captured. */
export const FULL_PAGE_SNAPSHOT = {
  animations: "disabled",
  fullPage: true,
} as const;

/**
 * Compares one capture with its baseline, or records why it was skipped. The
 * other checks in the same test still run, which a test-level skip would stop.
 * An element capture takes a page capture's options but the two that frame a
 * page.
 */
export function matchBaseline(
  target: Page,
  testInfo: TestInfo,
  snapshot: string,
  options: PageAssertionsToHaveScreenshotOptions,
): Promise<void>;
export function matchBaseline(
  target: Locator,
  testInfo: TestInfo,
  snapshot: string,
  options: Omit<PageAssertionsToHaveScreenshotOptions, "clip" | "fullPage">,
): Promise<void>;
export async function matchBaseline(
  target: Locator | Page,
  testInfo: TestInfo,
  snapshot: string,
  options: PageAssertionsToHaveScreenshotOptions,
): Promise<void> {
  if (!hasCommittedBaseline(testInfo, snapshot)) {
    testInfo.annotations.push({
      description: `No committed ${snapshot} baseline for this project, platform, and snapshot variant; refresh baselines through the manual CI workflow.`,
      type: "skip",
    });
    return;
  }
  // The page and the locator assertions each declare toHaveScreenshot, so the
  // union is narrowed to one of them rather than passed through.
  if ("goto" in target) {
    await expect(target).toHaveScreenshot(snapshot, options);
  } else {
    await expect(target).toHaveScreenshot(snapshot, options);
  }
}

/** Picks a theme and waits until the panel root carries it. */
export async function selectTheme(page: Page, theme: ThemeName): Promise<void> {
  await page.getByRole("radio", { name: theme }).click();
  await expect(panelRoot(page)).toHaveAttribute(
    "data-snui-theme",
    theme.toLowerCase(),
  );
}

/**
 * Emulates forced colors, which Playwright does in Chromium only, with motion
 * reduced so no color is read in the middle of a transition.
 */
export function emulateForcedColors(page: Page): Promise<void> {
  return page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
}

/** A CSS system color keyword a probe can resolve. */
type SystemColor =
  | "ButtonFace"
  | "ButtonText"
  | "Canvas"
  | "CanvasText"
  | "Field"
  | "FieldText"
  | "GrayText"
  | "Highlight"
  | "HighlightText"
  | "LinkText"
  | "Mark"
  | "MarkText";

/**
 * The computed value of each named system color on the page, read from one
 * probe element. The probe opts out of forced colors, so it reports the
 * system color itself rather than the substitute the engine paints over an
 * author color; a system color the author named resolves the same either way.
 */
export function systemColors<Name extends SystemColor>(
  page: Page,
  names: readonly Name[],
): Promise<Record<Name, string>> {
  return page.evaluate(
    (requested) => {
      const probe = document.createElement("span");
      probe.style.forcedColorAdjust = "none";
      document.body.append(probe);
      const resolved: Record<string, string> = {};
      for (const name of requested) {
        probe.style.color = name;
        resolved[name] = getComputedStyle(probe).color;
      }
      probe.remove();
      return resolved;
    },
    [...names],
  );
}

/** One computed style value of the first element the locator matches. */
export function styleOf(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

/** The background color an element computes when it paints none. */
export const TRANSPARENT = "rgba(0, 0, 0, 0)";

/** The computed background color of the first element the locator matches. */
export function backgroundOf(locator: Locator): Promise<string> {
  return styleOf(locator, "background-color");
}

/**
 * The color a token resolves to inside the anchor, read from a probe so the
 * comparison is against the theme in force rather than a hard-coded value.
 */
export function tokenColor(anchor: Locator, token: string): Promise<string> {
  return anchor.evaluate((element, name) => {
    const probe = document.createElement("span");
    probe.style.background = `var(${name})`;
    element.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, token);
}

/**
 * A length, a token or a literal, in pixels inside the anchor, read from a
 * probe so the comparison follows the pointer and breakpoint in force.
 */
export function cssLength(anchor: Locator, length: string): Promise<number> {
  return anchor.evaluate((element, value) => {
    const probe = document.createElement("span");
    probe.style.display = "block";
    probe.style.width = value;
    element.append(probe);
    const px = Number.parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return px;
  }, length);
}

/** An element's rendered pixels, as the page decoded them. */
export interface Pixels {
  readonly height: number;
  readonly width: number;
  /** The red, green, and blue channels at a pixel. */
  at(x: number, y: number): readonly [number, number, number];
}

/**
 * An element's pixels as it renders. The page decodes its own screenshot
 * through a canvas, so a check reads the pixels the browser painted, native
 * parts included, which no computed style reaches.
 */
export async function renderedPixels(
  page: Page,
  target: Locator,
): Promise<Pixels> {
  const png = (await target.screenshot()).toString("base64");
  const { height, rgba, width } = await page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("The canvas has no 2D context.");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let binary = "";
    for (let start = 0; start < data.length; start += 0x8000) {
      binary += String.fromCharCode(...data.subarray(start, start + 0x8000));
    }
    return {
      height: canvas.height,
      rgba: btoa(binary),
      width: canvas.width,
    };
  }, png);
  const bytes = Buffer.from(rgba, "base64");
  return {
    height,
    width,
    at: (x, y) => {
      const index = (y * width + x) * 4;
      return [bytes[index] ?? 0, bytes[index + 1] ?? 0, bytes[index + 2] ?? 0];
    },
  };
}

/** Fails unless the element draws a solid outline of the given width. */
export async function expectSolidOutline(
  target: Locator,
  width = "2px",
): Promise<void> {
  await expect(target).toHaveCSS("outline-style", "solid");
  await expect(target).toHaveCSS("outline-width", width);
}

/** An element's layout box, in CSS pixels from the viewport's corner. */
export interface Box {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/** A box that is there, or a failure naming what was not laid out. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error(`${String(locator)} has no layout box.`);
  return box;
}

/** Fails when a control's box is under the floor on either measured axis. */
export async function expectTargetFloor(
  target: Locator,
  minimum: number,
  axes: "height" | "both" = "height",
): Promise<void> {
  const box = await boxOf(target);
  // Subpixel layout leaves a control that is exactly at the floor reporting a
  // hair under it, which is the engine rounding rather than a small target.
  expect(box.height).toBeGreaterThanOrEqual(minimum - 0.01);
  if (axes === "both") {
    expect(box.width).toBeGreaterThanOrEqual(minimum - 0.01);
  }
}

/** Fails when the page is wider than its viewport and so scrolls sideways. */
export async function expectNoSidewaysScroll(
  page: Page,
  message?: string,
): Promise<void> {
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(scrollWidth, message).toBeLessThanOrEqual(clientWidth);
}

/** Options for {@link settledScrollLeft}. */
interface SettledScrollOptions {
  /**
   * Pixels the region must have scrolled before a steady reading counts as
   * settled, default 1. With no floor the helper settles on the origin the
   * region has not left yet, so the default waits for the scroll to start;
   * pass 0 where the wait is for a return to the origin.
   */
  readonly minimum?: number;
}

/**
 * Frames, and milliseconds, `scrollLeft` must hold one value before it counts
 * as settled. A smooth keyboard scroll can repeat a value for a frame in the
 * middle of its animation, so two equal reads are not rest; a run of frames
 * that also spans real time is.
 */
const SCROLL_SETTLED_FRAMES = 10;
const SCROLL_SETTLED_MS = 150;

/** How long a scroll may take to settle before the helper fails. */
const SCROLL_SETTLE_TIMEOUT_MS = 5_000;

/**
 * Reads `scrollLeft` once it stops moving.
 *
 * A scroll started by a key press takes time to come to rest, and a second
 * key sent while it is still running is swallowed, so a test that presses
 * twice in a row sees the region refuse to move rather than the engine
 * coalescing the two. The value is sampled on animation frames inside the
 * page and counts as settled only once it has stayed unchanged for
 * SCROLL_SETTLED_FRAMES frames and SCROLL_SETTLED_MS milliseconds.
 */
export async function settledScrollLeft(
  region: Locator,
  options: SettledScrollOptions = {},
): Promise<number> {
  return region.evaluate(
    async (element, { floor, frames, milliseconds, timeout }) => {
      const nextFrame = (): Promise<number> =>
        new Promise((resolve) => {
          requestAnimationFrame(resolve);
        });
      const started = performance.now();
      let value = element.scrollLeft;
      let unchangedSince = started;
      let unchangedFrames = 0;
      for (;;) {
        const now = await nextFrame();
        const current = element.scrollLeft;
        if (current === value) {
          unchangedFrames += 1;
        } else {
          value = current;
          unchangedSince = now;
          unchangedFrames = 0;
        }
        if (
          value >= floor &&
          unchangedFrames >= frames &&
          now - unchangedSince >= milliseconds
        ) {
          return value;
        }
        if (now - started > timeout) {
          throw new Error(
            `scrollLeft did not settle at or past ${String(floor)} within ${String(timeout)} ms; it last read ${String(value)}.`,
          );
        }
      }
    },
    {
      floor: options.minimum ?? 1,
      frames: SCROLL_SETTLED_FRAMES,
      milliseconds: SCROLL_SETTLED_MS,
      timeout: SCROLL_SETTLE_TIMEOUT_MS,
    },
  );
}

/** The first row of a grid whose text holds the name. */
export function gridRow(grid: Locator, name: string): Locator {
  return grid.getByRole("row").filter({ hasText: name }).first();
}

/**
 * Selects the second vessel of the showcase's Fleet grid with a click and
 * returns its row. A selected grid row puts the selected fill, a row state
 * nothing else on the page shows, into a capture or under an audit. The
 * baselines and the theme audit both start here, so the pixels one takes are
 * the state the other grades. The pointer is left on the row.
 */
export async function selectFleetRow(page: Page): Promise<Locator> {
  const row = gridRow(page.getByRole("grid", { name: "Fleet" }), "Vessel 002");
  await row.click();
  await expect(row).toHaveAttribute("aria-selected", "true");
  return row;
}

/** The panel page's inline reset confirmation. */
export function resetConfirmation(page: Page): Locator {
  return page.getByRole("region", { name: "Reset configuration?" });
}

/**
 * Moves the pointer off the panel's controls, so a rest capture shows no
 * hover state: clicking a control leaves the pointer resting on it. The page
 * corner is the panel's own padding, which paints no hover. The grid paints
 * row and header hover from React Aria's `data-hovered` marker rather than
 * `:hover`, so a marker left anywhere in the panel counts as a control under
 * the pointer too.
 */
export async function movePointerOffPanel(page: Page): Promise<void> {
  await page.mouse.move(0, 0);
  expect(
    await page.evaluate(
      (root) =>
        document.querySelector(`${root} [data-hovered]`) === null &&
        [...document.querySelectorAll(`${root} :hover`)].every(
          (element) =>
            element.closest(
              'a, button, input, label, select, textarea, [role="button"], [role="radio"], [role="row"]',
            ) === null,
        ),
      PANEL_ROOT_SELECTOR,
    ),
    "A panel control is still under the pointer.",
  ).toBe(true);
}

/**
 * Waits for a number of animation frames, default two, so layout and the
 * measurements a component schedules for itself have run before a spec reads
 * them.
 */
export async function settleFrames(page: Page, frames = 2): Promise<void> {
  await page.evaluate(async (count) => {
    for (let frame = 0; frame < count; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }
  }, frames);
}

/**
 * Stops every transition, and every animation unless told otherwise, for the
 * rest of the page's life. A capture or an audit taken mid-flight reads
 * colors composited against what is behind the element, and a toast enters
 * on a keyframe animation rather than a transition, so both stop by default.
 */
export async function freezeMotion(
  page: Page,
  { animations = true }: { readonly animations?: boolean } = {},
): Promise<void> {
  await page.addStyleTag({
    content: animations
      ? "* { transition: none !important; animation: none !important; }"
      : "* { transition: none !important; }",
  });
}

/**
 * Waits for every running transition and animation to finish.
 *
 * An axe pass that starts while an overlay is still fading measures colors
 * composited against whatever is behind it, not the ones the tokens set, and
 * reports a contrast failure that does not exist once the paint settles.
 */
export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finishing = document
      .getAnimations()
      // A looping animation, such as the spinner or the indeterminate progress
      // fill, never finishes, so waiting on it would hang rather than settle.
      .filter(
        (animation) =>
          animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY,
      )
      .map((animation) => animation.finished.catch(() => undefined));
    await Promise.all(finishing);
  });
}

/**
 * Runs axe over the page as it stands, color-contrast included, and fails on
 * any violation. Open overlays and enqueued toasts are part of the page, so
 * call it with those states present. A rule is left out only with a reason,
 * so every exception reads as a documented limitation at its call site.
 */
export async function expectNoAxeViolations(
  page: Page,
  options: AxeOptions = {},
): Promise<void> {
  const exceptions = options.disableRules ?? [];
  for (const exception of exceptions) {
    expect(exception.reason.trim().length).toBeGreaterThan(0);
  }
  const results = await new AxeBuilder({ page })
    .disableRules(exceptions.map((exception) => exception.id))
    .analyze();
  expect(results.violations).toEqual([]);
}

/** Why an audit under forced colors leaves axe's contrast rule out. */
export const FORCED_COLORS_CONTRAST_EXCEPTION: AxeRuleException = {
  id: "color-contrast",
  reason:
    "Under forced colors the browser replaces author colors with the system palette at paint time while computed values keep the author colors, so axe grades pairs such as Dark text over a forced Canvas background that the user never sees; the contrast of the system palette belongs to the operating system.",
};

interface BrowserIssue {
  readonly kind: "console.error" | "pageerror";
  readonly pageUrl: string;
  readonly sourceUrl?: string | undefined;
  readonly text: string;
}

interface BrowserErrorFixture {
  readonly browserErrorCapture: undefined;
}

function isExpectedCspViolation(issue: BrowserIssue): boolean {
  if (issue.kind !== "console.error") return false;
  let location: URL;
  try {
    location = new URL(issue.pageUrl);
  } catch {
    return false;
  }
  const mode = location.searchParams.get("mode");
  return (
    location.pathname === CSP_FIXTURE_PATH &&
    (mode === "missing" || mode === "wrong") &&
    /refused to apply (?:(?:an? )?inline style|a stylesheet)|applying inline style violates|blocked an inline style/i.test(
      issue.text,
    ) &&
    /content[- ]security[- ]policy|style-src(?:-elem)?/i.test(issue.text)
  );
}

export const test = base.extend<BrowserErrorFixture>({
  browserErrorCapture: [
    async ({ page }, provide) => {
      const issues: BrowserIssue[] = [];
      const onConsole = (message: ConsoleMessage): void => {
        if (message.type() !== "error") return;
        issues.push({
          kind: "console.error",
          pageUrl: page.url(),
          sourceUrl: message.location().url || undefined,
          text: message.text(),
        });
      };
      const onPageError = (error: Error): void => {
        issues.push({
          kind: "pageerror",
          pageUrl: page.url(),
          text: error.message,
        });
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      try {
        await provide(undefined);
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }

      const unexpected = issues.filter(
        (issue) => !isExpectedCspViolation(issue),
      );
      expect(
        unexpected,
        "Unexpected browser console errors or uncaught page errors were recorded.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Skips the test in every project but desktop Chromium, with the reason the
 * report shows.
 */
export function skipOutsideChromium(
  testInfo: TestInfo,
  reason = "Checked in Chromium only.",
): void {
  test.skip(testInfo.project.name !== CHROMIUM_PROJECT, reason);
}

export type { Locator, Page, TestInfo };
export { expect };
