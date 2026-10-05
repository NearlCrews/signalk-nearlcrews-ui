import { THEME_STORAGE_KEY } from "../../src/theme/contract.js";
import {
  backgroundOf,
  boxOf,
  controlTargetFloor,
  emulateForcedColors,
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  expectProjectPointer,
  expectSolidOutline,
  expectTargetFloor,
  FORCED_COLORS_CONTRAST_EXCEPTION,
  FULL_PAGE_SNAPSHOT,
  freezeMotion,
  type Locator,
  MOBILE_PROJECT,
  matchBaseline,
  movePointerOffPanel,
  type Page,
  panelRoot,
  resetConfirmation,
  selectTheme,
  settleFrames,
  skipOutsideChromium,
  styleOf,
  systemColors,
  type TestInfo,
  type ThemeName,
  test,
  tokenColor,
  WEBKIT_PROJECT,
} from "./fixtures.js";

/*
 * The palette colors these specs expect, as a computed style writes them.
 * They are spelled here rather than read from the token tables, because they
 * are the one place the browser suite pins the palette's values.
 */
const LIGHT_BACKGROUND = "rgb(244, 246, 248)";
const LIGHT_TEXT = "rgb(24, 32, 44)";
const LIGHT_HOVER_FILL = "rgb(238, 242, 247)";
const LIGHT_DANGER = "rgb(180, 35, 24)";
/** Light danger as the token table writes it, which a custom property keeps. */
const LIGHT_DANGER_TOKEN = "#b42318";
const DARK_BACKGROUND = "rgb(16, 19, 28)";
const DARK_TEXT = "rgb(245, 247, 250)";
const DARK_DANGER = "rgb(255, 139, 130)";
const NIGHT_SURFACE = "rgb(16, 0, 0)";
const NIGHT_TEXT = "rgb(255, 64, 64)";
const NIGHT_ACCENT_FILL = "rgb(236, 56, 56)";
const NIGHT_ON_ACCENT = "rgb(16, 0, 0)";
const NIGHT_LINK = "rgb(255, 56, 56)";
const NIGHT_DANGER = "rgb(255, 48, 48)";

/** The viewport height the Admin host tests measure the docked bar in. */
const ADMIN_HOST_HEIGHT = 600;

/** Why a hover check skips the project that emulates a phone. */
const HOVER_NEEDS_A_HOVER_POINTER =
  "Hover feedback is gated on hover-capable pointers, which a touch device lacks.";

/** Pixels of the panel action the docked bar is scrolled to cover. */
const DOCKED_BAR_OVERLAP = 8;

/**
 * Pixels past the docking line the return-to-flow check scrolls. The docking
 * decision holds its state inside a hysteresis band, so the check has to clear
 * that band rather than rest on the line.
 */
const DOCK_RELEASE_MARGIN = 4;

/**
 * Frames an event may take to leave a box unchanged. Two consecutive equal
 * frames are what settling means, so three is the floor and four leaves room
 * for the single measuring pass the bar is allowed after the event.
 */
const SETTLED_FRAME_BUDGET = 4;

/** Milliseconds one press may spend waiting for a control to become stable. */
const ACTIONABILITY_TIMEOUT = 2_000;

const ACTION_BAR_SELECTOR = ".snui-action-bar";
const PANEL_ACTION_SELECTOR = '[data-testid="admin-host-focus-target"]';

interface DockedBarOverlap {
  readonly action: Locator;
  readonly bar: Locator;
}

interface StabilityProbe {
  /** Selector of a control to focus before the frames are counted. */
  readonly focus?: string;
  readonly limit: number;
  /** Selector of the element whose box has to hold still. */
  readonly measure: string;
}

/**
 * Opens the panel page, with the query flags a test asks for, and waits for
 * the panel. Each test calls it after its skips, so a skipped test loads
 * nothing.
 */
async function openPanel(page: Page, query = ""): Promise<void> {
  await page.goto(`/${query}`);
  await expect(
    page.getByRole("heading", { name: "Weather provider" }),
  ).toBeVisible();
}

/**
 * Opens the panel inside the unconstrained Admin host at the given viewport
 * width, with any further query flags.
 */
async function openAdminHost(
  page: Page,
  width: number,
  flags = "",
): Promise<void> {
  await page.setViewportSize({ width, height: ADMIN_HOST_HEIGHT });
  await openPanel(page, `?admin-host=1${flags}`);
}

/** The theme preference the panel has stored, or null before a choice. */
function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    THEME_STORAGE_KEY,
  );
}

/** The panel's Reset action, which opens the inline confirmation. */
function resetTrigger(page: Page): Locator {
  return page.getByRole("button", { name: "Reset", exact: true }).last();
}

/** Opens the inline reset confirmation and returns its region. */
async function openResetConfirmation(page: Page): Promise<Locator> {
  await resetTrigger(page).click();
  return resetConfirmation(page);
}

/** How far down the document an element's top edge sits. */
function documentTopOf(locator: Locator): Promise<number> {
  return locator.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
}

/**
 * Whether the docked bar sits over its in-flow anchor: the same inline start
 * and width, and the same height where the anchor has caught up with it.
 */
async function barMatchesAnchor(
  anchor: Locator,
  bar: Locator,
  { height }: { readonly height: boolean },
): Promise<boolean> {
  const [anchorBox, barBox] = await Promise.all([
    anchor.boundingBox(),
    bar.boundingBox(),
  ]);
  return (
    anchorBox !== null &&
    barBox !== null &&
    Math.abs(anchorBox.x - barBox.x) < 0.1 &&
    Math.abs(anchorBox.width - barBox.width) < 0.1 &&
    (!height || Math.abs(anchorBox.height - barBox.height) < 0.1)
  );
}

/**
 * Counts the frames an element's box takes to hold still, or reports null when
 * it never does. Playwright dispatches a click only after two consecutive
 * frames report the same box, so that pair is what settling means here, and the
 * count is the frame the pair completed on. The optional focus runs in the same
 * task as the count so the frames after it are the ones measured.
 */
async function framesUntilStable(
  page: Page,
  probe: StabilityProbe,
): Promise<number | null> {
  return page.evaluate(async ({ focus, limit, measure }: StabilityProbe) => {
    const element = document.querySelector(measure);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Expected an HTML element matching ${measure}.`);
    }
    if (focus !== undefined) {
      const focusTarget = document.querySelector(focus);
      if (!(focusTarget instanceof HTMLElement)) {
        throw new Error(`Expected an HTML element matching ${focus}.`);
      }
      focusTarget.focus({ preventScroll: true });
    }

    const box = (): string => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].join();
    };
    let previous = "";
    let stable = 0;
    for (let frame = 1; frame <= limit; frame += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const current = box();
      if (current !== previous) {
        previous = current;
        stable = 0;
        continue;
      }
      stable += 1;
      if (stable === 2) return frame;
    }
    return null;
  }, probe);
}

/**
 * Opens the unconstrained Admin host, waits for the bar to dock, then scrolls
 * a panel action until the bar covers its bottom edge: the last panel action,
 * or the one inside the panel's nested scroller. The action's center stays
 * clear of the bar, so a press lands on the action itself, and a clearance
 * scroll, which only keyboard and programmatic focus ask for, is the one
 * thing that could move it afterwards.
 */
async function overlapDockedActionBar(
  page: Page,
  width: number,
  { nested = false }: { readonly nested?: boolean } = {},
): Promise<DockedBarOverlap> {
  await openAdminHost(page, width, nested ? "&nested-scroller=1" : "");

  const bar = page.locator(ACTION_BAR_SELECTOR);
  const action = page.getByTestId(
    nested ? "admin-host-nested-target" : "admin-host-focus-target",
  );
  await expect(bar).toHaveCSS("position", "fixed");

  const [barBox, actionBox] = await Promise.all([boxOf(bar), boxOf(action)]);
  await page.evaluate(
    (top) => window.scrollBy({ behavior: "auto", top }),
    actionBox.y + actionBox.height - barBox.y - DOCKED_BAR_OVERLAP,
  );
  return { action, bar };
}

/** Reports whether the action's bottom edge sits clear of the docked bar. */
async function actionClearsBar({
  action,
  bar,
}: DockedBarOverlap): Promise<boolean> {
  const [barBox, actionBox] = await Promise.all([
    bar.boundingBox(),
    action.boundingBox(),
  ]);
  if (barBox === null || actionBox === null) return false;
  return actionBox.y + actionBox.height <= barBox.y;
}

test("runs only when native CSS scope is available", async ({ page }) => {
  await openPanel(page);
  expect(await page.evaluate(() => typeof window.CSSScopeRule)).toBe(
    "function",
  );
});

test("renders all themes and component states without axe violations", async ({
  page,
}) => {
  test.slow();
  await openPanel(page, "?states=1");
  // Transitions only: the audit keeps the loading button's spinner running.
  await freezeMotion(page, { animations: false });
  await page.getByRole("button", { name: "Advanced settings" }).click();
  const confirmation = await openResetConfirmation(page);

  for (const [theme, dangerColor, textColor] of [
    ["Light", LIGHT_DANGER, LIGHT_TEXT],
    ["Dark", DARK_DANGER, DARK_TEXT],
    ["Night", NIGHT_DANGER, NIGHT_TEXT],
  ] as const) {
    await selectTheme(page, theme);
    await expect(panelRoot(page)).toHaveCSS("color", textColor);
    await expect(confirmation.getByRole("button", { name: "Reset" })).toHaveCSS(
      "color",
      dangerColor,
    );
    await expect(
      page.getByRole("textbox", { name: "Invalid server URL" }),
    ).toHaveCSS("border-color", dangerColor);
    await settleFrames(page);
    await expectNoAxeViolations(page);
  }
});

test("follows the host theme for a fresh Auto profile", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await openPanel(page);
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });

  // An unresolved preference stays Auto, which leaves data-snui-theme off the
  // root so an explicit host theme can apply.
  const root = panelRoot(page);
  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", DARK_BACKGROUND);
  await expect(page.getByRole("radio", { name: "Match Admin" })).toBeChecked();
  expect(await storedTheme(page)).toBeNull();
});

test("persists explicit themes across reloads", async ({ page }) => {
  await openPanel(page);
  await selectTheme(page, "Night");

  await page.reload();
  await expect(panelRoot(page)).toHaveAttribute("data-snui-theme", "night");
});

test("persists an explicit Auto preference across reloads", async ({
  page,
}) => {
  await openPanel(page);
  await page.getByRole("radio", { name: "Match Admin" }).click();
  await expect(panelRoot(page)).not.toHaveAttribute("data-snui-theme");
  expect(await storedTheme(page)).toBe("auto");

  await page.reload();
  await expect(page.getByRole("radio", { name: "Match Admin" })).toBeChecked();
  await expect(panelRoot(page)).not.toHaveAttribute("data-snui-theme");
});

test("uses the host theme while Auto is selected", async ({ page }) => {
  await openPanel(page);
  await page.getByRole("radio", { name: "Match Admin" }).click();
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });

  const root = panelRoot(page);
  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", DARK_BACKGROUND);
});

test("uses the light fallback while Auto is selected without a host theme", async ({
  page,
}) => {
  await openPanel(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-bs-theme");
    document.documentElement.removeAttribute("data-coreui-theme");
    document.documentElement.classList.remove("dark-mode");
  });
  await page.getByRole("radio", { name: "Match Admin" }).click();
  const root = panelRoot(page);

  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", LIGHT_BACKGROUND);
  await expect(root).toHaveCSS("color", LIGHT_TEXT);
});

test("neutralizes representative Bootstrap Reboot rules inside the panel", async ({
  page,
}) => {
  await openPanel(page, "?host-reset=1");

  const fixture = page.getByTestId("host-reset-fixture");
  const styles = await fixture.evaluate((element) => {
    const heading = element.querySelector("h2");
    const paragraph = element.querySelector("p");
    const legend = element.querySelector("legend");
    if (heading === null || paragraph === null || legend === null) {
      throw new Error("Missing hostile-host reset fixture elements.");
    }
    const headingStyle = getComputedStyle(heading);
    const paragraphStyle = getComputedStyle(paragraph);
    const legendStyle = getComputedStyle(legend);
    return {
      headingMargin: headingStyle.margin,
      paragraphMargin: paragraphStyle.margin,
      legendFloat: legendStyle.float,
      legendMarginBottom: legendStyle.marginBottom,
      legendFontMatchesParent:
        legend.parentElement !== null &&
        legendStyle.fontSize ===
          getComputedStyle(legend.parentElement).fontSize,
    };
  });

  expect(styles).toEqual({
    headingMargin: "0px",
    paragraphMargin: "0px",
    legendFloat: "none",
    legendMarginBottom: "0px",
    legendFontMatchesParent: true,
  });
});

test("uses the operating-system theme while System is selected", async ({
  page,
}) => {
  await openPanel(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("radio", { name: "Match device" }).click();
  const root = panelRoot(page);

  await expect(root).toHaveAttribute("data-snui-theme", "system");
  await expect(root).toHaveCSS("background-color", DARK_BACKGROUND);
  await expect(root).toHaveCSS("color", DARK_TEXT);

  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveCSS("background-color", LIGHT_BACKGROUND);
  await expect(root).toHaveCSS("color", LIGHT_TEXT);
});

test("keeps library styling inside the panel root", async ({
  page,
}, testInfo) => {
  await openPanel(page);
  const outside = page.locator("#outside-button");
  const inside = page.getByRole("button", { name: "Save" });
  const expectedHeight = `${String(controlTargetFloor(testInfo))}px`;

  await expect(inside).toHaveCSS("min-height", expectedHeight);
  await expect(outside).not.toHaveCSS("min-height", expectedHeight);
  await expect(outside).toHaveCSS("display", "none");
  expect(await styleOf(outside, "--snui-color-text")).toBe("");

  await panelRoot(page).evaluate((root) => {
    const nestedRoot = document.createElement("div");
    nestedRoot.className = "snui-root";
    nestedRoot.dataset.snuiVersion = "99.0.0";
    const nestedButton = document.createElement("button");
    nestedButton.id = "nested-version-button";
    nestedButton.className = "snui-button";
    nestedButton.textContent = "Nested version";
    const reentryRoot = document.createElement("div");
    reentryRoot.className = "snui-root";
    reentryRoot.dataset.snuiVersion = root.dataset.snuiVersion ?? "";
    reentryRoot.dataset.snuiTheme = "night";
    const reentryButton = document.createElement("button");
    reentryButton.id = "reentry-version-button";
    reentryButton.className = "snui-button snui-button--primary";
    reentryButton.textContent = "Current version re-entry";
    reentryRoot.append(reentryButton);
    nestedRoot.append(nestedButton, reentryRoot);
    root.append(nestedRoot);
  });
  await expect(page.locator("#nested-version-button")).toHaveCSS(
    "min-height",
    "0px",
  );
  const reentryButton = page.locator("#reentry-version-button");
  await expect(reentryButton).toHaveCSS("min-height", expectedHeight);
  await expect(reentryButton).toHaveCSS("background-color", NIGHT_ACCENT_FILL);
  await reentryButton.focus();
  await expect(reentryButton).toHaveCSS("outline-width", "2px");
});

test("supports collapsible and segmented-control keyboard navigation", async ({
  page,
}) => {
  await openPanel(page);
  const toggle = page.getByRole("button", { name: "Advanced settings" });

  await toggle.focus();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const minimal = page.getByRole("radio", { name: "Minimal" });
  const normal = page.getByRole("radio", { name: "Normal" });
  const verbose = page.getByRole("radio", { name: "Verbose" });
  await normal.focus();
  await page.keyboard.press("ArrowRight");
  await expect(verbose).toBeFocused();
  await expect(verbose).toHaveAttribute("aria-checked", "true");
  await expect(verbose).toHaveAttribute("tabindex", "0");
  await expect(verbose).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Home");
  await expect(minimal).toBeFocused();
  await expect(minimal).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  await expect(verbose).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(normal).toBeFocused();
  await expect(normal).toHaveAttribute("aria-checked", "true");

  const [groupBox, optionBox] = await Promise.all([
    boxOf(normal.locator("..")),
    boxOf(normal),
  ]);
  expect(optionBox.x - groupBox.x).toBeGreaterThanOrEqual(4);
  expect(
    groupBox.x + groupBox.width - optionBox.x - optionBox.width,
  ).toBeGreaterThanOrEqual(4);
});

test("uses right-to-left keyboard order and mirrored collapsible carets", async ({
  page,
}) => {
  await openPanel(page);
  const collapsible = page.locator(".snui-collapsible", {
    has: page.getByText("Advanced settings"),
  });
  const chevron = collapsible.locator(".snui-collapsible__chevron");
  const segmented = collapsible.locator(".snui-segmented");

  await collapsible.evaluate((element) => element.setAttribute("dir", "rtl"));
  await expect(chevron).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)");
  // U+203A is bidi mirrored, so the glyph is isolated left to right and the
  // transforms alone decide where it points: toward the title while
  // collapsed, down once open. Without the isolation the browser mirrors it
  // too, and the two flips cancel.
  await expect(chevron).toHaveCSS("direction", "ltr");
  await expect(chevron).toHaveCSS("unicode-bidi", "isolate");
  await collapsible.getByRole("button", { name: "Advanced settings" }).click();
  // scaleX(-1) rotate(90deg): the right-pointing glyph drawn pointing down.
  await expect(chevron).toHaveCSS("transform", "matrix(0, 1, 1, 0, 0, 0)");

  const normal = page.getByRole("radio", { name: "Normal" });
  const minimal = page.getByRole("radio", { name: "Minimal" });
  await segmented.evaluate((element) => element.setAttribute("dir", "rtl"));
  await normal.focus();
  await page.keyboard.press("ArrowRight");
  await expect(minimal).toBeFocused();
  await expect(minimal).toHaveAttribute("aria-checked", "true");
});

test("reflows from panel width rather than viewport width", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === MOBILE_PROJECT,
    "The reflow is measured from the desktop viewport.",
  );
  await openPanel(page);
  const root = panelRoot(page);
  const sectionHeader = page.locator(".snui-section__header").first();
  const content = root.locator(".snui-root__content");

  await expect(sectionHeader).toHaveCSS("flex-direction", "row");
  await root.evaluate((element) => {
    element.style.width = "320px";
  });
  await expect(sectionHeader).toHaveCSS("flex-direction", "column");
  await expect(content).toHaveCSS("padding-left", "12px");
  expect(page.viewportSize()).toMatchObject({ width: 1280 });
});

test("applies the control target floor to every interactive primitive", async ({
  page,
}, testInfo) => {
  const minimumHeight = controlTargetFloor(testInfo);
  await openPanel(page);
  await page.getByRole("button", { name: "Advanced settings" }).click();

  const targets = [
    page.getByRole("radio", { name: "Match Admin" }),
    page.getByRole("textbox", { name: /Server URL/ }),
    page.getByLabel("API token"),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
    page.getByRole("spinbutton", { name: "Refresh interval" }),
    page.getByRole("slider", { name: "Confidence threshold" }),
    page.getByRole("button", { name: "Advanced settings" }),
    page.getByRole("radio", { name: "Normal" }),
    page.getByRole("button", { name: "Save" }),
    page.getByRole("checkbox", { name: "Enable provider" }).locator(".."),
    page.getByRole("checkbox", { name: "Select all sources" }).locator(".."),
    page.getByRole("button", { name: "Dismiss" }),
    page.getByRole("button", { name: "Provider status and metrics" }),
  ];

  for (const target of targets) {
    await expectTargetFloor(target, minimumHeight);
  }

  // A checkbox with a hidden label has only its box to hit, so the control
  // must hold the floor in both axes.
  await expectTargetFloor(
    page
      .getByRole("checkbox", { name: "Include provider in exports" })
      .locator(".."),
    minimumHeight,
    "both",
  );

  // A button holding a single glyph has no text to widen it, so the floor has
  // to come from the control itself in both axes.
  await panelRoot(page)
    .locator(".snui-root__content")
    .evaluate((content) => {
      const glyphButton = document.createElement("button");
      glyphButton.id = "compact-glyph-button";
      glyphButton.type = "button";
      glyphButton.className =
        "snui-button snui-button--ghost snui-button--size-compact";
      glyphButton.textContent = "+";
      const iconButton = document.createElement("button");
      iconButton.id = "compact-icon-button";
      iconButton.type = "button";
      iconButton.className =
        "snui-button snui-button--ghost snui-button--size-compact snui-button--icon-only";
      iconButton.setAttribute("aria-label", "Add waypoint");
      iconButton.textContent = "+";
      content.append(glyphButton, iconButton);
    });

  for (const id of ["#compact-glyph-button", "#compact-icon-button"]) {
    await expectTargetFloor(page.locator(id), minimumHeight, "both");
  }
});

test("supports action-bearing collapsible status content", async ({ page }) => {
  await openPanel(page);
  const toggle = page.getByRole("button", {
    name: "Provider status and metrics",
  });
  const refresh = page.getByRole("button", { name: "Refresh" });

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Provider status and metrics",
    }),
  ).toBeVisible();
  await expect(page.getByText("3 checks healthy")).toBeVisible();
  await expect(refresh).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("region", { name: "Provider status and metrics" }),
  ).toBeVisible();
  await expect(
    page.locator(".snui-collapsible__summary--header", {
      hasText: "3 checks healthy",
    }),
  ).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Updates")).toBeVisible();
  await expect(page.getByText("3 checks healthy")).toBeHidden();
  await expect(refresh).toBeVisible();
  await expectNoAxeViolations(page);
});

test("provides hover and active feedback for raw action controls", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === MOBILE_PROJECT,
    HOVER_NEEDS_A_HOVER_POINTER,
  );
  await openPanel(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await selectTheme(page, "Light");
  for (const control of [
    page.getByRole("button", { name: "Dismiss" }),
    page.getByRole("button", { name: "Provider status and metrics" }),
    page.getByRole("button", { name: "Advanced settings" }),
  ]) {
    const initialBackground = await backgroundOf(control);
    await control.hover();
    await expect.poll(() => backgroundOf(control)).not.toBe(initialBackground);
    const hoverBackground = await backgroundOf(control);
    expect(hoverBackground).toBe(LIGHT_HOVER_FILL);

    await page.mouse.down();
    await expect.poll(() => backgroundOf(control)).not.toBe(hoverBackground);
    await page.mouse.up();
  }
});

test("provides segmented hover and active feedback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === MOBILE_PROJECT,
    HOVER_NEEDS_A_HOVER_POINTER,
  );
  await openPanel(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Advanced settings" }).click();
  const selected = page.getByRole("radio", { name: "Normal" });
  const unselected = page.getByRole("radio", { name: "Minimal" });

  const selectedBackground = await backgroundOf(selected);
  await selected.hover();
  await expect.poll(() => backgroundOf(selected)).not.toBe(selectedBackground);

  const unselectedBackground = await backgroundOf(unselected);
  await unselected.hover();
  await expect
    .poll(() => backgroundOf(unselected))
    .not.toBe(unselectedBackground);
  const hoverBackground = await backgroundOf(unselected);
  await page.mouse.down();
  await expect.poll(() => backgroundOf(unselected)).not.toBe(hoverBackground);
  await page.mouse.up();
});

test("keeps aria-disabled focus indicators fully opaque", async ({
  page,
}, testInfo) => {
  await openPanel(page, "?states=1");
  const button = page.getByRole("button", { name: "Unavailable here" });
  // A coarse pointer raises the second spacing step, and the gap between a
  // button's glyph and its label rides on that step.
  const expectedGap = testInfo.project.name === MOBILE_PROJECT ? "12px" : "8px";

  const disabledText = await tokenColor(
    panelRoot(page).first(),
    "--snui-color-text-disabled",
  );
  const content = button.locator(".snui-button__content");
  await expect(button).toHaveCSS("opacity", "1");
  await expect(button).toHaveCSS("color", disabledText);
  await expect(content).toHaveCSS("opacity", "1");
  await expect(content).toHaveCSS("display", "flex");
  await expect(content).toHaveCSS("column-gap", expectedGap);
  await button.focus();
  expect(
    Number.parseFloat(await styleOf(button, "outline-width")),
  ).toBeGreaterThanOrEqual(2);

  const nativeDisabled = page.getByRole("button", { name: "Disabled" });
  await nativeDisabled.evaluate((element) =>
    element.setAttribute("aria-disabled", "true"),
  );
  await expect(nativeDisabled).toHaveCSS("opacity", "1");
  await expect(nativeDisabled).toHaveCSS("color", disabledText);
  await expect(nativeDisabled.locator(".snui-button__content")).toHaveCSS(
    "opacity",
    "1",
  );
});

test("retains loading-button focus and suppresses repeat activation", async ({
  page,
}) => {
  await openPanel(page, "?states=1&focus-loading=1");
  const button = page.getByTestId("focus-loading-button");

  await button.click();
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveAccessibleName("Fixture configuration");
  await expect(button).toHaveAccessibleDescription("Saving");
  await expect(button).toHaveAttribute("data-activation-count", "1");

  await button.press("Enter");
  await button.press("Space");
  await button.evaluate((element) => (element as HTMLButtonElement).click());

  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("data-activation-count", "1");
});

test("keeps field-group actions in a compact desktop header", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === MOBILE_PROJECT,
    "A narrow panel moves the actions under the description.",
  );
  await openPanel(page);
  const fieldset = page.getByRole("group", { name: "Provider behavior" });
  const actions = fieldset.locator(".snui-field-group__actions");

  await expect(fieldset).toHaveCSS("display", "grid");
  await expect(actions).toHaveCSS("grid-column-start", "2");
  await expect(actions).toHaveCSS("grid-row-start", "1");
});

test("styles native text controls and links in Night mode", async ({
  page,
}) => {
  await openPanel(page);
  await selectTheme(page, "Night");
  const nightDisabledText = await tokenColor(
    panelRoot(page).first(),
    "--snui-color-text-disabled",
  );

  const controls = [
    page.getByLabel("API token"),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
  ];
  for (const control of controls) {
    await expect(control).toHaveCSS("background-color", NIGHT_SURFACE);
    await expect(control).toHaveCSS("color", NIGHT_TEXT);
  }

  const link = page.getByRole("link", {
    name: "Read the Signal K documentation",
  });
  await expect(link).toHaveCSS("color", NIGHT_LINK);
  await expect(link).toHaveCSS("text-decoration-line", "underline");

  for (const control of controls) {
    await control.evaluate((element) => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        element.disabled = true;
      }
    });
    await expect(control).toHaveCSS("opacity", "1");
    await expect(control).toHaveCSS("color", nightDisabledText);
  }
});

test("places the select indicator at the logical inline end", async ({
  page,
}) => {
  await openPanel(page);
  const select = page.getByRole("combobox", { name: "Provider mode" });
  const readIndicator = () =>
    select.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        paddingLeft: Number.parseFloat(styles.paddingLeft),
        paddingRight: Number.parseFloat(styles.paddingRight),
        positions: styles.backgroundPositionX.split(","),
      };
    });

  const ltr = await readIndicator();
  expect(ltr.paddingRight).toBeGreaterThan(ltr.paddingLeft);
  expect(ltr.positions.every((position) => position.includes("100%"))).toBe(
    true,
  );

  await select.evaluate((element) => element.setAttribute("dir", "rtl"));
  const rtl = await readIndicator();
  expect(rtl.paddingLeft).toBeGreaterThan(rtl.paddingRight);
  expect(rtl.positions.every((position) => !position.includes("100%"))).toBe(
    true,
  );
});

test("dismisses banners without coupling visibility to the library", async ({
  page,
}) => {
  await openPanel(page);
  const bannerText = page.getByText("Values are stored in SI");
  await expect(bannerText).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(bannerText).toBeHidden();
  await expect(page.getByRole("button", { name: "Save" })).toBeFocused();
});

test("styles checkbox and range validation consistently", async ({ page }) => {
  await openPanel(page, "?states=1");
  const checkbox = page.getByRole("checkbox", { name: "Missing agreement" });
  const range = page.getByRole("slider", {
    name: "Invalid confidence threshold",
  });

  await expect(checkbox).toHaveAttribute("aria-invalid", "true");
  await expect(checkbox).toHaveCSS("border-color", LIGHT_DANGER);
  await expect(range).toHaveAttribute("aria-invalid", "true");
  const rangeColors = await range.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      progress: styles.getPropertyValue("--snui-range-progress-color").trim(),
      track: styles.getPropertyValue("--snui-range-track-color").trim(),
    };
  });
  // Only the filled portion takes the danger color: recoloring the remainder
  // too would flatten the two halves into one bar, and the boundary between
  // them is where the value reads.
  expect(rangeColors.progress).toBe(LIGHT_DANGER_TOKEN);
  expect(rangeColors.track).not.toBe(LIGHT_DANGER_TOKEN);
});

test("uses inline confirmation with Escape, confirm, and managed focus", async ({
  page,
}) => {
  await openPanel(page);
  const trigger = resetTrigger(page);
  const confirmation = await openResetConfirmation(page);
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAccessibleDescription(
    /would perform the reset/,
  );

  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await confirmation.getByRole("button", { name: "Reset" }).click();
  await expect(confirmation).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("does not steal focus when confirmation busy state changes", async ({
  page,
}) => {
  await openPanel(page, "?states=1");
  const confirmation = await openResetConfirmation(page);
  const toggle = page.getByRole("button", {
    name: "Toggle confirmation busy",
  });

  await toggle.click();

  await expect(toggle).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-busy", "true");
});

test("retains focus when an internal confirmation action becomes busy", async ({
  page,
}) => {
  await openPanel(page, "?busy-on-confirm=1");
  const confirmation = await openResetConfirmation(page);

  const confirm = confirmation.getByRole("button", { name: "Reset" });
  await confirm.click();

  // Busy blocks Confirm through aria-disabled, so it stays in the tab order
  // and focus is never destroyed and chased.
  await expect(confirm).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-busy", "true");
});

test("focuses an initially busy confirmation container", async ({ page }) => {
  await openPanel(page, "?busy=1");
  const confirmation = await openResetConfirmation(page);
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-busy", "true");

  // Busy never closes the route out: Cancel keeps its enabled presentation
  // and Escape still dismisses the region.
  const cancel = confirmation.getByRole("button", { name: "Cancel" });
  await expect(cancel).not.toHaveAttribute("aria-disabled");
  await expect(cancel).toHaveCSS("cursor", "pointer");
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
});

test("renders compliant placeholders and a red-preserving Night accent", async ({
  page,
}) => {
  await openPanel(page, "?states=1");
  const placeholderOpacity = await page
    .getByRole("textbox", { name: /Server URL/ })
    .evaluate((element) => getComputedStyle(element, "::placeholder").opacity);
  expect(placeholderOpacity).toBe("1");

  await selectTheme(page, "Night");
  // Park the pointer so the selected option shows its rest fill, not hover.
  await movePointerOffPanel(page);
  const night = page.getByRole("radio", { name: "Night" });
  await expect(night).toHaveCSS("background-color", NIGHT_ACCENT_FILL);
  await expect(night).toHaveCSS("color", NIGHT_ON_ACCENT);

  for (const checkbox of [
    page.getByRole("checkbox", { name: "Enable provider" }),
    page.getByRole("checkbox", { name: "Partially configured option" }),
  ]) {
    expect(
      await checkbox.evaluate(
        (element) => getComputedStyle(element, "::before").borderBottomColor,
      ),
    ).toBe(NIGHT_ON_ACCENT);
  }
  expect(
    await page
      .getByRole("checkbox", { name: "Partially configured option" })
      .evaluate((element) => (element as HTMLInputElement).indeterminate),
  ).toBe(true);
});

/**
 * Consumer text with no break opportunity in it. A hyphen is one, so a
 * hyphenated string wraps whether or not the component lets it.
 */
const UNBROKEN_TEXT =
  "consumer_defined_content_with_a_deliberately_unbroken_value";

test("reflows state-heavy content at a 320 pixel viewport", async ({
  page,
}) => {
  await openPanel(page, "?states=1");
  await page.setViewportSize({ width: 320, height: 812 });
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await openResetConfirmation(page);
  await page
    .locator(".snui-collapsible__title", { hasText: "Advanced settings" })
    .evaluate((title) => {
      title.textContent =
        "Advanced_settings_with_a_deliberately_unbroken_consumer_defined_title";
    });
  await page
    .locator(".snui-collapsible__summary--header")
    .evaluate((summary) => {
      summary.textContent =
        "consumer_status_summary_with_a_deliberately_unbroken_value";
    });
  await page
    .locator(".snui-collapsible__actions .snui-button__content")
    .evaluate((action) => {
      action.textContent = "consumer_action_with_a_deliberately_unbroken_label";
    });
  // Each target holds the consumer's own text, and only its first text node
  // changes, so the markup a component builds around that text (a required
  // marker, the error glyph row, a button's content span) stays in the layout
  // being measured.
  for (const selector of [
    ".snui-section__description",
    ".snui-field__label",
    ".snui-field__description",
    ".snui-field-error__text",
    ".snui-field-group__description",
    ".snui-checkbox__label",
    ".snui-checkbox__description",
    ".snui-banner__actions .snui-button__content",
    ".snui-action-bar .snui-button__content",
    ".snui-inline-confirm__title",
    ".snui-inline-confirm__message",
  ]) {
    await page
      .locator(selector)
      .first()
      .evaluate(
        (element, { name, text }) => {
          const node = document
            .createTreeWalker(element, NodeFilter.SHOW_TEXT)
            .nextNode();
          if (node === null) throw new Error(`${name} holds no text.`);
          node.textContent = text;
        },
        { name: selector, text: UNBROKEN_TEXT },
      );
  }
  // The status slot takes any node, and a bare string is the one shape that
  // brings no wrapping rule of its own, so the slot is left holding one.
  await page
    .locator(".snui-action-bar__status")
    .first()
    .evaluate((status, text) => {
      status.textContent = text;
    }, UNBROKEN_TEXT);

  // The unbroken message wraps inside its own row beside the glyph. A message
  // that kept its width would run past the field even where an ancestor clips
  // it, so the row is measured as well as the page.
  const errorRow = await page
    .locator(".snui-field-error__text")
    .first()
    .evaluate((text) => {
      const row = text.closest(".snui-field-error__row");
      const glyph = row?.querySelector(".snui-field-error__tone-glyph") ?? null;
      const region = row?.parentElement ?? null;
      if (glyph === null || region === null) {
        throw new Error("The field error lost its glyph and message row.");
      }
      return {
        glyphRight: glyph.getBoundingClientRect().right,
        regionRight: region.getBoundingClientRect().right,
        textLeft: text.getBoundingClientRect().left,
        textRight: text.getBoundingClientRect().right,
      };
    });
  expect(
    errorRow.textLeft,
    "The field error message starts under its glyph.",
  ).toBeGreaterThanOrEqual(errorRow.glyphRight);
  expect(
    errorRow.textRight,
    "The field error message runs past its field.",
  ).toBeLessThanOrEqual(errorRow.regionRight + 0.5);

  const exactInput = page.getByRole("spinbutton", {
    name: "Confidence threshold exact value",
  });
  const unit = page.getByTestId("confidence-unit");
  await expect
    .poll(async () => {
      const [exactBox, unitBox] = await Promise.all([
        exactInput.boundingBox(),
        unit.boundingBox(),
      ]);
      if (exactBox === null || unitBox === null)
        return Number.POSITIVE_INFINITY;
      const exactCenter = exactBox.y + exactBox.height / 2;
      const unitCenter = unitBox.y + unitBox.height / 2;
      return Math.abs(exactCenter - unitCenter);
    })
    .toBeLessThan(1);

  const [exactBox, unitBox] = await Promise.all([
    boxOf(exactInput),
    boxOf(unit),
  ]);
  expect(unitBox.x).toBeGreaterThanOrEqual(exactBox.x + exactBox.width);

  await expectNoSidewaysScroll(
    page,
    "The page scrolls sideways at a 320 pixel viewport.",
  );

  // The theme options wrap rather than scroll here: a sideways scroller inside
  // the group carries no affordance, so a hidden last option would be a theme
  // the operator cannot find.
  const themeOptions = await page
    .locator(".snui-segmented__group")
    .last()
    .evaluate((group) => {
      const groupBox = group.getBoundingClientRect();
      return [...group.querySelectorAll('[role="radio"]')].map((option) => {
        const box = option.getBoundingClientRect();
        return {
          inside:
            box.left >= groupBox.left - 1 && box.right <= groupBox.right + 1,
          label: option.textContent || "",
        };
      });
    });
  expect(themeOptions.length).toBeGreaterThan(1);
  expect(themeOptions.filter((option) => !option.inside)).toEqual([]);
});

test("docks the viewport action bar inside an unconstrained Admin host", async ({
  page,
}) => {
  await openAdminHost(page, 900);

  const appBody = page.locator(".app-body");
  const panel = panelRoot(page);
  const anchor = page.locator(".snui-action-bar__viewport-anchor");
  const bar = page.locator(ACTION_BAR_SELECTOR);

  await expect(appBody).toHaveCSS("overflow-x", "hidden");
  await expect(appBody).toHaveCSS("overflow-y", "auto");
  const appBodyMetrics = await appBody.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(appBodyMetrics.clientHeight).toBe(appBodyMetrics.scrollHeight);
  await expect(bar).toHaveCSS("position", "fixed");
  await expect
    .poll(() => barMatchesAnchor(anchor, bar, { height: true }))
    .toBe(true);

  const [panelBox, anchorBox, barBox] = await Promise.all([
    boxOf(panel),
    boxOf(anchor),
    boxOf(bar),
  ]);
  expect(barBox.x).toBeCloseTo(anchorBox.x, 1);
  expect(barBox.width).toBeCloseTo(anchorBox.width, 1);
  expect(barBox.x).toBeGreaterThanOrEqual(panelBox.x);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(
    panelBox.x + panelBox.width,
  );
  expect(anchorBox.height).toBeCloseTo(barBox.height, 1);
  expect(barBox.y + barBox.height).toBeCloseTo(ADMIN_HOST_HEIGHT, 0);

  await page.setViewportSize({ width: 760, height: ADMIN_HOST_HEIGHT });
  await expect
    .poll(() => barMatchesAnchor(anchor, bar, { height: false }))
    .toBe(true);
  const [resizedPanelBox, resizedBarBox] = await Promise.all([
    boxOf(panel),
    boxOf(bar),
  ]);
  expect(resizedBarBox.x).toBeGreaterThanOrEqual(resizedPanelBox.x);
  expect(resizedBarBox.x + resizedBarBox.width).toBeLessThanOrEqual(
    resizedPanelBox.x + resizedPanelBox.width,
  );

  const focusTarget = page.getByTestId("admin-host-focus-target");
  const focusTargetOverlap = { action: focusTarget, bar };
  const focusWithoutScrolling = () =>
    focusTarget.evaluate((element) => {
      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected an HTML focus target.");
      }
      element.focus({ preventScroll: true });
    });
  await page.evaluate(
    (documentTop) => {
      window.scrollTo(0, documentTop - (window.innerHeight - 40));
    },
    await documentTopOf(focusTarget),
  );
  await expect(bar).toHaveCSS("position", "fixed");
  await focusWithoutScrolling();
  await expect.poll(() => actionClearsBar(focusTargetOverlap)).toBe(true);

  await page.evaluate(
    ({ documentTop, height, margin }) => {
      window.scrollTo(0, documentTop - window.innerHeight + height + margin);
    },
    {
      documentTop: await documentTopOf(anchor),
      height: barBox.height,
      margin: DOCK_RELEASE_MARGIN,
    },
  );
  await expect(bar).not.toHaveCSS("position", "fixed");
  const [naturalAnchorBox, naturalBarBox] = await Promise.all([
    boxOf(anchor),
    boxOf(bar),
  ]);
  expect(naturalBarBox.y).toBeCloseTo(naturalAnchorBox.y, 1);

  await focusWithoutScrolling();
  await page.setViewportSize({ width: 760, height: 420 });
  await expect(bar).toHaveCSS("position", "fixed");
  await expect.poll(() => actionClearsBar(focusTargetOverlap)).toBe(true);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(bar).not.toHaveCSS("position", "fixed");
  await expect
    .poll(() =>
      bar.evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeLessThanOrEqual(1);
});

test("delivers the first click to a control the docked bar overlaps", async ({
  page,
}) => {
  const overlap = await overlapDockedActionBar(page, 900);

  await expect.poll(() => actionClearsBar(overlap)).toBe(false);
  await expect(overlap.action).toHaveAttribute("data-activation-count", "0");
  const actionBox = await boxOf(overlap.action);
  const scrollBeforeClick = await page.evaluate(() => window.scrollY);

  // Pressed once at the control's own coordinates. Driving the press through
  // the locator would scroll the panel first, because the driver brings the
  // whole scroll-margin box of the target into view and the panel publishes a
  // sticky-bar clearance there, and the press itself is what is under test.
  await page.mouse.click(
    actionBox.x + actionBox.width / 2,
    actionBox.y + actionBox.height / 2,
  );

  await expect(overlap.action).toHaveAttribute("data-activation-count", "1");
  // A pointer user can see the control they pressed, so the press keeps the
  // panel where they put it. A scroll after the click would move content under
  // a pointer that is still there for a second press.
  await settleFrames(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeClick);
  expect(await actionClearsBar(overlap)).toBe(false);
});

test("keeps a control above the docked bar actionable without a retry", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== WEBKIT_PROJECT,
    "The stability window this covers is WebKit's.",
  );
  const overlap = await overlapDockedActionBar(page, 900);
  // Rest the action's bottom edge on the bar's top edge, the position the
  // press timed out at, then act on it without settling or retrying first.
  await page.evaluate(
    (top) => window.scrollBy({ behavior: "auto", top }),
    -DOCKED_BAR_OVERLAP,
  );

  const framesToSettle = await framesUntilStable(page, {
    limit: 30,
    measure: PANEL_ACTION_SELECTOR,
  });
  expect(
    framesToSettle,
    "The control above the docked bar never held still.",
  ).not.toBeNull();
  expect(framesToSettle ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    SETTLED_FRAME_BUDGET,
  );

  await overlap.action.click({ timeout: ACTIONABILITY_TIMEOUT });

  await expect(overlap.action).toHaveAttribute("data-activation-count", "1");
});

test("clears a keyboard-focused control from the docked bar", async ({
  page,
}) => {
  const overlap = await overlapDockedActionBar(page, 900);

  // Focus starts on a control inside the bar, which the clearance ignores, so
  // the overlap survives until the keyboard moves focus back onto the action.
  await page.getByRole("button", { name: "Reset" }).focus();
  await expect.poll(() => actionClearsBar(overlap)).toBe(false);

  await page.keyboard.press("Shift+Tab");

  await expect(overlap.action).toBeFocused();
  await expect.poll(() => actionClearsBar(overlap)).toBe(true);
  await expect(overlap.action).toHaveAttribute("data-activation-count", "0");
});

test("clears a focused control from the docked bar by scrolling its nested scroller", async ({
  page,
}) => {
  const overlap = await overlapDockedActionBar(page, 900, { nested: true });
  const scroller = page.getByTestId("admin-host-nested-scroller");
  await expect.poll(() => actionClearsBar(overlap)).toBe(false);

  // How far the action has to move: its overlap with the bar, and the bar's
  // own clearance above that.
  const [barBox, actionBox, clearance] = await Promise.all([
    boxOf(overlap.bar),
    boxOf(overlap.action),
    styleOf(overlap.bar, "padding-block-start"),
  ]);
  const needed =
    actionBox.y + actionBox.height - (barBox.y - Number.parseFloat(clearance));
  const pageScroll = await page.evaluate(() => window.scrollY);

  // Focus arrives without a scroll of its own, so the clearance is the only
  // thing that moves the action.
  await overlap.action.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected an HTML focus target.");
    }
    element.focus({ preventScroll: true });
  });

  await expect.poll(() => actionClearsBar(overlap)).toBe(true);
  // The scroller the action sits in has the room, so it takes the whole
  // move, to the pixel, and the page stays where the reader left it.
  const scrolled = await scroller.evaluate((element) => element.scrollTop);
  expect(Math.abs(scrolled - needed)).toBeLessThan(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
});

test("settles the docked action bar after a focus change", async ({ page }) => {
  await overlapDockedActionBar(page, 320);
  // The measured window has to start from a settled box, or it counts the
  // frames of the scroll that docked the bar rather than the focus change.
  const framesToWarmUp = await framesUntilStable(page, {
    limit: 30,
    measure: ACTION_BAR_SELECTOR,
  });
  expect(
    framesToWarmUp,
    "The docked action bar never held still before the focus change.",
  ).not.toBeNull();

  const framesToSettle = await framesUntilStable(page, {
    focus: PANEL_ACTION_SELECTOR,
    limit: 30,
    measure: ACTION_BAR_SELECTOR,
  });

  expect(
    framesToSettle,
    "The docked action bar never settled after a focus change.",
  ).not.toBeNull();
  expect(framesToSettle ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    SETTLED_FRAME_BUDGET,
  );
});

test("keeps multiple toast regions visible inside the current panel viewport", async ({
  page,
}) => {
  await openAdminHost(page, 900);

  await page.getByRole("button", { name: "Show engine notification" }).click();
  await page.getByRole("button", { name: "Show network notification" }).click();

  const panel = panelRoot(page);
  const host = page.locator(".snui-toast-region-host");
  const engine = page.getByRole("region", { name: "Engine notifications" });
  const network = page.getByRole("region", {
    name: "Network notifications",
  });
  await expect(host).toHaveCSS("position", "fixed");
  await expect(engine).toBeVisible();
  await expect(network).toBeVisible();

  const [panelBox, hostBox, engineBox, networkBox] = await Promise.all([
    boxOf(panel),
    boxOf(host),
    boxOf(engine),
    boxOf(network),
  ]);
  expect(hostBox.x).toBeGreaterThanOrEqual(panelBox.x);
  expect(hostBox.x + hostBox.width).toBeLessThanOrEqual(
    panelBox.x + panelBox.width,
  );
  expect(hostBox.y).toBeGreaterThanOrEqual(0);
  expect(hostBox.y + hostBox.height).toBeLessThanOrEqual(ADMIN_HOST_HEIGHT);
  expect(engineBox.y + engineBox.height).toBeLessThanOrEqual(networkBox.y);

  await panel.evaluate((element) => {
    document.documentElement.dir = "rtl";
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected an HTML panel root.");
    }
    element.style.marginLeft = "140px";
    window.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => {
      const [currentPanelBox, currentHostBox] = await Promise.all([
        panel.boundingBox(),
        host.boundingBox(),
      ]);
      return currentPanelBox === null || currentHostBox === null
        ? null
        : currentHostBox.x - currentPanelBox.x;
    })
    .toBeCloseTo(0, 1);
});

test("honors reduced-motion preferences", async ({ page }) => {
  await openPanel(page, "?states=1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionDuration = await styleOf(
    page.getByRole("button", { name: "Save" }),
    "transition-duration",
  );
  const spinner = page.locator(".snui-button__spinner").first();
  const animation = await spinner.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      duration: styles.animationDuration,
      iterations: styles.animationIterationCount,
    };
  });

  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
  expect(Number.parseFloat(animation.duration)).toBeLessThanOrEqual(0.00001);
  expect(animation.iterations).toBe("1");
});

test("keeps native controls and focus visible in forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await openPanel(page, "?states=1&forced-color-actions=1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await selectTheme(page, "Dark");
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await emulateForcedColors(page);

  const checked = page.getByRole("checkbox", { name: "Enable provider" });
  await checked.focus();
  await expect(checked).toHaveCSS("appearance", "auto");
  expect(
    Number.parseFloat(await styleOf(checked, "outline-width")),
  ).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByRole("checkbox", { name: "Partially configured option" }),
  ).toHaveJSProperty("indeterminate", true);
  await expect(
    page.getByRole("slider", {
      name: "Confidence threshold",
      exact: true,
    }),
  ).toBeVisible();
  const selectedSegment = page.getByRole("radio", { name: "Normal" });
  const unselectedSegment = page.getByRole("radio", { name: "Minimal" });
  const colorsOf = (segment: Locator) =>
    segment.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [styles.backgroundColor, styles.color];
    });
  await expect(selectedSegment).toHaveCSS("forced-color-adjust", "none");
  const [selectedColors, unselectedColors] = await Promise.all([
    colorsOf(selectedSegment),
    colorsOf(unselectedSegment),
  ]);
  expect(selectedColors).not.toEqual(unselectedColors);
  await selectedSegment.hover();
  await expect.poll(() => colorsOf(selectedSegment)).toEqual(selectedColors);
  await selectedSegment.focus();
  await page.keyboard.press("Space");
  await expectSolidOutline(selectedSegment);

  const primary = page.getByRole("button", { name: "Save" });
  await primary.focus();
  await expect(primary).toHaveCSS("forced-color-adjust", "none");
  await expectSolidOutline(primary);

  const danger = page.getByRole("button", { name: "Reset", exact: true });
  await expect(danger).toHaveCSS("outline-style", "dashed");
  await danger.focus();
  await expect(danger).toHaveCSS("forced-color-adjust", "none");
  await expectSolidOutline(danger, "3px");

  const colors = await systemColors(page, ["ButtonText", "LinkText"]);
  const banner = page.locator(".snui-banner");
  const bannerLink = banner.getByRole("link", {
    name: "Read the Signal K documentation",
  });
  const bannerDismiss = banner.getByRole("button", { name: "Dismiss" });
  const rawBannerAction = banner.getByRole("button", {
    name: "Raw banner action",
  });
  const rawInputAction = banner.getByRole("button", {
    name: "Raw input action",
  });
  await expect(bannerLink).toHaveCSS("forced-color-adjust", "auto");
  await expect(bannerLink).toHaveCSS("color", colors.LinkText);
  // Library buttons reconstruct themselves in system colors under forced
  // colors, so the dismiss control opts out of adjustment and paints ButtonText.
  await expect(bannerDismiss).toHaveCSS("forced-color-adjust", "none");
  await expect(bannerDismiss).toHaveCSS("color", colors.ButtonText);
  await expect(rawBannerAction).toHaveCSS("forced-color-adjust", "auto");
  await expect(rawBannerAction).toHaveCSS("color", colors.ButtonText);
  await expect(rawInputAction).toHaveCSS("forced-color-adjust", "auto");
  await expect(rawInputAction).toHaveCSS("color", colors.ButtonText);

  for (const control of [
    page.getByLabel("API token"),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
  ]) {
    await expect(control).toBeVisible();
    await expect(control).toHaveCSS("forced-color-adjust", "auto");
  }
  await page
    .getByRole("checkbox", { name: "Partially configured option" })
    .focus();
  // Forced colors with the controls focused is part of the audited matrix.
  await expectNoAxeViolations(page, {
    disableRules: [FORCED_COLORS_CONTRAST_EXCEPTION],
  });
  await matchBaseline(
    panelRoot(page),
    testInfo,
    "panel-forced-colors-controls.png",
    { animations: "disabled" },
  );
});

/**
 * The pixel baselines the panel takes in each theme: at rest, with a field
 * focused and Save hovered, and with Save pressed. Night has the first alone.
 * The names are literals, so the family check can read them.
 */
const PANEL_THEME_BASELINES = [
  {
    active: "panel-light-active.png",
    hoverFocus: "panel-light-hover-focus.png",
    rest: "panel-light.png",
    theme: "Light",
  },
  {
    active: "panel-dark-active.png",
    hoverFocus: "panel-dark-hover-focus.png",
    rest: "panel-dark.png",
    theme: "Dark",
  },
  { rest: "panel-night.png", theme: "Night" },
] as const satisfies readonly {
  readonly active?: string;
  readonly hoverFocus?: string;
  readonly rest: string;
  readonly theme: ThemeName;
}[];

/** Holds the primary action in its pressed state for one screenshot. */
async function withActiveSave(
  page: Page,
  testInfo: TestInfo,
  snapshot: string,
): Promise<void> {
  const save = page.getByRole("button", { name: "Save" });
  // boundingBox() is relative to the viewport, and Save sits below the fold,
  // so it is scrolled into view before the pointer is aimed at it.
  await save.scrollIntoViewIfNeeded();
  const box = await boxOf(save);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    // The capture is of the pressed button, so prove it is pressed first.
    expect(
      await save.evaluate((element) => element.matches(":active")),
      "Save is not pressed.",
    ).toBe(true);
    await expect(save).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 1)");
    await matchBaseline(page, testInfo, snapshot, FULL_PAGE_SNAPSHOT);
  } finally {
    await page.mouse.up();
  }
}

for (const baseline of PANEL_THEME_BASELINES) {
  const theme = baseline.theme.toLowerCase();

  test(`matches the ${theme}-theme visual baseline`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo);
    await openPanel(page);
    await selectTheme(page, baseline.theme);
    await movePointerOffPanel(page);
    await matchBaseline(page, testInfo, baseline.rest, FULL_PAGE_SNAPSHOT);
  });

  if (!("active" in baseline)) continue;

  test(`matches the ${theme} hover and focus visual baseline`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo);
    await openPanel(page);
    await selectTheme(page, baseline.theme);
    await page.getByRole("textbox", { name: "Server URL" }).focus();
    await page.getByRole("button", { name: "Save" }).hover();
    await matchBaseline(
      page,
      testInfo,
      baseline.hoverFocus,
      FULL_PAGE_SNAPSHOT,
    );
  });

  test(`matches the ${theme} active-state visual baseline`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo);
    await openPanel(page);
    await selectTheme(page, baseline.theme);
    await withActiveSave(page, testInfo, baseline.active);
  });
}

test("matches the Night interaction-state visual baseline", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await openPanel(page, "?states=1");
  await selectTheme(page, "Night");
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await openResetConfirmation(page);
  await page.keyboard.press("Tab");
  await matchBaseline(
    page,
    testInfo,
    "panel-night-states.png",
    FULL_PAGE_SNAPSHOT,
  );
});

/**
 * The height, in CSS pixels, of the viewport the mobile baseline is captured
 * in: taller than the whole panel on the mobile project, which measured 2191
 * pixels with the coarse layout, so one viewport capture holds all of it.
 */
const MOBILE_CAPTURE_HEIGHT = 2600;

test.describe("mobile visual baseline", () => {
  // A full-page capture on the mobile Chromium context turns its coarse
  // pointer emulation off for the rest of the page's life and paints the fine
  // pointer layout, so the baseline would never show the touch layout the
  // coarse rules exist for. The context is made tall enough for the whole
  // panel instead, and the capture is an ordinary viewport capture, with the
  // coarse pointer asserted on both sides of it.
  test.use({ viewport: { height: MOBILE_CAPTURE_HEIGHT, width: 375 } });

  test("matches the mobile visual baseline", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT);
    await openPanel(page);
    await selectTheme(page, "Light");
    await expectProjectPointer(page, testInfo);
    // Captured beside the coarse layout's own proof: the Save button at the
    // coarse control height.
    await expectTargetFloor(
      page.getByRole("button", { name: "Save" }),
      controlTargetFloor(testInfo),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= window.innerHeight,
      ),
      `The panel outgrew the ${String(MOBILE_CAPTURE_HEIGHT)} pixel mobile capture; raise MOBILE_CAPTURE_HEIGHT.`,
    ).toBe(true);
    await matchBaseline(page, testInfo, "panel-mobile-coarse-light.png", {
      animations: "disabled",
    });
    await expectProjectPointer(page, testInfo);
  });
});

test("matches the WebKit native-control baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== WEBKIT_PROJECT);
  await openPanel(page, "?states=1");
  await selectTheme(page, "Night");
  // The capture is of the focused checkbox, and a programmatic focus after a
  // mouse click draws no ring, so the checkbox is reached by keyboard: a step
  // back and forward again, the way a keyboard user arrives at it.
  const checkbox = page.getByRole("checkbox", {
    name: "Partially configured option",
  });
  await checkbox.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(checkbox).toBeFocused();
  expect(
    await checkbox.evaluate((element) => element.matches(":focus-visible")),
    "The checkbox shows no keyboard focus ring.",
  ).toBe(true);
  await matchBaseline(page, testInfo, "panel-native-controls-webkit.png", {
    ...FULL_PAGE_SNAPSHOT,
    timeout: 15_000,
  });
});

test("matches the 320 pixel reflow visual baseline", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await openPanel(page, "?states=1");
  await selectTheme(page, "Light");
  await page.setViewportSize({ width: 320, height: 812 });
  await matchBaseline(
    page,
    testInfo,
    "panel-reflow-320.png",
    FULL_PAGE_SNAPSHOT,
  );
});

test("matches the right-to-left visual baseline", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await openPanel(page);
  await selectTheme(page, "Light");
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "rtl");
  });
  await matchBaseline(page, testInfo, "panel-rtl.png", FULL_PAGE_SNAPSHOT);
});

test("matches the open collapsible visual baseline", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await openPanel(page);
  await selectTheme(page, "Light");
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await page
    .getByRole("button", { name: "Provider status and metrics" })
    .click();
  await movePointerOffPanel(page);
  await matchBaseline(
    page,
    testInfo,
    "panel-collapsible-open.png",
    FULL_PAGE_SNAPSHOT,
  );
});
