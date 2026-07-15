import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Weather provider" }),
  ).toBeVisible();
});

test("renders all themes and component states without axe violations", async ({
  page,
}) => {
  test.slow();
  await page.goto("/?states=1");
  await page.locator("summary", { hasText: "Advanced settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();

  for (const [theme, dangerColor] of [
    ["Light", "rgb(180, 35, 24)"],
    ["Dark", "rgb(255, 139, 130)"],
    ["Night", "rgb(255, 107, 107)"],
  ] as const) {
    await page.getByRole("radio", { name: theme }).click();
    await expect(page.locator("[data-snui-version]")).toHaveAttribute(
      "data-snui-theme",
      theme.toLowerCase(),
    );
    await expect(
      page
        .getByRole("region", { name: "Reset configuration?" })
        .getByRole("button", { name: "Reset" }),
    ).toHaveCSS("color", dangerColor);
    await expectNoAxeViolations(page);
  }
});

test("persists explicit themes across reloads", async ({ page }) => {
  await page.getByRole("radio", { name: "Night" }).click();
  await expect(page.locator("[data-snui-version]")).toHaveAttribute(
    "data-snui-theme",
    "night",
  );

  await page.reload();
  await expect(page.locator("[data-snui-version]")).toHaveAttribute(
    "data-snui-theme",
    "night",
  );
});

test("uses the host theme while Auto is selected", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });

  const root = page.locator("[data-snui-version]");
  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", "rgb(16, 19, 28)");
});

test("uses the operating-system theme while Auto is selected", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const root = page.locator("[data-snui-version]");

  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", "rgb(16, 19, 28)");
});

test("keeps library styling inside the panel root", async ({
  page,
}, testInfo) => {
  const outside = page.locator("#outside-button");
  const inside = page.getByRole("button", { name: "Save" });
  const expectedHeight =
    testInfo.project.name === "mobile-chromium" ? "44px" : "40px";

  await expect(inside).toHaveCSS("min-height", expectedHeight);
  await expect(outside).not.toHaveCSS("min-height", expectedHeight);
  await expect(outside).toHaveCSS("display", "none");
  expect(
    await outside.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--snui-color-text"),
    ),
  ).toBe("");

  await page.locator("[data-snui-version]").evaluate((root) => {
    const nestedRoot = document.createElement("div");
    nestedRoot.className = "snui-root";
    nestedRoot.dataset.snuiVersion = "99.0.0";
    const nestedButton = document.createElement("button");
    nestedButton.id = "nested-version-button";
    nestedButton.className = "snui-button";
    nestedButton.textContent = "Nested version";
    const reentryRoot = document.createElement("div");
    reentryRoot.className = "snui-root";
    reentryRoot.dataset.snuiVersion = "0.1.0";
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
  await expect(reentryButton).toHaveCSS("background-color", "rgb(229, 72, 72)");
  await reentryButton.focus();
  await expect(reentryButton).toHaveCSS("outline-width", "2px");
});

test("supports disclosure and segmented-control keyboard navigation", async ({
  page,
}) => {
  const disclosure = page.locator("summary", {
    hasText: "Advanced settings",
  });
  const details = disclosure.locator("..");

  await disclosure.focus();
  await expect(disclosure).toBeFocused();
  await expect(disclosure).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");

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
    normal.locator("..").boundingBox(),
    normal.boundingBox(),
  ]);
  expect(groupBox).not.toBeNull();
  expect(optionBox).not.toBeNull();
  if (groupBox === null || optionBox === null) return;
  expect(optionBox.x - groupBox.x).toBeGreaterThanOrEqual(4);
  expect(
    groupBox.x + groupBox.width - optionBox.x - optionBox.width,
  ).toBeGreaterThanOrEqual(4);
});

test("applies the control target floor to every interactive primitive", async ({
  page,
}, testInfo) => {
  const minimumHeight = testInfo.project.name === "mobile-chromium" ? 44 : 40;
  await page.locator("summary", { hasText: "Advanced settings" }).click();

  const targets = [
    page.getByRole("radio", { name: "Auto" }),
    page.getByRole("textbox", { name: /Server URL/ }),
    page.getByRole("spinbutton", { name: "Refresh interval" }),
    page.getByRole("slider", { name: "Confidence threshold" }),
    page.locator("summary", { hasText: "Advanced settings" }),
    page.getByRole("radio", { name: "Normal" }),
    page.getByRole("button", { name: "Save" }),
    page.getByRole("checkbox", { name: "Enable provider" }).locator(".."),
  ];

  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(minimumHeight);
  }
});

test("uses inline confirmation with Escape, confirm, and managed focus", async ({
  page,
}) => {
  const trigger = page
    .getByRole("button", { name: "Reset", exact: true })
    .last();
  await trigger.click();

  const confirmation = page.getByRole("region", {
    name: "Reset configuration?",
  });
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByRole("button", { name: "Cancel" }),
  ).toBeFocused();

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
  await page.goto("/?states=1");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  const toggle = page.getByRole("button", {
    name: "Toggle confirmation busy",
  });

  await toggle.click();

  await expect(toggle).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Reset configuration?" }),
  ).toHaveAttribute("aria-busy", "true");
});

test("retains focus when an internal confirmation action becomes busy", async ({
  page,
}) => {
  await page.goto("/?busy-on-confirm=1");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  const confirmation = page.getByRole("region", {
    name: "Reset configuration?",
  });

  await confirmation.getByRole("button", { name: "Reset" }).click();

  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-busy", "true");
});

test("focuses an initially busy confirmation container", async ({ page }) => {
  await page.goto("/?busy=1");
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();

  const confirmation = page.getByRole("region", {
    name: "Reset configuration?",
  });
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveAttribute("aria-busy", "true");
});

test("renders compliant placeholders and a red-preserving Night accent", async ({
  page,
}) => {
  await page.goto("/?states=1");
  const placeholderOpacity = await page
    .getByRole("textbox", { name: /Server URL/ })
    .evaluate((element) => getComputedStyle(element, "::placeholder").opacity);
  expect(placeholderOpacity).toBe("1");

  const night = page.getByRole("radio", { name: "Night" });
  await night.click();
  await expect(night).toHaveCSS("background-color", "rgb(229, 72, 72)");
  await expect(night).toHaveCSS("color", "rgb(25, 0, 0)");

  for (const checkbox of [
    page.getByRole("checkbox", { name: "Enable provider" }),
    page.getByRole("checkbox", { name: "Partially configured option" }),
  ]) {
    expect(
      await checkbox.evaluate(
        (element) => getComputedStyle(element, "::before").borderBottomColor,
      ),
    ).toBe("rgb(25, 0, 0)");
  }
  expect(
    await page
      .getByRole("checkbox", { name: "Partially configured option" })
      .evaluate((element) => (element as HTMLInputElement).indeterminate),
  ).toBe(true);
});

test("reflows state-heavy content at a 320 pixel viewport", async ({
  page,
}) => {
  await page.goto("/?states=1");
  await page.setViewportSize({ width: 320, height: 812 });
  await page.locator("summary", { hasText: "Advanced settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();

  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
});

test("honors reduced-motion preferences", async ({ page }) => {
  await page.goto("/?states=1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionDuration = await page
    .getByRole("button", { name: "Save" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
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
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");
  await page.emulateMedia({ forcedColors: "active" });

  const checked = page.getByRole("checkbox", { name: "Enable provider" });
  await checked.focus();
  await expect(checked).toHaveCSS("appearance", "auto");
  await expect(checked).toHaveCSS("outline-width", "2px");
  await expect(
    page.getByRole("checkbox", { name: "Partially configured option" }),
  ).toHaveJSProperty("indeterminate", true);
  await expect(
    page.getByRole("slider", { name: "Confidence threshold" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Partially configured option" })
    .focus();
  await expect(page.locator("[data-snui-version]")).toHaveScreenshot(
    "panel-forced-colors-controls.png",
    { animations: "disabled" },
  );
});

test("matches the light-theme visual baseline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page).toHaveScreenshot("panel-light.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the night-theme visual baseline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.getByRole("radio", { name: "Night" }).click();
  await expect(page).toHaveScreenshot("panel-night.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the dark-theme visual baseline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page).toHaveScreenshot("panel-dark.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the Night interaction-state visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");
  await page.getByRole("radio", { name: "Night" }).click();
  await page.locator("summary", { hasText: "Advanced settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  await page.keyboard.press("Tab");
  await expect(page).toHaveScreenshot("panel-night-states.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the mobile visual baseline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page).toHaveScreenshot("panel-mobile-light.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the WebKit native-control baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "webkit");
  await page.goto("/?states=1");
  await page.getByRole("radio", { name: "Night" }).click();
  await page
    .getByRole("checkbox", { name: "Partially configured option" })
    .focus();
  await expect(page).toHaveScreenshot("panel-native-controls-webkit.png", {
    animations: "disabled",
    fullPage: true,
  });
});
