import { existsSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

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

test("runs only when native CSS scope is available", async ({ page }) => {
  expect(await page.evaluate(() => typeof window.CSSScopeRule)).toBe(
    "function",
  );
});

test("renders all themes and component states without axe violations", async ({
  page,
}) => {
  test.slow();
  await page.goto("/?states=1");
  await page.addStyleTag({
    content: "* { transition: none !important; }",
  });
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();

  for (const [theme, dangerColor, textColor] of [
    ["Light", "rgb(180, 35, 24)", "rgb(24, 32, 44)"],
    ["Dark", "rgb(255, 139, 130)", "rgb(245, 247, 250)"],
    ["Night", "rgb(255, 107, 107)", "rgb(255, 120, 120)"],
  ] as const) {
    await page.getByRole("radio", { name: theme }).click();
    await expect(page.locator("[data-snui-version]")).toHaveAttribute(
      "data-snui-theme",
      theme.toLowerCase(),
    );
    await expect(page.locator("[data-snui-version]")).toHaveCSS(
      "color",
      textColor,
    );
    await expect(
      page
        .getByRole("region", { name: "Reset configuration?" })
        .getByRole("button", { name: "Reset" }),
    ).toHaveCSS("color", dangerColor);
    await expect(
      page.getByRole("textbox", { name: "Invalid server URL" }),
    ).toHaveCSS("border-color", dangerColor);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    await expectNoAxeViolations(page);
  }
});

test("follows the host theme for a fresh Auto profile", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });

  // An unresolved preference stays Auto, which leaves data-snui-theme off the
  // root so an explicit host theme can apply.
  const root = page.locator("[data-snui-version]");
  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", "rgb(16, 19, 28)");
  await expect(page.getByRole("radio", { name: "Auto" })).toBeChecked();
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("signalk-nearlcrews-ui.theme.v1"),
    ),
  ).toBeNull();
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

test("persists an explicit Auto preference across reloads", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Auto" }).click();
  await expect(page.locator("[data-snui-version]")).not.toHaveAttribute(
    "data-snui-theme",
  );
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("signalk-nearlcrews-ui.theme.v1"),
    ),
  ).toBe("auto");

  await page.reload();
  await expect(page.getByRole("radio", { name: "Auto" })).toBeChecked();
  await expect(page.locator("[data-snui-version]")).not.toHaveAttribute(
    "data-snui-theme",
  );
});

test("uses the host theme while Auto is selected", async ({ page }) => {
  await page.getByRole("radio", { name: "Auto" }).click();
  await page.evaluate(() => {
    document.documentElement.dataset.bsTheme = "dark";
  });

  const root = page.locator("[data-snui-version]");
  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", "rgb(16, 19, 28)");
});

test("uses the light fallback while Auto is selected without a host theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-bs-theme");
    document.documentElement.removeAttribute("data-coreui-theme");
    document.documentElement.classList.remove("dark-mode");
  });
  await page.getByRole("radio", { name: "Auto" }).click();
  const root = page.locator("[data-snui-version]");

  await expect(root).not.toHaveAttribute("data-snui-theme");
  await expect(root).toHaveCSS("background-color", "rgb(244, 246, 248)");
  await expect(root).toHaveCSS("color", "rgb(24, 32, 44)");
});

test("uses the operating-system theme while System is selected", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("radio", { name: "System" }).click();
  const root = page.locator("[data-snui-version]");

  await expect(root).toHaveAttribute("data-snui-theme", "system");
  await expect(root).toHaveCSS("background-color", "rgb(16, 19, 28)");
  await expect(root).toHaveCSS("color", "rgb(245, 247, 250)");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveCSS("background-color", "rgb(244, 246, 248)");
  await expect(root).toHaveCSS("color", "rgb(24, 32, 44)");
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
  await expect(reentryButton).toHaveCSS("background-color", "rgb(229, 72, 72)");
  await reentryButton.focus();
  await expect(reentryButton).toHaveCSS("outline-width", "2px");
});

test("supports collapsible and segmented-control keyboard navigation", async ({
  page,
}) => {
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

test("uses right-to-left keyboard order and mirrored collapsible carets", async ({
  page,
}) => {
  const collapsible = page.locator(".snui-collapsible", {
    has: page.getByText("Advanced settings"),
  });
  const chevron = collapsible.locator(".snui-collapsible__chevron");
  const segmented = collapsible.locator(".snui-segmented");

  await collapsible.evaluate((element) => element.setAttribute("dir", "rtl"));
  await expect(chevron).toHaveCSS("transform", "matrix(-1, 0, 0, 1, 0, 0)");
  await collapsible.getByRole("button", { name: "Advanced settings" }).click();

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
}) => {
  test.skip(page.viewportSize()?.width === 375);
  const root = page.locator("[data-snui-version]");
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
  const minimumHeight = testInfo.project.name === "mobile-chromium" ? 44 : 40;
  await page.getByRole("button", { name: "Advanced settings" }).click();

  const targets = [
    page.getByRole("radio", { name: "Auto" }),
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
    page.getByRole("button", { name: "Dismiss" }),
    page.getByRole("button", { name: "Provider status and metrics" }),
  ];

  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(minimumHeight - 0.01);
  }
});

test("supports action-bearing collapsible status content", async ({ page }) => {
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

test.skip("provides hover and active feedback for raw action controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Light" }).click();
  for (const control of [
    page.getByRole("button", { name: "Dismiss" }),
    page.getByRole("button", { name: "Provider status and metrics" }),
    page.getByRole("button", { name: "Advanced settings" }),
  ]) {
    const initialBackground = await control.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await control.hover();
    await expect
      .poll(() =>
        control.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      )
      .not.toBe(initialBackground);
    const hoverBackground = await control.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(hoverBackground).toBe("rgb(238, 242, 247)");

    await page.mouse.down();
    await expect
      .poll(() =>
        control.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      )
      .not.toBe(hoverBackground);
    await page.mouse.up();
  }
});

test("provides segmented hover and active feedback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Advanced settings" }).click();
  const selected = page.getByRole("radio", { name: "Normal" });
  const unselected = page.getByRole("radio", { name: "Minimal" });

  const selectedBackground = await selected.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await selected.hover();
  await expect
    .poll(() =>
      selected.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(selectedBackground);

  const unselectedBackground = await unselected.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await unselected.hover();
  await expect
    .poll(() =>
      unselected.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe(unselectedBackground);
  const hoverBackground = await unselected.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.mouse.down();
  await expect
    .poll(() =>
      unselected.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe(hoverBackground);
  await page.mouse.up();
});

test("keeps aria-disabled focus indicators fully opaque", async ({ page }) => {
  await page.goto("/?states=1");
  const button = page.getByRole("button", { name: "Unavailable here" });

  await expect(button).toHaveCSS("opacity", "1");
  await expect(button.locator(".snui-button__content")).toHaveCSS(
    "opacity",
    "0.58",
  );
  await expect(button.locator(".snui-button__content")).toHaveCSS(
    "display",
    "flex",
  );
  await expect(button.locator(".snui-button__content")).toHaveCSS(
    "column-gap",
    "8px",
  );
  await button.focus();
  expect(
    Number.parseFloat(
      await button.evaluate(
        (element) => getComputedStyle(element).outlineWidth,
      ),
    ),
  ).toBeGreaterThanOrEqual(2);

  const nativeDisabled = page.getByRole("button", { name: "Disabled" });
  await nativeDisabled.evaluate((element) =>
    element.setAttribute("aria-disabled", "true"),
  );
  await expect(nativeDisabled).toHaveCSS("opacity", "0.58");
  await expect(nativeDisabled.locator(".snui-button__content")).toHaveCSS(
    "opacity",
    "1",
  );
});

test("retains loading-button focus and suppresses repeat activation", async ({
  page,
}) => {
  await page.goto("/?states=1&focus-loading=1");
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
  test.skip(testInfo.project.name === "mobile-chromium");
  const fieldset = page.getByRole("group", { name: "Provider behavior" });
  const actions = fieldset.locator(".snui-field-group__actions");

  await expect(fieldset).toHaveCSS("display", "grid");
  await expect(actions).toHaveCSS("grid-column-start", "2");
  await expect(actions).toHaveCSS("grid-row-start", "1");
});

test("styles native text controls and links in Night mode", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Night" }).click();

  const controls = [
    page.getByLabel("API token"),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
  ];
  for (const control of controls) {
    await expect(control).toHaveCSS("background-color", "rgb(16, 0, 0)");
    await expect(control).toHaveCSS("color", "rgb(255, 120, 120)");
  }

  const link = page.getByRole("link", {
    name: "Read the Signal K documentation",
  });
  await expect(link).toHaveCSS("color", "rgb(255, 146, 146)");
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
    await expect(control).toHaveCSS("opacity", "0.58");
  }
});

test("places the select indicator at the logical inline end", async ({
  page,
}) => {
  const select = page.getByRole("combobox", { name: "Provider mode" });

  const ltr = await select.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      paddingLeft: Number.parseFloat(styles.paddingLeft),
      paddingRight: Number.parseFloat(styles.paddingRight),
      positions: styles.backgroundPositionX.split(","),
    };
  });
  expect(ltr.paddingRight).toBeGreaterThan(ltr.paddingLeft);
  expect(ltr.positions.every((position) => position.includes("100%"))).toBe(
    true,
  );

  await select.evaluate((element) => element.setAttribute("dir", "rtl"));
  const rtl = await select.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      paddingLeft: Number.parseFloat(styles.paddingLeft),
      paddingRight: Number.parseFloat(styles.paddingRight),
      positions: styles.backgroundPositionX.split(","),
    };
  });
  expect(rtl.paddingLeft).toBeGreaterThan(rtl.paddingRight);
  expect(rtl.positions.every((position) => !position.includes("100%"))).toBe(
    true,
  );
});

test("dismisses banners without coupling visibility to the library", async ({
  page,
}) => {
  const bannerText = page.getByText("Values are stored in SI");
  await expect(bannerText).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(bannerText).toBeHidden();
  await expect(page.getByRole("button", { name: "Save" })).toBeFocused();
});

test("styles checkbox and range validation consistently", async ({ page }) => {
  await page.goto("/?states=1");
  const checkbox = page.getByRole("checkbox", { name: "Missing agreement" });
  const range = page.getByRole("slider", {
    name: "Invalid confidence threshold",
  });
  const dangerColor = "rgb(180, 35, 24)";

  await expect(checkbox).toHaveAttribute("aria-invalid", "true");
  await expect(checkbox).toHaveCSS("border-color", dangerColor);
  await expect(range).toHaveAttribute("aria-invalid", "true");
  expect(
    await range.evaluate((element) =>
      getComputedStyle(element)
        .getPropertyValue("--snui-range-track-color")
        .trim(),
    ),
  ).toBe("#b42318");
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

  const confirm = confirmation.getByRole("button", { name: "Reset" });
  await confirm.click();

  // Busy blocks activation through aria-disabled, so the control stays in the
  // tab order and focus is never destroyed and chased.
  await expect(confirm).toBeFocused();
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
  await expect(night).toHaveCSS("background-color", "rgb(255, 90, 90)");
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
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).last().click();
  await page
    .locator(".snui-collapsible__title", { hasText: "Advanced settings" })
    .evaluate((title) => {
      title.textContent =
        "Advanced-settings-with-a-deliberately-unbroken-consumer-defined-title";
    });
  await page
    .locator(".snui-collapsible__summary--header")
    .evaluate((summary) => {
      summary.textContent =
        "consumer-status-summary-with-a-deliberately-unbroken-value";
    });
  await page
    .locator(".snui-collapsible__actions .snui-button")
    .evaluate((action) => {
      action.textContent = "consumer-action-with-a-deliberately-unbroken-label";
    });
  for (const selector of [
    ".snui-section__description",
    ".snui-field__label",
    ".snui-field__description",
    ".snui-field__error",
    ".snui-field-group__description",
    ".snui-checkbox__label",
    ".snui-checkbox__description",
    ".snui-banner__actions .snui-button",
    ".snui-action-bar__status",
    ".snui-action-bar .snui-button",
    ".snui-inline-confirm__title",
    ".snui-inline-confirm__message",
  ]) {
    await page
      .locator(selector)
      .first()
      .evaluate((element) => {
        element.textContent =
          "consumer-defined-content-with-a-deliberately-unbroken-value";
      });
  }

  const exactInput = page.getByRole("spinbutton", {
    name: "Confidence threshold exact value",
  });
  const unit = page.getByTestId("confidence-unit");
  const [exactBox, unitBox] = await Promise.all([
    exactInput.boundingBox(),
    unit.boundingBox(),
  ]);
  expect(exactBox).not.toBeNull();
  expect(unitBox).not.toBeNull();
  if (exactBox !== null && unitBox !== null) {
    const exactCenter = exactBox.y + exactBox.height / 2;
    const unitCenter = unitBox.y + unitBox.height / 2;
    expect(Math.abs(exactCenter - unitCenter)).toBeLessThan(1);
    expect(unitBox.x).toBeGreaterThanOrEqual(exactBox.x + exactBox.width);
  }

  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
});

test("docks the viewport action bar inside an unconstrained Admin host", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto("/?admin-host=1");

  const appBody = page.locator(".app-body");
  const panel = page.locator("[data-snui-root]");
  const anchor = page.locator(".snui-action-bar__viewport-anchor");
  const bar = page.locator(".snui-action-bar");

  await expect(appBody).toHaveCSS("overflow-x", "hidden");
  await expect(appBody).toHaveCSS("overflow-y", "auto");
  const appBodyMetrics = await appBody.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(appBodyMetrics.clientHeight).toBe(appBodyMetrics.scrollHeight);
  await expect
    .poll(() => bar.evaluate((element) => getComputedStyle(element).position))
    .toBe("fixed");
  await expect
    .poll(async () => {
      const [currentAnchor, currentBar] = await Promise.all([
        anchor.boundingBox(),
        bar.boundingBox(),
      ]);
      return (
        currentAnchor !== null &&
        currentBar !== null &&
        Math.abs(currentAnchor.x - currentBar.x) < 0.1 &&
        Math.abs(currentAnchor.width - currentBar.width) < 0.1 &&
        Math.abs(currentAnchor.height - currentBar.height) < 0.1
      );
    })
    .toBe(true);

  const [panelBox, anchorBox, barBox] = await Promise.all([
    panel.boundingBox(),
    anchor.boundingBox(),
    bar.boundingBox(),
  ]);
  expect(panelBox).not.toBeNull();
  expect(anchorBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  if (panelBox === null || anchorBox === null || barBox === null) return;
  expect(barBox.x).toBeCloseTo(anchorBox.x, 1);
  expect(barBox.width).toBeCloseTo(anchorBox.width, 1);
  expect(barBox.x).toBeGreaterThanOrEqual(panelBox.x);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(
    panelBox.x + panelBox.width,
  );
  expect(anchorBox.height).toBeCloseTo(barBox.height, 1);
  expect(barBox.y + barBox.height).toBeCloseTo(600, 0);

  await page.setViewportSize({ width: 760, height: 600 });
  await expect
    .poll(async () => {
      const [currentAnchor, currentBar] = await Promise.all([
        anchor.boundingBox(),
        bar.boundingBox(),
      ]);
      return (
        currentAnchor !== null &&
        currentBar !== null &&
        Math.abs(currentAnchor.x - currentBar.x) < 0.1 &&
        Math.abs(currentAnchor.width - currentBar.width) < 0.1
      );
    })
    .toBe(true);
  const [resizedPanelBox, resizedBarBox] = await Promise.all([
    panel.boundingBox(),
    bar.boundingBox(),
  ]);
  expect(resizedPanelBox).not.toBeNull();
  expect(resizedBarBox).not.toBeNull();
  if (resizedPanelBox !== null && resizedBarBox !== null) {
    expect(resizedBarBox.x).toBeGreaterThanOrEqual(resizedPanelBox.x);
    expect(resizedBarBox.x + resizedBarBox.width).toBeLessThanOrEqual(
      resizedPanelBox.x + resizedPanelBox.width,
    );
  }

  const anchorDocumentTop = await anchor.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate(
    ({ documentTop, height }) => {
      window.scrollTo(0, documentTop - window.innerHeight + height + 1);
    },
    { documentTop: anchorDocumentTop, height: barBox.height },
  );
  await expect
    .poll(() => bar.evaluate((element) => getComputedStyle(element).position))
    .not.toBe("fixed");
  const naturalBoxes = await Promise.all([
    anchor.boundingBox(),
    bar.boundingBox(),
  ]);
  expect(naturalBoxes[0]).not.toBeNull();
  expect(naturalBoxes[1]).not.toBeNull();
  if (naturalBoxes[0] !== null && naturalBoxes[1] !== null) {
    expect(naturalBoxes[1].y).toBeCloseTo(naturalBoxes[0].y, 1);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => bar.evaluate((element) => getComputedStyle(element).position))
    .not.toBe("fixed");
  await expect
    .poll(() =>
      bar.evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeLessThanOrEqual(1);
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });

  const checked = page.getByRole("checkbox", { name: "Enable provider" });
  await checked.focus();
  await expect(checked).toHaveCSS("appearance", "auto");
  expect(
    Number.parseFloat(
      await checked.evaluate(
        (element) => getComputedStyle(element).outlineWidth,
      ),
    ),
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
  await expect(selectedSegment).toHaveCSS("forced-color-adjust", "none");
  const [selectedColors, unselectedColors] = await Promise.all([
    selectedSegment.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [styles.backgroundColor, styles.color];
    }),
    unselectedSegment.evaluate((element) => {
      const styles = getComputedStyle(element);
      return [styles.backgroundColor, styles.color];
    }),
  ]);
  expect(selectedColors).not.toEqual(unselectedColors);
  await selectedSegment.hover();
  await expect
    .poll(() =>
      selectedSegment.evaluate((element) => {
        const styles = getComputedStyle(element);
        return [styles.backgroundColor, styles.color];
      }),
    )
    .toEqual(selectedColors);
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
  await page.getByRole("button", { name: "Advanced settings" }).click();
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
    timeout: 15_000,
  });
});

/**
 * Skips a screenshot spec when the current project, platform, and snapshot
 * variant have no committed baseline. Baselines are generated on x64/ubuntu24
 * through the manual refresh workflow, so other machines skip with a clear
 * reason instead of failing on a missing snapshot.
 */
function skipWithoutBaseline(testInfo: TestInfo, snapshot: string): void {
  test.skip(
    !existsSync(testInfo.snapshotPath(snapshot)),
    `No committed ${snapshot} baseline for this project, platform, and snapshot variant; refresh baselines through the manual CI workflow.`,
  );
}

/** Holds the primary action in its pressed state for one screenshot. */
async function withActiveSave(page: Page, snapshot: string): Promise<void> {
  const save = page.getByRole("button", { name: "Save" });
  const box = await save.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await expect(page).toHaveScreenshot(snapshot, {
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await page.mouse.up();
  }
}

test("matches the light hover and focus visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-light-hover-focus.png");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.getByRole("textbox", { name: "Server URL" }).focus();
  await page.getByRole("button", { name: "Save" }).hover();
  await expect(page).toHaveScreenshot("panel-light-hover-focus.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the light active-state visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-light-active.png");
  await page.getByRole("radio", { name: "Light" }).click();
  await withActiveSave(page, "panel-light-active.png");
});

test("matches the dark hover and focus visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-dark-hover-focus.png");
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("textbox", { name: "Server URL" }).focus();
  await page.getByRole("button", { name: "Save" }).hover();
  await expect(page).toHaveScreenshot("panel-dark-hover-focus.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the dark active-state visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-dark-active.png");
  await page.getByRole("radio", { name: "Dark" }).click();
  await withActiveSave(page, "panel-dark-active.png");
});

test("matches the 320 pixel reflow visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-reflow-320.png");
  await page.goto("/?states=1");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.setViewportSize({ width: 320, height: 812 });
  await expect(page).toHaveScreenshot("panel-reflow-320.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the right-to-left visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-rtl.png");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "rtl");
  });
  await expect(page).toHaveScreenshot("panel-rtl.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("matches the open collapsible visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  skipWithoutBaseline(testInfo, "panel-collapsible-open.png");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.getByRole("button", { name: "Advanced settings" }).click();
  await page
    .getByRole("button", { name: "Provider status and metrics" })
    .click();
  await expect(page).toHaveScreenshot("panel-collapsible-open.png", {
    fullPage: true,
    animations: "disabled",
  });
});
