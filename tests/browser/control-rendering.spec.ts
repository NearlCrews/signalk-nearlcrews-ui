import {
  emulateForcedColors,
  expect,
  expectSolidOutline,
  type Locator,
  type Page,
  renderedPixels,
  selectTheme,
  settleAnimations,
  skipOutsideChromium,
  styleOf,
  systemColors,
  test,
  tokenColor,
} from "./fixtures.js";

/** The label a panel checkbox draws beside its box. */
function checkboxLabel(page: Page, name: string): Locator {
  return page
    .getByRole("checkbox", { name })
    .locator("xpath=..")
    .locator(".snui-checkbox__label");
}

test("keeps a button at its own type size inside a small-text card footer", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/showcase.html");

  const footerButton = page.getByRole("button", { name: "Open plan" });
  const rowButton = page.getByRole("button", { name: "Secondary" });
  expect(await styleOf(footerButton, "font-size")).toBe(
    await styleOf(rowButton, "font-size"),
  );
});

test("draws a button rendered as an anchor as the variant it names", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/showcase.html");

  const anchor = page.getByRole("link", { name: "Anchor form" });
  const ghost = page.getByRole("button", { name: "Ghost" });
  const ghostColor = await styleOf(ghost, "color");
  await expect(anchor).toHaveCSS("text-decoration-line", "none");
  await expect(anchor).toHaveCSS("color", ghostColor);
  // The link hover color does not reach it either.
  await anchor.hover();
  await expect(anchor).toHaveCSS("color", ghostColor);
  await expect(anchor).toHaveCSS("text-decoration-line", "none");
});

test("dims a disabled checkbox's label with the disabled text color", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/?states=1");

  const disabledText = await styleOf(
    page.getByRole("button", { name: "Disabled" }),
    "color",
  );
  await expect(checkboxLabel(page, "Unavailable option")).toHaveCSS(
    "color",
    disabledText,
  );
  expect(
    await styleOf(checkboxLabel(page, "Optional diagnostics"), "color"),
  ).not.toBe(disabledText);

  // The markers set their own colors, and they dim with the label rather
  // than reading stronger than the text they annotate.
  await checkboxLabel(page, "Unavailable option").evaluate((element) => {
    for (const className of ["snui-optional-mark", "snui-required-mark"]) {
      const marker = element.ownerDocument.createElement("span");
      marker.className = className;
      marker.textContent =
        className === "snui-required-mark" ? "*" : "Optional";
      element.append(marker);
    }
  });
  for (const marker of [".snui-optional-mark", ".snui-required-mark"]) {
    await expect(
      checkboxLabel(page, "Unavailable option").locator(marker),
    ).toHaveCSS("color", disabledText);
  }
});

test("paints blocked buttons and a disabled checkbox label GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/?states=1");
  await emulateForcedColors(page);
  const colors = await systemColors(page, [
    "ButtonText",
    "GrayText",
    "LinkText",
  ]);

  // The aria-disabled button matches the native disabled one rather than
  // painting the theme's disabled token.
  for (const name of ["Disabled", "Unavailable here"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toHaveCSS("color", colors.GrayText);
    await expect(button).toHaveCSS("border-top-color", colors.GrayText);
  }
  // A busy button keeps its variant, as every theme does.
  await expect(page.getByRole("button", { name: "Saving" })).toHaveCSS(
    "color",
    colors.ButtonText,
  );
  const label = checkboxLabel(page, "Unavailable option");
  await expect(label).toHaveCSS("color", colors.GrayText);

  // A marker inside the label takes the system color too, rather than its
  // theme color, while a link, which the disabled box does not disable,
  // keeps the system link color. Both are added to the rendered label here,
  // which is all the rules need to reach them.
  await label.evaluate((element) => {
    const marker = element.ownerDocument.createElement("span");
    marker.className = "snui-optional-mark";
    marker.textContent = "Optional";
    const link = element.ownerDocument.createElement("a");
    link.href = "https://signalk.org/";
    link.textContent = "terms";
    element.append(marker, link);
  });
  await expect(label.locator(".snui-optional-mark")).toHaveCSS(
    "color",
    colors.GrayText,
  );
  await expect(label.locator("a")).toHaveCSS("color", colors.LinkText);

  // A blocked danger button dims its dashed outline with its text.
  const unavailable = page.getByRole("button", { name: "Unavailable here" });
  await unavailable.evaluate((element) => {
    element.classList.replace("snui-button--secondary", "snui-button--danger");
  });
  await expect(unavailable).toHaveCSS("outline-style", "dashed");
  await expect(unavailable).toHaveCSS("outline-color", colors.GrayText);
});

/** The showcase with its disabled selection controls and blocked fields. */
const DISABLED_CONTROLS_PAGE = "/showcase.html?disabled-controls=1";

/** The system colors a disabled selection control is painted from. */
const DISABLED_CONTROL_COLORS = ["ButtonText", "Canvas", "GrayText"] as const;

/**
 * The flagged showcase fields, by label, and whether the label dims. It dims
 * only once its slot holds a blocked control and no value control left to
 * edit, and a button holds no value.
 */
const FIELD_LABELS = [
  // A live slider beside a disabled exact-value input.
  { dims: false, label: "Anchor alarm radius" },
  // A live text input beside a blocked button.
  { dims: false, label: "Route name" },
  // A disabled text input beside a live button.
  { dims: true, label: "Vessel name" },
  // A segmented control with one option disabled, with every option
  // disabled, and disabled as a group.
  { dims: false, label: "Chart detail" },
  { dims: true, label: "Chart palette" },
  { dims: true, label: "Chart rotation" },
  // A blocked button alone in the slot.
  { dims: true, label: "Compass calibration" },
  // A live select whose placeholder option is disabled.
  { dims: false, label: "Tide station" },
  // A disabled slider alone in the slot.
  { dims: true, label: "Backlight level" },
] as const;

/** A showcase field's own label, found by its text. */
function fieldLabel(page: Page, text: string): Locator {
  return page.locator(".snui-field__label").filter({ hasText: text });
}

/** The theme's disabled text and surface colors, read inside the panel. */
async function disabledPalette(
  page: Page,
): Promise<{ readonly disabledText: string; readonly surface: string }> {
  const content = page.locator(".snui-root__content");
  const [disabledText, surface] = await Promise.all([
    tokenColor(content, "--snui-color-text-disabled"),
    tokenColor(content, "--snui-color-surface"),
  ]);
  return { disabledText, surface };
}

/**
 * Opens the showcase's disabled controls under forced colors and returns the
 * system colors they take, with the theme's disabled text token. The theme is
 * Dark because its disabled and surface tokens are none of those system
 * colors, which this fails without: a part still painting a theme token could
 * otherwise pass as GrayText or Canvas.
 */
async function openDisabledControls(page: Page): Promise<{
  readonly colors: Record<(typeof DISABLED_CONTROL_COLORS)[number], string>;
  readonly disabledText: string;
}> {
  await page.goto(DISABLED_CONTROLS_PAGE);
  await selectTheme(page, "Dark");
  // Read before forced colors applies: after it, the probe would report the
  // system color the engine paints over the token.
  const { disabledText, surface } = await disabledPalette(page);
  await emulateForcedColors(page);
  await settleAnimations(page);

  const colors = await systemColors(page, DISABLED_CONTROL_COLORS);
  expect(Object.values(colors)).not.toContain(disabledText);
  expect(Object.values(colors)).not.toContain(surface);
  return { colors, disabledText };
}

/**
 * The color of each of an element's rendered pixels, row by row, written the
 * way a computed style writes it.
 */
async function paintedRows(page: Page, target: Locator): Promise<string[][]> {
  const pixels = await renderedPixels(page, target);
  return Array.from({ length: pixels.height }, (_, y) =>
    Array.from(
      { length: pixels.width },
      (_, x) => `rgb(${pixels.at(x, y).join(", ")})`,
    ),
  );
}

test("sets a disabled selected segment's text apart from its fill and dims a disabled group's other options", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto(DISABLED_CONTROLS_PAGE);
  // The options transition their colors.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { disabledText, surface } = await disabledPalette(page);

  // A disabled option selected in a live group fills with the disabled
  // color, so its text takes the surface rather than vanishing into the fill.
  const selected = page.getByRole("radio", { name: "True wind" });
  await expect(selected).toHaveAttribute("aria-checked", "true");
  await expect(selected).toBeDisabled();
  await expect(selected).toHaveCSS("background-color", disabledText);
  await expect(selected).toHaveCSS("color", surface);

  // In a disabled group the unselected option dims with the selected one.
  await expect(page.getByRole("radio", { name: "Course up" })).toHaveCSS(
    "color",
    disabledText,
  );
});

test("dims a field label only once its slot holds no live value control", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto(DISABLED_CONTROLS_PAGE);
  const { disabledText } = await disabledPalette(page);
  const liveText = await styleOf(fieldLabel(page, "Call sign"), "color");
  expect(liveText).not.toBe(disabledText);

  for (const { dims, label } of FIELD_LABELS) {
    await expect(fieldLabel(page, label), label).toHaveCSS(
      "color",
      dims ? disabledText : liveText,
    );
  }
});

test("leaves a dimmed field label to a consumer rule that already outweighed it", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto(DISABLED_CONTROLS_PAGE);
  const { disabledText } = await disabledPalette(page);
  const label = fieldLabel(page, "Vessel name");
  await label.locator("xpath=..").evaluate((field) => {
    field.classList.add("probe");
  });

  // The rule that dims the label weighs four classes. A page rule of that
  // weight loses the tie to the scoped rule, and one class more wins.
  await page.addStyleTag({
    content: ".probe.probe.probe > .snui-field__label { color: rgb(1, 2, 3); }",
  });
  await expect(label).toHaveCSS("color", disabledText);
  await page.addStyleTag({
    content:
      ".probe.probe.probe.probe > .snui-field__label { color: rgb(1, 2, 3); }",
  });
  await expect(label).toHaveCSS("color", "rgb(1, 2, 3)");
});

test("paints a disabled radio dial GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  const { colors } = await openDisabledControls(page);
  const dial = (name: string): Locator =>
    page
      .locator(".snui-radio__button", { hasText: name })
      .locator(".snui-radio__control");

  // Selected, the dial fills GrayText around a Canvas dot.
  const selected = dial("WGS 84");
  await expect(selected).toHaveCSS("border-top-color", colors.GrayText);
  await expect(selected).toHaveCSS("background-color", colors.GrayText);
  expect(
    await selected.evaluate(
      (element) => getComputedStyle(element, "::before").backgroundColor,
    ),
  ).toBe(colors.Canvas);

  // Unselected, only the border dims.
  const unselected = dial("NAD 83");
  await expect(unselected).toHaveCSS("border-top-color", colors.GrayText);
  await expect(unselected).toHaveCSS("background-color", colors.Canvas);
});

test("paints a disabled switch GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  const { colors } = await openDisabledControls(page);
  const partsOf = (name: string): { thumb: Locator; track: Locator } => {
    const button = page.locator(".snui-switch__button", { hasText: name });
    return {
      thumb: button.locator(".snui-switch__thumb"),
      track: button.locator(".snui-switch__track"),
    };
  };

  // Off, the border and the thumb dim on the Canvas track.
  const off = partsOf("Anchor light");
  await expect(off.track).toHaveCSS("border-top-color", colors.GrayText);
  await expect(off.track).toHaveCSS("background-color", colors.Canvas);
  await expect(off.thumb).toHaveCSS("background-color", colors.GrayText);

  // On, the track fills GrayText under a Canvas thumb.
  const on = partsOf("Deck light");
  await expect(on.track).toHaveCSS("border-top-color", colors.GrayText);
  await expect(on.track).toHaveCSS("background-color", colors.GrayText);
  await expect(on.thumb).toHaveCSS("background-color", colors.Canvas);
});

test("paints a disabled slider's thumb and filled track GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  const { colors, disabledText } = await openDisabledControls(page);

  // The thumb and the track are native parts no computed style reaches, so
  // they are read from the rendered slider, which paints the theme's
  // disabled token nowhere.
  const rows = await paintedRows(
    page,
    page.getByRole("slider", { name: "Backlight level" }),
  );
  expect(
    rows.flat().includes(disabledText),
    "The slider paints the theme's disabled token.",
  ).toBe(false);

  // The slider stands at 60 of 100, so its midline crosses the filled half,
  // then the thumb's face, then the rest of the track. A live slider paints
  // the first two Highlight; the rest stays apart from them either way, which
  // is where the value reads.
  const midline = rows[Math.floor(rows.length / 2)] ?? [];
  const across = (fraction: number): string | undefined =>
    midline[Math.round(fraction * midline.length)];
  expect(across(0.2)).toBe(colors.GrayText);
  expect(across(0.6)).toBe(colors.GrayText);
  expect(across(0.9)).toBe(colors.ButtonText);
});

test("paints a disabled or blocked selected segment GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  const { colors } = await openDisabledControls(page);

  const expectGrayFill = async (option: Locator): Promise<void> => {
    await expect(option).toHaveAttribute("aria-checked", "true");
    await expect(option).toHaveCSS("background-color", colors.GrayText);
    await expect(option).toHaveCSS("color", colors.Canvas);
  };

  // Selected in a disabled group, beside an unselected option the system
  // grays, and a disabled option selected in a live group.
  await expectGrayFill(page.getByRole("radio", { name: "North up" }));
  await expect(page.getByRole("radio", { name: "Course up" })).toHaveCSS(
    "color",
    colors.GrayText,
  );
  await expectGrayFill(page.getByRole("radio", { name: "True wind" }));

  // A blocked option selected in a live group still takes the pointer, and
  // the theme has heavier hover and press rules for it, so it is read at
  // rest, hovered, and pressed.
  const blocked = page.getByRole("radio", { name: "Meters" });
  await expectGrayFill(blocked);
  await blocked.hover();
  await expectGrayFill(blocked);
  await page.mouse.down();
  await expectGrayFill(blocked);
  await page.mouse.up();
});

test("paints only a dimmed field label GrayText under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  const { colors } = await openDisabledControls(page);

  for (const { dims, label } of FIELD_LABELS) {
    const fieldText = fieldLabel(page, label);
    if (dims) {
      await expect(fieldText, label).toHaveCSS("color", colors.GrayText);
    } else {
      await expect(fieldText, label).not.toHaveCSS("color", colors.GrayText);
    }
  }
});

test("keeps a focused danger button's ring under forced colors while the pointer rests on it", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/showcase.html");
  await emulateForcedColors(page);
  const colors = await systemColors(page, ["ButtonText", "CanvasText"]);

  const danger = page.getByRole("button", { name: "Danger", exact: true });
  // Resting, the dashed outline is the danger cue.
  await expect(danger).toHaveCSS("outline-style", "dashed");
  await expect(danger).toHaveCSS("outline-color", colors.ButtonText);

  await page.keyboard.press("Tab");
  await danger.focus();
  await expect(danger).toHaveCSS("outline-style", "solid");
  // The hover restatement keeps system colors; it must not bring the
  // dashed outline back over the focus ring.
  await danger.hover();
  await expect(danger).toHaveCSS("outline-style", "solid");
  await expect(danger).toHaveCSS("outline-color", colors.CanvasText);
});

test("shows the focus ring on a keyboard-focused invalid field under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/?states=1");
  await emulateForcedColors(page);

  for (const field of [
    page.getByRole("textbox", { name: "Invalid server URL" }),
    page.getByRole("slider", { name: "Invalid confidence threshold" }),
    page.getByRole("checkbox", { name: "Missing agreement" }),
  ]) {
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    // At rest the dashed outline carries the invalid state.
    await expect(field).toHaveCSS("outline-style", "dashed");
    // A keystroke puts the page in keyboard modality, so the focus that
    // follows is visible focus.
    await page.keyboard.press("Shift");
    await field.focus();
    await expectSolidOutline(field);
  }
});
