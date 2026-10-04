import { DARK_TOKENS, NIGHT_TOKENS } from "../../src/styles/tokens.js";
import { hexChannels } from "../color-channels.js";
import {
  expect,
  expectSolidOutline,
  type Locator,
  type Page,
  type Pixels,
  renderedPixels,
  selectTheme,
  settleAnimations,
  type TestInfo,
  type ThemeName,
  test,
} from "./fixtures.js";

/*
 * Promises only a browser can check.
 *
 * An operator who asks the system for more contrast gets boundaries, container
 * outlines, and muted text at the text color in every theme, and focus rings
 * 3 pixels wide, the rings components draw themselves and the date picker's
 * included. The request is answered by one rule that has to tie each palette
 * rule on weight and follow it; a lighter rule reads fine as text and never
 * applies, so the computed tokens and ring widths are read here, and the
 * picker's ring, which no computed style reaches, from the rendered image.
 *
 * Night keeps the browser's own chrome red: the scrollbars, the selection
 * highlight, and the native option list, which computed styles reach, and the
 * parts Chromium draws itself, which they do not: the number spinner, the date
 * and time picker icons and their focus ring, the focused date segment, and
 * the textarea resize grip. Those are read from the rendered image, decoded by
 * the page, and the spinner and the grip are also used, to prove they still
 * work. Fields pinned to one value are read too, defensively, as
 * addDateAndTimeFields explains.
 *
 * Chromium only: the token cascade resolves the same way in every engine, and
 * the native parts measured here are Chromium's own.
 */

const THEMES: readonly ThemeName[] = ["Light", "Dark", "Night"];

/** The brightest green or blue channel Night lets a color carry. */
const NIGHT_CHANNEL_CAP = 0x40;

/** Why a cascade check runs in one engine. */
const CASCADE_ONLY =
  "The cascade is engine independent; checked in Chromium only.";

/** Why a check of the browser's own parts runs in one engine. */
const NATIVE_PARTS_ONLY =
  "These native parts are Chromium's own; checked in Chromium only.";

function skipOutsideChromium(
  testInfo: TestInfo,
  reason: string = CASCADE_ONLY,
): void {
  test.skip(testInfo.project.name !== "chromium", reason);
}

/** The computed value of each token on an element inside the panel. */
function tokenValues(
  target: Locator,
  names: readonly string[],
): Promise<Record<string, string>> {
  return target.evaluate(
    (element, tokenNames) =>
      Object.fromEntries(
        tokenNames.map((name) => [
          name,
          getComputedStyle(element).getPropertyValue(name).trim(),
        ]),
      ),
    names,
  );
}

const CONTRAST_TOKENS = [
  "--snui-color-text",
  "--snui-color-border",
  "--snui-color-border-subtle",
  "--snui-color-text-muted",
  "--snui-color-text-disabled",
] as const;

/** An element inside the panel root that inherits the root's tokens. */
function panelContent(page: Page): Locator {
  return page.getByRole("heading", { name: "Weather provider" });
}

/** Fails unless the answered request leaves every raised token at the text color. */
function expectRaisedToText(values: Record<string, string>): void {
  const text = values["--snui-color-text"];
  expect(text).not.toBe("");
  expect(values["--snui-color-border"]).toBe(text);
  expect(values["--snui-color-border-subtle"]).toBe(text);
  expect(values["--snui-color-text-muted"]).toBe(text);
  // Disabled text keeps a step below, so a blocked control still reads as
  // blocked.
  expect(values["--snui-color-text-disabled"]).not.toBe(text);
}

/** Every rgb() or rgba() color in a computed value, as channel triples. */
function rgbColors(value: string): [number, number, number][] {
  return [...value.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map(
    ([, red = "0", green = "0", blue = "0"]) => [
      Number.parseInt(red, 10),
      Number.parseInt(green, 10),
      Number.parseInt(blue, 10),
    ],
  );
}

/** Fails unless every color in the value keeps green and blue under the cap. */
function expectNightCapped(label: string, value: string): void {
  const colors = rgbColors(value);
  expect(colors.length, `${label} carries no color: ${value}`).toBeGreaterThan(
    0,
  );
  for (const [, green, blue] of colors) {
    expect(green, `${label} green in ${value}`).toBeLessThanOrEqual(
      NIGHT_CHANNEL_CAP,
    );
    expect(blue, `${label} blue in ${value}`).toBeLessThanOrEqual(
      NIGHT_CHANNEL_CAP,
    );
  }
}

for (const theme of THEMES) {
  test(`raises boundaries, outlines, and muted text on request in ${theme}`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo);
    await page.goto("/");
    await selectTheme(page, theme);

    // Without the request the tokens keep their own values, so the check
    // below proves the media query flipped them rather than a default.
    const resting = await tokenValues(panelContent(page), CONTRAST_TOKENS);
    expect(resting["--snui-color-border"]).not.toBe(
      resting["--snui-color-text"],
    );

    await page.emulateMedia({ contrast: "more" });
    expectRaisedToText(await tokenValues(panelContent(page), CONTRAST_TOKENS));
  });
}

test("widens every component focus ring on request", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/showcase.html");

  // A grid row the keyboard moves to draws its inset ring.
  const grid = page.getByRole("grid", { name: "Fleet" });
  await grid.getByRole("row").nth(1).focus();
  await page.keyboard.press("ArrowDown");
  const row = grid.locator('[role="row"][data-focus-visible]');
  await expect(row).toHaveCount(1);
  await expectSolidOutline(row, "3px");

  // A radio the keyboard moves to draws its ring on the visible control.
  await page.getByRole("radio", { name: "Follow the server" }).focus();
  await page.keyboard.press("ArrowDown");
  const radio = page.locator(
    ".snui-radio__button[data-focus-visible] .snui-radio__control",
  );
  await expect(radio).toHaveCount(1);
  await expectSolidOutline(radio, "3px");

  // A switch the keyboard reaches draws its ring on the visible track.
  await page.getByRole("switch", { name: "Track recording" }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const track = page.locator(
    ".snui-switch__button[data-focus-visible] .snui-switch__track",
  );
  await expect(track).toHaveCount(1);
  await expectSolidOutline(track, "3px");

  // A menu opened from the keyboard focuses its first item.
  await page.getByRole("button", { name: "Panel actions" }).focus();
  await page.keyboard.press("Enter");
  const item = page.locator('[role="menuitem"][data-focus-visible]');
  await expect(item).toHaveCount(1);
  await expectSolidOutline(item, "3px");
  await page.keyboard.press("Escape");

  // Without the request the rings keep their resting width.
  await page.emulateMedia({ contrast: "no-preference" });
  await page.getByRole("button", { name: "Panel actions" }).focus();
  await page.keyboard.press("Enter");
  await expectSolidOutline(item, "2px");
});

test("raises the tokens on request under a host's dark marker", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.emulateMedia({ contrast: "more" });
  await page.goto("/");
  // A panel that follows Admin carries no theme of its own, so the host's
  // marker sets its palette at the heaviest weight in the token sheet.
  await page.getByRole("radio", { name: "Match Admin" }).click();
  await expect(page.locator("[data-snui-version]")).not.toHaveAttribute(
    "data-snui-theme",
  );
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  });

  const values = await tokenValues(panelContent(page), CONTRAST_TOKENS);
  expectRaisedToText(values);
  // The dark palette's text, not the base palette's: the marker applied.
  expect(values["--snui-color-text"]).toBe(DARK_TOKENS["--snui-color-text"]);
});

test("keeps the browser's own chrome under the Night channel cap", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/");
  await selectTheme(page, "Night");

  // scrollbar-color inherits from the root, so any scroller inside the panel
  // reports it: the notes textarea is one.
  const scroller = page.getByRole("textbox", { name: "Operator notes" });
  expectNightCapped(
    "scrollbar-color",
    await scroller.evaluate(
      (element) => getComputedStyle(element).scrollbarColor,
    ),
  );

  const selection = await panelContent(page).evaluate((element) => {
    const style = getComputedStyle(element, "::selection");
    return `${style.backgroundColor} ${style.color}`;
  });
  expectNightCapped("::selection", selection);

  const option = await page
    .getByRole("combobox", { name: "Provider mode" })
    .locator("option")
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.backgroundColor} ${style.color}`;
    });
  expectNightCapped("option", option);
});

test("keeps the Night number spinner working", async ({ page }, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await page.goto("/");
  await selectTheme(page, "Night");

  // The spinner is repainted in Night, never removed: a mouse user's only
  // pointer route to step a number, since a wheel over the field blurs it.
  const field = page.getByRole("spinbutton", { name: "Refresh interval" });
  await field.hover();
  const box = await field.boundingBox();
  expect(
    box,
    "Expected the number field to have a rendered box.",
  ).not.toBeNull();
  if (box === null) return;
  const paddingEnd = await field.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingInlineEnd),
  );
  // The upper half of the spin button, just inside the field's end padding.
  await page.mouse.click(
    box.x + box.width - paddingEnd - 4,
    box.y + box.height / 2 - box.height / 8,
  );
  await expect(field).toHaveValue("11");
});

/**
 * How many pixels, measured in from the field's end padding, a click in the
 * upper half of the spin button steps the value. The part itself cannot be
 * measured: it is a shadow part, so its hit box is read by clicking.
 */
async function spinnerTargetWidth(page: Page, field: Locator): Promise<number> {
  const end = await field.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      Number.parseFloat(style.paddingInlineEnd) +
      Number.parseFloat(style.borderInlineEndWidth)
    );
  });
  let width = 0;
  for (let inset = 0; inset <= 30; inset += 1) {
    await field.fill("10");
    // Hovering scrolls the field into view, so its box is read afterwards:
    // a click outside the viewport lands nowhere.
    await field.hover();
    const box = await field.boundingBox();
    expect(
      box,
      "Expected the number field to have a rendered box.",
    ).not.toBeNull();
    if (box === null) return 0;
    await page.mouse.click(
      box.x + box.width - end - inset - 0.5,
      box.y + box.height * 0.3,
    );
    if ((await field.inputValue()) !== "10") width = inset + 1;
  }
  return width;
}

test("gives the Night spinner the pointer target the native one has", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await page.goto("/");
  const field = page.getByRole("spinbutton", { name: "Refresh interval" });

  await selectTheme(page, "Light");
  const native = await spinnerTargetWidth(page, field);
  // The native part is as wide as a scrollbar, so it is never a sliver.
  expect(native).toBeGreaterThanOrEqual(10);

  await selectTheme(page, "Night");
  expect(await spinnerTargetWidth(page, field)).toBeGreaterThanOrEqual(native);
});

/** Every pixel that `matches`, with its position. */
function pixelsWhere(
  pixels: Pixels,
  matches: (
    red: number,
    green: number,
    blue: number,
    x: number,
    y: number,
  ) => boolean,
): { readonly x: number; readonly y: number }[] {
  const found: { x: number; y: number }[] = [];
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      const [red, green, blue] = pixels.at(x, y);
      if (matches(red, green, blue, x, y)) found.push({ x, y });
    }
  }
  return found;
}

/** The brightest green or blue channel anywhere in the pixels. */
function brightestGreenOrBlue(pixels: Pixels): number {
  let brightest = 0;
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      const [, green, blue] = pixels.at(x, y);
      brightest = Math.max(brightest, green, blue);
    }
  }
  return brightest;
}

/** Whether a pixel is painted within a few steps of a Night token. */
function nearNightToken(
  token: keyof typeof NIGHT_TOKENS,
): (red: number, green: number, blue: number) => boolean {
  const [tokenRed, tokenGreen, tokenBlue] = hexChannels(NIGHT_TOKENS[token]);
  const near = (channel: number, value: number): boolean =>
    Math.abs(channel - value) <= 4;
  return (red, green, blue) =>
    near(red, tokenRed) && near(green, tokenGreen) && near(blue, tokenBlue);
}

/**
 * Pixels in a field's trailing 40 pixels, where a native button sits, painted
 * within a few steps of a Night token.
 */
function trailingPixelsIn(
  pixels: Pixels,
  token: keyof typeof NIGHT_TOKENS,
): number {
  const matches = nearNightToken(token);
  return pixelsWhere(
    pixels,
    (red, green, blue, x) =>
      x >= pixels.width - 40 && matches(red, green, blue),
  ).length;
}

/** The pixels of a repainted glyph, which takes the Night muted text token. */
function glyphPixels(pixels: Pixels): number {
  return trailingPixelsIn(pixels, "--snui-color-text-muted");
}

/** The pixels of the ring around a focused picker, in the Night focus token. */
function pickerRingPixels(pixels: Pixels): number {
  return trailingPixelsIn(pixels, "--snui-color-focus");
}

/**
 * Night text-strength pixels (red at 0xe0 or more) within 16 CSS pixels of the
 * bottom edge and of the given side, as their distance in device pixels from
 * that side and from the bottom; `scale` is the device pixel ratio. The border
 * and the surface sit below that red, so in that corner these are the resize
 * grip's strokes.
 */
function cornerStrokes(
  pixels: Pixels,
  side: "left" | "right",
  scale = 1,
): { readonly fromBottom: number; readonly fromSide: number }[] {
  const reach = 16 * scale;
  return pixelsWhere(pixels, (red, _green, _blue, x, y) => {
    const fromSide = side === "left" ? x : pixels.width - 1 - x;
    return fromSide < reach && pixels.height - 1 - y < reach && red >= 0xe0;
  }).map(({ x, y }) => ({
    fromBottom: pixels.height - 1 - y,
    fromSide: side === "left" ? x : pixels.width - 1 - x,
  }));
}

/**
 * Fails unless the grip's strokes are drawn, stand three CSS pixels clear of
 * the one pixel border as the native grip's do, and face the corner: each
 * stroke runs across the corner, so the sum of a pixel's distances from the
 * side and the bottom barely varies while their difference spans the stroke.
 * `scale` is the device pixel ratio the distances were measured at.
 */
function expectGripFacingCorner(
  strokes: readonly {
    readonly fromBottom: number;
    readonly fromSide: number;
  }[],
  scale = 1,
): void {
  expect(strokes.length, "the grip draws no strokes").toBeGreaterThan(0);
  for (const { fromBottom, fromSide } of strokes) {
    expect(fromSide, "a stroke meets the side border").toBeGreaterThanOrEqual(
      Math.floor(3 * scale),
    );
    expect(
      fromBottom,
      "a stroke meets the bottom border",
    ).toBeGreaterThanOrEqual(Math.floor(3 * scale));
  }
  const spread = (values: number[]): number =>
    Math.max(...values) - Math.min(...values);
  expect(
    spread(strokes.map(({ fromBottom, fromSide }) => fromSide + fromBottom)),
    "the strokes do not face the corner",
  ).toBeLessThan(
    spread(strokes.map(({ fromBottom, fromSide }) => fromSide - fromBottom)),
  );
  expectEqualStrokeWeights(strokes);
}

/**
 * Fails unless the grip draws two strokes of one weight, as the native grip
 * does. Each stroke fills one or more whole pixel diagonals, one distance sum
 * apiece, and a gap separates the two strokes.
 */
function expectEqualStrokeWeights(
  strokes: readonly {
    readonly fromBottom: number;
    readonly fromSide: number;
  }[],
): void {
  const diagonals = [
    ...new Set(
      strokes.map(({ fromBottom, fromSide }) => fromSide + fromBottom),
    ),
  ].sort((first, second) => first - second);
  const weights: number[] = [];
  for (const [index, diagonal] of diagonals.entries()) {
    if (index > 0 && diagonal === (diagonals[index - 1] ?? 0) + 1) {
      weights[weights.length - 1] = (weights.at(-1) ?? 0) + 1;
    } else {
      weights.push(1);
    }
  }
  expect(weights, "the grip draws two strokes").toHaveLength(2);
  expect(weights[0], "the strokes differ in weight").toBe(weights[1]);
}

/** Opens the showcase in Night, settled. */
async function openNightShowcase(page: Page): Promise<void> {
  await page.goto("/showcase.html");
  await selectTheme(page, "Night");
  await settleAnimations(page);
}

/**
 * Adds a date and a time field beside the month field, with its classes, so
 * the date and time picker rules paint in the page the other fields do, plus
 * a month field pinned to one month by min and max and a time field whose
 * step leaves its minutes fixed. Those two are defensive: a browser that greys
 * a segment it fixes would fail the cap check on them, but the Chromium 153
 * that Playwright bundles draws no fixed segment for either, so today only the
 * unit text check pins the segment color rule.
 */
async function addDateAndTimeFields(page: Page): Promise<void> {
  await page
    .getByLabel("Season start", { exact: true })
    .evaluate((monthField) => {
      const probes: readonly (readonly [
        string,
        string,
        Record<string, string>,
      ])[] = [
        ["time", "Probe time", {}],
        ["date", "Probe date", {}],
        [
          "month",
          "Probe pinned month",
          { max: "2026-05", min: "2026-05", value: "2026-05" },
        ],
        ["time", "Probe hourly time", { step: "3600", value: "09:00" }],
      ];
      for (const [type, label, bounds] of probes) {
        const field = monthField.ownerDocument.createElement("input");
        field.type = type;
        field.setAttribute("class", monthField.getAttribute("class") ?? "");
        field.setAttribute("aria-label", label);
        for (const [name, value] of Object.entries(bounds)) {
          field.setAttribute(name, value);
        }
        monthField.after(field);
      }
    });
}

/*
 * Every color the tokens paint is under the cap, so any pixel above it in one
 * of these fields is a native part the browser drew from its own scheme: the
 * calendar icon of a date, month, or week field, the clock of a time field,
 * and the resize grip of a textarea. The pinned fields would catch a segment
 * the browser fixes as disabled, if it drew that segment grey. A picker must
 * still paint its glyph, so a glyph masked away entirely fails as well.
 */
for (const label of [
  "Season start",
  "Regatta week",
  "Probe date",
  "Probe time",
  "Probe pinned month",
  "Probe hourly time",
  "Operator notes",
]) {
  test(`keeps the ${label} field's native parts under the Night channel cap`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
    await openNightShowcase(page);
    await addDateAndTimeFields(page);

    const pixels = await renderedPixels(
      page,
      page.getByLabel(label, { exact: true }),
    );
    expect(brightestGreenOrBlue(pixels)).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
    if (label !== "Operator notes") {
      expect(glyphPixels(pixels), "the picker glyph").toBeGreaterThan(10);
    }
  });
}

test("keeps the focused date segment under the Night channel cap", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await openNightShowcase(page);

  // Focusing the field puts the browser's own focus on its first segment.
  const field = page.getByLabel("Season start", { exact: true });
  await field.focus();
  expect(
    brightestGreenOrBlue(await renderedPixels(page, field)),
  ).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
});

/**
 * The Season start field as the keyboard reaches its picker: once with focus
 * on the year, then with focus on the picker. A month field edits a month and
 * a year, then offers its picker; focusing the field lands on the month.
 */
async function pickerFocusImages(
  page: Page,
): Promise<{ readonly beforePicker: Pixels; readonly onPicker: Pixels }> {
  const field = page.getByLabel("Season start", { exact: true });
  await field.blur();
  await field.focus();
  await page.keyboard.press("Tab");
  const beforePicker = await renderedPixels(page, field);
  await page.keyboard.press("Tab");
  return { beforePicker, onPicker: await renderedPixels(page, field) };
}

test("rings the Night date picker in the focus token when the keyboard reaches it", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await openNightShowcase(page);

  const { beforePicker, onPicker } = await pickerFocusImages(page);

  expect(pickerRingPixels(beforePicker)).toBeLessThan(20);
  // A two pixel ring around the part, not a sliver the glyph mask left.
  expect(pickerRingPixels(onPicker)).toBeGreaterThanOrEqual(60);
  expect(glyphPixels(onPicker)).toBeGreaterThan(10);
  expect(brightestGreenOrBlue(onPicker)).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
});

/**
 * The ring around a focused picker, in device pixels: its outer edges,
 * inclusive, and its width.
 */
interface PickerRing {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

/**
 * The ring that appears when focus moves onto a field's picker, from the
 * pixels that changed in the field's trailing 40 pixels. The field's own
 * edge can change too, so the ring is traced from its leading side, the
 * first change in: that column spans the ring's height, the top row its
 * length, and the run along the middle row its width. The glyph inside the
 * ring is the same in both images, so that run ends with the ring.
 */
function ringBetween(before: Pixels, after: Pixels): PickerRing {
  const changed = (x: number, y: number): boolean => {
    const was = before.at(x, y);
    return after
      .at(x, y)
      .some((channel, index) => Math.abs(channel - (was[index] ?? 0)) > 8);
  };
  const ring = pixelsWhere(
    after,
    (_red, _green, _blue, x, y) => x >= after.width - 40 && changed(x, y),
  );
  expect(ring.length, "no ring appeared around the picker").toBeGreaterThan(0);
  const left = Math.min(...ring.map(({ x }) => x));
  const rows = ring.filter(({ x }) => x === left).map(({ y }) => y);
  const top = Math.min(...rows);
  const bottom = Math.max(...rows);
  const runFrom = (y: number): number => {
    let run = 0;
    while (left + run < after.width && changed(left + run, y)) run += 1;
    return run;
  };
  return {
    bottom,
    left,
    right: left + runFrom(top) - 1,
    top,
    width: runFrom(Math.round((top + bottom) / 2)),
  };
}

/**
 * Pixels inside a picker's ring painted within a few steps of a Night token.
 * Under the contrast request the field's border and the ring take the text
 * color too, so only the area the ring encloses shows the glyph alone.
 */
function pixelsInsideRing(
  pixels: Pixels,
  ring: PickerRing,
  token: keyof typeof NIGHT_TOKENS,
): number {
  const matches = nearNightToken(token);
  return pixelsWhere(
    pixels,
    (red, green, blue, x, y) =>
      x >= ring.left + ring.width &&
      x <= ring.right - ring.width &&
      y >= ring.top + ring.width &&
      y <= ring.bottom - ring.width &&
      matches(red, green, blue),
  ).length;
}

/*
 * Chromium draws a focused picker's ring itself, 2 pixels wide, and no author
 * :focus-visible reaches the part, so the package sets its width from the
 * shared token in every theme: the request widens it with every other ring.
 */
for (const theme of THEMES) {
  test(`widens the ${theme} date picker ring on request`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
    await page.goto("/showcase.html");
    await selectTheme(page, theme);
    await settleAnimations(page);

    for (const [contrast, width] of [
      ["no-preference", 2],
      ["more", 3],
    ] as const) {
      await page.emulateMedia({ contrast });
      const { beforePicker, onPicker } = await pickerFocusImages(page);
      const ring = ringBetween(beforePicker, onPicker);
      expect(ring.width, contrast).toBe(width);

      if (theme === "Night") {
        // The wider band the mask opens leaves the glyph, which the request
        // paints at the text color.
        expect(
          pixelsInsideRing(
            onPicker,
            ring,
            contrast === "more"
              ? "--snui-color-text"
              : "--snui-color-text-muted",
          ),
          `the picker glyph at ${contrast}`,
        ).toBeGreaterThan(10);
        expect(brightestGreenOrBlue(onPicker)).toBeLessThanOrEqual(
          NIGHT_CHANNEL_CAP,
        );
      }
    }
  });
}

test("keeps the Night resize grip resizing the field", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await page.goto("/showcase.html");
  await selectTheme(page, "Night");

  const notes = page.getByRole("textbox", { name: "Operator notes" });
  await notes.scrollIntoViewIfNeeded();
  const before = await notes.boundingBox();
  expect(
    before,
    "Expected the notes field to have a rendered box.",
  ).not.toBeNull();
  if (before === null) return;
  // The grip sits in the field's bottom trailing corner.
  await page.mouse.move(
    before.x + before.width - 3,
    before.y + before.height - 3,
  );
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width - 3,
    before.y + before.height + 40,
    { steps: 5 },
  );
  await page.mouse.up();
  const after = await notes.boundingBox();
  expect(after?.height ?? 0).toBeGreaterThan(before.height + 20);
});

test("draws the Night resize grip clear of the border, facing its corner", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await openNightShowcase(page);

  const notes = page.getByRole("textbox", { name: "Operator notes" });
  expectGripFacingCorner(
    cornerStrokes(await renderedPixels(page, notes), "right"),
  );
});

test("mirrors the Night resize grip in a right-to-left field", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await openNightShowcase(page);

  // The browser moves the grip to the bottom left of a right-to-left field.
  const notes = page.getByRole("textbox", { name: "Operator notes" });
  await notes.evaluate((field) => {
    field.setAttribute("dir", "rtl");
  });
  expectGripFacingCorner(
    cornerStrokes(await renderedPixels(page, notes), "left"),
  );
});

test("draws the Night resize grip in button text under forced colors, on a clear corner", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await page.emulateMedia({ forcedColors: "active" });
  await openNightShowcase(page);

  const pixels = await renderedPixels(
    page,
    page.getByRole("textbox", { name: "Operator notes" }),
  );
  const fromCorner = (fromRight: number, fromBottom: number) =>
    pixels.at(pixels.width - 1 - fromRight, pixels.height - 1 - fromBottom);
  // The grip's corner box shows the field's own canvas outside the strokes:
  // the top leading pixel of the box matches the field well away from it.
  expect(fromCorner(12, 12)).toEqual(fromCorner(40, 12));
  // And the strokes are drawn in something other than that canvas.
  const canvas = fromCorner(40, 12);
  const strokes = pixelsWhere(
    pixels,
    (red, green, blue, x, y) =>
      pixels.width - 1 - x < 12 &&
      pixels.height - 1 - y < 12 &&
      pixels.width - 1 - x >= 3 &&
      pixels.height - 1 - y >= 3 &&
      (red !== canvas[0] || green !== canvas[1] || blue !== canvas[2]),
  );
  expect(strokes.length).toBeGreaterThan(0);
  expectEqualStrokeWeights(
    strokes.map(({ x, y }) => ({
      fromBottom: pixels.height - 1 - y,
      fromSide: pixels.width - 1 - x,
    })),
  );
});

test("keeps the hovered Night number spinner under the channel cap", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
  await page.goto("/");
  await selectTheme(page, "Night");
  await settleAnimations(page);

  // The browser shows the spinner only while the field is hovered or focused.
  const field = page.getByRole("spinbutton", { name: "Refresh interval" });
  await field.hover();
  const pixels = await renderedPixels(page, field);
  expect(brightestGreenOrBlue(pixels)).toBeLessThanOrEqual(NIGHT_CHANNEL_CAP);
  expect(glyphPixels(pixels), "the spinner glyph").toBeGreaterThan(10);
});

/*
 * The grip's two bands are equally wide and a quarter of the tile apart, so
 * the strokes keep one weight on a scaled or high density screen too, where
 * each covers more device pixel diagonals: a laptop at 125 percent, and
 * screens at 2 and 2.5 device pixels per CSS pixel.
 */
for (const scale of [1.25, 2, 2.5]) {
  test.describe(`at a device pixel ratio of ${String(scale)}`, () => {
    test.use({ deviceScaleFactor: scale });

    for (const side of ["right", "left"] as const) {
      test(`keeps both Night grip strokes one weight in the bottom ${side} corner`, async ({
        page,
      }, testInfo) => {
        skipOutsideChromium(testInfo, NATIVE_PARTS_ONLY);
        await openNightShowcase(page);

        const notes = page.getByRole("textbox", { name: "Operator notes" });
        if (side === "left") {
          await notes.evaluate((field) => {
            field.setAttribute("dir", "rtl");
          });
        }
        expectGripFacingCorner(
          cornerStrokes(await renderedPixels(page, notes), side, scale),
          scale,
        );
      });
    }
  });
}
