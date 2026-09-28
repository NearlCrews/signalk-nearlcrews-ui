import { expect, type Page, settleFrames, test } from "./fixtures.js";

/*
 * PanelShell places its theme selector after the panel content, and panels
 * end with a SaveActionBar docked to the viewport bottom, so the selector
 * follows the bar. A consumer once padded its shell by the sticky clearance
 * because it found the last theme radios under the docked bar at the end of
 * the page. These specs pin the rule that makes the padding unnecessary: the
 * bar docks only while its anchor lies below the docking edge, and the anchor
 * keeps the bar's height in flow, so at the end of the page the bar is back
 * in flow above the selector.
 */

/** The accessible names of the five theme radios, in order. */
const THEME_NAMES = [
  "Match Admin",
  "Match device",
  "Light",
  "Dark",
  "Night",
] as const;

/**
 * Frames the bar needs to settle: one for the scroll or focus that moves it,
 * one for its own measuring pass, and one for the placement that pass commits.
 */
const BAR_SETTLE_FRAMES = 3;

/**
 * Opens the live-regions page, a PanelShell with `themeToggle="end"` whose
 * last child is a dirty SaveActionBar, and gives it the shape of a panel in
 * the Admin: host content above and below it, and panel content taller than
 * the viewport, so the bar docks while its anchor is below the fold.
 */
async function openTallPanel(page: Page): Promise<void> {
  await page.goto("/live-regions.html");
  await expect(page.locator("[data-snui-action-bar]")).toBeVisible();
  await page.evaluate(() => {
    const root = document.getElementById("root");
    const section = document.querySelector("[data-snui-root] .snui-section");
    if (root === null || section === null) {
      throw new Error("The live-regions fixture did not render its panel.");
    }
    const above = document.createElement("div");
    above.style.blockSize = "1200px";
    above.textContent = "Host content above the panel";
    const footer = document.createElement("footer");
    footer.style.blockSize = "60px";
    footer.textContent = "Host footer";
    const spacer = document.createElement("div");
    spacer.style.blockSize = `${String(Math.max(900, innerHeight * 2))}px`;
    spacer.textContent = "Panel content taller than the viewport";
    root.before(above);
    root.after(footer);
    section.append(spacer);
  });
  await settleFrames(page, BAR_SETTLE_FRAMES);
}

/** Scrolls the panel's top edge on screen, which docks the bar. */
async function scrollUntilDocked(page: Page): Promise<void> {
  await page.evaluate(() => {
    const panel = document.querySelector("[data-snui-root]");
    if (panel === null) throw new Error("No panel root.");
    scrollTo(0, panel.getBoundingClientRect().top + scrollY - 40);
  });
  await settleFrames(page, BAR_SETTLE_FRAMES);
  await expect(page.locator("[data-snui-action-bar]")).toHaveAttribute(
    "data-snui-docked",
    "",
  );
}

interface RadioHit {
  readonly coveredByBar: boolean;
  readonly name: string;
  readonly onScreen: boolean;
  readonly reachable: boolean;
}

/** What a press at each theme radio's center would land on. */
function radioHits(page: Page): Promise<RadioHit[]> {
  return page.evaluate((names: readonly string[]) => {
    const bar = document.querySelector("[data-snui-action-bar]");
    return [...document.querySelectorAll('[role="radio"]')]
      .filter((radio) => names.includes(radio.textContent.trim()))
      .map((radio) => {
        const box = radio.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const onScreen =
          x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight;
        const hit = onScreen ? document.elementFromPoint(x, y) : null;
        return {
          coveredByBar: hit !== null && bar?.contains(hit) === true,
          name: radio.textContent.trim(),
          onScreen,
          reachable: hit !== null && radio.contains(hit),
        };
      });
  }, THEME_NAMES);
}

/** Fails unless every theme radio can be pressed where it is drawn. */
async function expectEveryThemeReachable(page: Page): Promise<void> {
  const hits = await radioHits(page);
  expect(hits.map((hit) => hit.name)).toEqual([...THEME_NAMES]);
  for (const hit of hits) {
    expect(hit.coveredByBar, `${hit.name} is under the docked bar`).toBe(false);
    expect(hit.onScreen, `${hit.name} is off screen`).toBe(true);
    expect(hit.reachable, `${hit.name} cannot be pressed`).toBe(true);
  }
}

test.beforeEach(async ({ page }) => {
  await openTallPanel(page);
});

test("releases the docked bar above the theme selector at the end of the page", async ({
  page,
}) => {
  const bar = page.locator("[data-snui-action-bar]");

  await scrollUntilDocked(page);
  await page.evaluate(() => {
    scrollTo(0, document.documentElement.scrollHeight);
  });
  await settleFrames(page, BAR_SETTLE_FRAMES);
  await expect(bar).not.toHaveAttribute("data-snui-docked");
  await expectEveryThemeReachable(page);

  // Scrolling there a step at a time, as a reader does, ends the same way.
  await scrollUntilDocked(page);
  const steps = await page.evaluate(() =>
    Math.ceil((document.documentElement.scrollHeight - scrollY) / 120),
  );
  for (let step = 0; step < steps; step += 1) {
    await page.evaluate(() => {
      scrollBy(0, 120);
    });
    await settleFrames(page, BAR_SETTLE_FRAMES);
  }
  await expect(bar).not.toHaveAttribute("data-snui-docked");
  await expectEveryThemeReachable(page);
});

test("reaches the theme selector from the docked bar by keyboard and by press", async ({
  page,
}) => {
  const bar = page.locator("[data-snui-action-bar]");

  await scrollUntilDocked(page);
  await page.getByRole("button", { name: "Save" }).focus();
  // The theme selector is a single tab stop after the bar's actions.
  let onTheme = false;
  for (let step = 0; step < 8 && !onTheme; step += 1) {
    await page.keyboard.press("Tab");
    onTheme = await page.evaluate(
      () => document.activeElement?.getAttribute("role") === "radio",
    );
  }
  expect(onTheme).toBe(true);
  await settleFrames(page, BAR_SETTLE_FRAMES);
  const focusedHit = await page.evaluate(() => {
    const active = document.activeElement;
    const docked = document.querySelector("[data-snui-action-bar]");
    if (active === null || docked === null) return null;
    const box = active.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return {
      coveredByBar: hit !== null && docked.contains(hit),
      reachable: hit !== null && active.contains(hit),
    };
  });
  expect(focusedHit).toEqual({ coveredByBar: false, reachable: true });

  // Scrolling back up with focus left on the selector keeps the reader where
  // they scrolled to: the bar docks, and the page is not pulled back down to
  // the focused radio, which is off screen below the bar rather than under
  // it.
  await scrollUntilDocked(page);
  const heldAt = await page.evaluate(() => scrollY);
  await settleFrames(page, BAR_SETTLE_FRAMES);
  expect(await page.evaluate(() => scrollY)).toBe(heldAt);
  expect(
    await page.evaluate(
      () => document.activeElement?.getAttribute("role") === "radio",
    ),
  ).toBe(true);

  // A consumer test presses the last theme from wherever the page stands, and
  // the press lands without the bar intercepting it.
  await page.getByRole("radio", { name: "Night" }).click({ timeout: 5_000 });
  await expect(page.locator("[data-snui-root]")).toHaveAttribute(
    "data-snui-theme",
    "night",
  );
  await expect(bar).not.toHaveAttribute("data-snui-docked");
});

interface ContentEdges {
  readonly left: number;
  readonly right: number;
}

/**
 * The inline edges of the content box of the panel's first section and of the
 * action bar: inside the border and the inline padding, where the section's
 * content and the bar's status and buttons start and end.
 */
function contentEdges(
  page: Page,
): Promise<{ readonly bar: ContentEdges; readonly section: ContentEdges }> {
  return page.evaluate(() => {
    const edgesOf = (selector: string): ContentEdges => {
      const element = document.querySelector(selector);
      if (element === null) throw new Error(`No ${selector} on the page.`);
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left:
          box.left +
          Number.parseFloat(style.borderLeftWidth) +
          Number.parseFloat(style.paddingLeft),
        right:
          box.right -
          Number.parseFloat(style.borderRightWidth) -
          Number.parseFloat(style.paddingRight),
      };
    };
    return {
      bar: edgesOf("[data-snui-action-bar]"),
      section: edgesOf("[data-snui-root] .snui-section"),
    };
  });
}

/** Fails unless the bar's content edges match the section's, to the pixel. */
async function expectBarAlignedWithSection(page: Page): Promise<void> {
  const { bar, section } = await contentEdges(page);
  expect(Math.abs(bar.left - section.left)).toBeLessThan(0.5);
  expect(Math.abs(bar.right - section.right)).toBeLessThan(0.5);
}

test("lines the bar's status and buttons up with the section content above it", async ({
  page,
}) => {
  const bar = page.locator("[data-snui-action-bar]");

  // The save bar ends nearly every panel, under a column of sections, so its
  // content keeps the sections' inline inset, docked and in flow alike, and
  // at the narrow panel width the mobile project runs at.
  await scrollUntilDocked(page);
  await expectBarAlignedWithSection(page);

  await page.evaluate(() => {
    scrollTo(0, document.documentElement.scrollHeight);
  });
  await settleFrames(page, BAR_SETTLE_FRAMES);
  await expect(bar).not.toHaveAttribute("data-snui-docked");
  await expectBarAlignedWithSection(page);
});
