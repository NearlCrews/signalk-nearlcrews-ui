import { CONTAINER_BREAKPOINT_NARROW } from "../../src/styles/tokens.js";
import {
  backgroundOf,
  expect,
  expectProjectPointer,
  expectSolidOutline,
  type Locator,
  MOBILE_PROJECT,
  type Page,
  selectTheme,
  systemColors,
  test,
  tokenColor,
} from "./fixtures.js";

/*
 * Rendered checks for the design tokens: the unit suite proves the declared
 * pairs, this file proves what the browser paints from them.
 */

/** Resolves a computed border radius (px or %) against the element's width. */
async function radiusRatio(dot: Locator): Promise<number> {
  return dot.evaluate((element) => {
    const { borderRadius, width } = getComputedStyle(element);
    // `split` always yields a first segment, so the default never applies at
    // runtime; it is what satisfies noUncheckedIndexedAccess.
    const [horizontal = "0"] = borderRadius.split(" ");
    const px = horizontal.endsWith("%")
      ? (Number.parseFloat(horizontal) / 100) * Number.parseFloat(width)
      : Number.parseFloat(horizontal);
    return px / Number.parseFloat(width);
  });
}

/**
 * A length, a token or a literal, in pixels inside the panel, read from a
 * probe so the comparison follows the pointer and breakpoint in force.
 */
function cssLength(anchor: Locator, length: string): Promise<number> {
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

test("shapes the info dot as a rounded square, distinct from neutral", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const indicators = page.locator(".snui-status");
  const neutralDot = indicators
    .filter({ hasText: "neutral" })
    .locator(".snui-status__dot");
  const infoDot = indicators
    .filter({ hasText: "info" })
    .locator(".snui-status__dot");

  const [neutralRatio, infoRatio] = await Promise.all([
    radiusRatio(neutralDot),
    radiusRatio(infoDot),
  ]);

  // A radius at or above half the width clamps to a circle.
  expect(infoRatio).toBeLessThan(0.5);
  expect(infoRatio).toBeGreaterThan(0);
  expect(neutralRatio).toBeGreaterThanOrEqual(0.5);
  expect(infoRatio).not.toBeCloseTo(neutralRatio, 2);
});

test("keeps input text at 16 pixels or more on coarse pointers", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== MOBILE_PROJECT,
    "The 16 pixel floor targets iOS Safari focus zoom, driven by the coarse-pointer query.",
  );
  await page.goto("/showcase.html");
  for (const control of [
    page.getByRole("textbox", { name: "Server URL" }),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
  ]) {
    const fontSize = await control.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});

test("paints a visible hover fill on Dark menu items", async ({ page }) => {
  await page.goto("/showcase.html");
  await selectTheme(page, "Dark");
  await page.getByRole("button", { name: "Panel actions" }).click();

  const menu = page.getByRole("menu");
  const item = menu.getByRole("menuitem", { name: "Refresh data" });
  await expect(item).toBeVisible();
  const popoverFill = await backgroundOf(page.locator(".snui-menu-popover"));
  await item.hover();
  await expect.poll(() => backgroundOf(item)).not.toBe("rgba(0, 0, 0, 0)");
  const hoverFill = await backgroundOf(item);

  expect(hoverFill).not.toBe(popoverFill);
});

test("paints zebra rows that differ from the grid surface in Light and Night", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const grid = page.locator(".snui-data-grid");
  const rows = page
    .getByRole("grid", { name: "Fleet" })
    .locator("[role='row'][data-snui-zebra-odd]");

  for (const theme of ["Light", "Night"] as const) {
    await selectTheme(page, theme);
    await expect(rows.first()).toBeVisible();
    const [surface, stripe] = await Promise.all([
      backgroundOf(grid),
      backgroundOf(rows.first()),
    ]);
    expect(stripe, `${theme} zebra row equals the surface`).not.toBe(surface);
    expect(stripe).not.toBe("rgba(0, 0, 0, 0)");
  }
});

test("paints table zebra rows and the scroll region focus ring from the tokens", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const region = page.getByRole("region", {
    name: "Signal K paths, scrollable",
  });
  const table = page.getByRole("table", { name: "Signal K paths" });
  const striped = table.locator("tbody tr:nth-child(even) > td").first();
  const plain = table.locator("tbody tr:nth-child(odd) > td").first();

  for (const theme of ["Light", "Night"] as const) {
    await selectTheme(page, theme);
    await expect(striped).toBeVisible();
    const [stripe, plainFill, stripeToken, surfaceToken] = await Promise.all([
      backgroundOf(striped),
      backgroundOf(plain),
      tokenColor(striped, "--snui-color-surface-stripe"),
      tokenColor(striped, "--snui-color-surface"),
    ]);
    expect(stripe, `${theme} zebra cell misses the stripe token`).toBe(
      stripeToken,
    );
    expect(stripeToken, `${theme} stripe equals the surface`).not.toBe(
      surfaceToken,
    );
    // Only alternate rows take the fill, so the stripe reads as a pattern.
    expect(plainFill, `${theme} unstriped cell carries a fill`).toBe(
      "rgba(0, 0, 0, 0)",
    );

    // The region is a tab stop, so its ring has to survive every theme. Focus
    // leaves and returns by keyboard because the theme click put the engine in
    // pointer mode, and Firefox grants :focus-visible only to focus that
    // keyboard navigation delivered, never to a programmatic call.
    await region.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(region).toBeFocused();
    const [ring, focusToken] = await Promise.all([
      region.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          color: computed.outlineColor,
          radius: Number.parseFloat(computed.borderTopLeftRadius),
          style: computed.outlineStyle,
          width: Number.parseFloat(computed.outlineWidth),
        };
      }),
      tokenColor(region, "--snui-color-focus"),
    ]);
    expect(ring.style, `${theme} region ring style`).toBe("solid");
    expect(ring.width, `${theme} region ring width`).toBeGreaterThanOrEqual(2);
    expect(ring.color, `${theme} region ring color`).toBe(focusToken);
    // The module rounds the ring rather than leaving the sharp default.
    expect(ring.radius, `${theme} region ring radius`).toBeGreaterThan(0);
  }
});

test("keeps the selected tab and its focus ring visible under forced colors", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Playwright emulates forced colors in Chromium only.",
  );
  await page.goto("/showcase.html");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });

  const list = page.getByRole("tablist", { name: "Provider detail" });
  const overview = list.getByRole("tab", { name: "Overview" });
  const advanced = list.getByRole("tab", { name: "Advanced" });
  await expect(overview).toHaveAttribute("aria-selected", "true");

  const colors = await systemColors(page, ["CanvasText", "Highlight"]);
  const [selected, unselectedBorder] = await Promise.all([
    overview.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        color: computed.borderBottomColor,
        width: Number.parseFloat(computed.borderBottomWidth),
      };
    }),
    advanced.evaluate((element) => getComputedStyle(element).borderBottomColor),
  ]);
  // Forced colors flattens the accent, so the selected bar is redrawn in the
  // system highlight; an unselected tab must not pick the same mark up.
  await expect(overview).toHaveCSS("forced-color-adjust", "none");
  expect(selected.color).toBe(colors.Highlight);
  // A highlight the engine paints nowhere is not a selection mark.
  expect(selected.width).toBeGreaterThan(0);
  expect(unselectedBorder).not.toBe(colors.Highlight);

  // Arrow keys move the tab stop, so the ring is measured after a real
  // keyboard interaction rather than a programmatic focus.
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  const sources = list.getByRole("tab", { name: "Sources" });
  await expect(sources).toBeFocused();
  await expectSolidOutline(sources);
  await expect(sources).toHaveCSS("outline-color", colors.CanvasText);
});

test("tells a hovered grid row from a selected one under forced colors", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Playwright emulates forced colors in Chromium only.",
  );
  await page.goto("/showcase.html");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });

  const grid = page.getByRole("grid", { name: "Fleet" });
  // Row 1 is the header, so the first two body rows are 2 and 3.
  const selected = grid.locator('[role="row"][aria-rowindex="2"]');
  const hovered = grid.locator('[role="row"][aria-rowindex="3"]');
  await selected.click();
  await expect(selected).toHaveAttribute("aria-selected", "true");
  await hovered.hover();
  await expect(hovered).toHaveAttribute("data-hovered", "true");
  await expect(hovered).toHaveAttribute("aria-selected", "false");

  const colors = await systemColors(page, ["CanvasText", "Highlight"]);
  // The Highlight fill is the selection mark alone; a hovered row is outlined
  // instead, so a pointer moving across the grid cannot pass for a selection.
  expect(await backgroundOf(selected)).toBe(colors.Highlight);
  expect(await backgroundOf(hovered)).not.toBe(colors.Highlight);
  await expect(hovered).toHaveCSS("outline-style", "dashed");
  await expect(hovered).toHaveCSS("outline-color", colors.Highlight);
});

test("shows the whole value of the grid cell that holds keyboard focus", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const grid = page.getByRole("grid", { name: "Fleet" });
  const firstRow = grid.locator('[role="row"][aria-rowindex="2"]');
  // The first column is the row header; the source column is the third
  // gridcell, and the first vessel's source is wider than the column.
  const source = firstRow.getByRole("gridcell").nth(2);
  const text = source.locator(".snui-data-grid__cell-text");
  const overflows = (): Promise<boolean> =>
    text.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  const rowHeight = async (): Promise<number> =>
    (await firstRow.boundingBox())?.height ?? 0;

  // A truncated value, on one line, before the cell holds focus.
  await expect(text).toHaveCSS("text-overflow", "ellipsis");
  expect(await overflows()).toBe(true);
  const heightBefore = await rowHeight();

  await firstRow.focus();
  // Across Boat, Depth, and Wind to Source.
  for (let column = 0; column < 4; column += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await expect(source).toHaveAttribute("data-focus-visible", "true");
  await expect(text).toHaveCSS("white-space", "normal");
  await expect(text).toHaveCSS("text-overflow", "clip");

  // The whole value now fits its cell, and the measured row grew to hold it.
  await expect.poll(overflows).toBe(false);
  await expect.poll(rowHeight).toBeGreaterThan(heightBefore);
  const [textBox, rowBox] = await Promise.all([
    text.boundingBox(),
    firstRow.boundingBox(),
  ]);
  expect(textBox).not.toBeNull();
  expect(rowBox).not.toBeNull();
  if (textBox !== null && rowBox !== null) {
    expect(textBox.y + textBox.height).toBeLessThanOrEqual(
      rowBox.y + rowBox.height + 1,
    );
  }
});

test("paints Section and CollapsibleSection as one surface", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator(".snui-section", {
    has: page.getByRole("heading", { name: "Connection", exact: true }),
  });
  const collapsible = page.locator(".snui-collapsible", {
    has: page.getByRole("button", { name: "Provider status and metrics" }),
  });
  const toggle = collapsible.getByRole("button", {
    name: "Provider status and metrics",
  });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  /** The surface, title, and content inset one shell paints. */
  const read = (shell: Locator, title: string, content: string) =>
    shell.evaluate(
      (element, [titleSelector, contentSelector]) => {
        const heading = element.querySelector(titleSelector);
        const body = element.querySelector(contentSelector);
        if (heading === null || body === null) {
          throw new Error(`Missing ${titleSelector} or ${contentSelector}.`);
        }
        const surface = getComputedStyle(element);
        const titleStyle = getComputedStyle(heading);
        return {
          border: surface.borderTopColor,
          inset: Math.round(
            body.getBoundingClientRect().left -
              element.getBoundingClientRect().left,
          ),
          radius: surface.borderTopLeftRadius,
          shadow: surface.boxShadow,
          titleSize: titleStyle.fontSize,
          titleWeight: titleStyle.fontWeight,
        };
      },
      [title, content] as const,
    );
  // The toggle carries the collapsible title's weight and size, and the
  // first content child sits at the collapsible's inset, border included on
  // both sides.
  const [sectionStyle, collapsibleStyle] = await Promise.all([
    read(section, ".snui-section__title", ".snui-section__header"),
    read(
      collapsible,
      ".snui-collapsible__toggle",
      ".snui-collapsible__content > *",
    ),
  ]);
  expect(collapsibleStyle.radius).toBe(sectionStyle.radius);
  expect(collapsibleStyle.shadow).toBe(sectionStyle.shadow);
  expect(collapsibleStyle.border).toBe(sectionStyle.border);
  expect(collapsibleStyle.titleWeight).toBe(sectionStyle.titleWeight);
  expect(collapsibleStyle.titleSize).toBe(sectionStyle.titleSize);
  // Content keeps one inline edge: the section inset.
  expect(collapsibleStyle.inset).toBe(sectionStyle.inset);
});

test("neutralizes the remaining Bootstrap Reboot element rules inside the panel", async ({
  page,
}) => {
  await page.goto("/?host-reset=1");
  // The fixture stylesheet carries the Reboot rules; the probe markup is a
  // consumer's unclassed elements appended inside the panel content.
  await page.locator(".snui-root__content").evaluate((content) => {
    content.insertAdjacentHTML(
      "beforeend",
      `<div data-testid="reboot-probe">
        <p>Body <code>code</code> <kbd>kbd</kbd> <samp>samp</samp> <small>small</small> <mark>mark</mark> <strong>strong</strong> <b>b</b></p>
        <pre>pre</pre>
        <label>label</label>
        <table><thead><tr><th>th</th></tr></thead></table>
        <button type="button">button</button>
      </div>`,
    );
  });
  const probe = page.getByTestId("reboot-probe");
  const styles = await probe.evaluate((element) => {
    const pick = (selector: string, ...properties: string[]) => {
      const node = element.querySelector(selector);
      if (node === null) throw new Error(`missing ${selector}`);
      const computed = getComputedStyle(node);
      return Object.fromEntries(
        properties.map((property) => [
          property,
          computed.getPropertyValue(property),
        ]),
      );
    };
    const bodyColor = getComputedStyle(element).color;
    return {
      bodyColor,
      button: pick("button", "border-radius"),
      code: pick("code", "color", "padding-top", "background-color"),
      kbd: pick(
        "kbd",
        "color",
        "padding-left",
        "background-color",
        "border-radius",
      ),
      label: pick("label", "display"),
      mark: pick("mark", "background-color", "padding-left"),
      pre: pick("pre", "margin-bottom"),
      strong: pick("strong", "font-weight"),
      th: pick("th", "font-weight"),
    };
  });

  expect(styles.code.color).toBe(styles.bodyColor);
  expect(styles.code["padding-top"]).toBe("0px");
  expect(styles.code["background-color"]).toBe("rgba(0, 0, 0, 0)");
  expect(styles.kbd.color).toBe(styles.bodyColor);
  expect(styles.kbd["padding-left"]).toBe("0px");
  expect(styles.kbd["background-color"]).toBe("rgba(0, 0, 0, 0)");
  expect(styles.kbd["border-radius"]).toBe("0px");
  // The host highlight is replaced rather than erased, so the mark paints the
  // package's own accent tint instead of nothing at all.
  expect(styles.mark["background-color"]).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.mark["padding-left"]).toBe("0px");
  expect(styles.pre["margin-bottom"]).toBe("0px");
  expect(styles.label.display).toBe("inline");
  expect(styles.th["font-weight"]).toBe("600");
  expect(styles.strong["font-weight"]).toBe("700");
  expect(styles.button["border-radius"]).not.toBe("0px");
});

test("sizes heading levels down the shared type scale", async ({ page }) => {
  await page.goto("/?host-reset=1");
  await page.locator(".snui-root__content").evaluate((content) => {
    content.insertAdjacentHTML(
      "beforeend",
      `<div data-testid="heading-probe"><h1>one</h1><h2>two</h2><h3>three</h3><h4>four</h4></div>`,
    );
  });
  const sizes = await page.getByTestId("heading-probe").evaluate((element) =>
    ["h1", "h2", "h3", "h4"].map((tag) => {
      const heading = element.querySelector(tag);
      if (heading === null) throw new Error(`missing ${tag}`);
      return Number.parseFloat(getComputedStyle(heading).fontSize);
    }),
  );
  expect(sizes).toEqual([24, 20, 18, 15]);
});

test("keeps horizontal content padding at or above the safe-area inset", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const content = page.locator(".snui-root__content");
  const narrowBelow = await cssLength(content, CONTAINER_BREAKPOINT_NARROW);
  const rootWidth = await content.evaluate(
    (element) =>
      (element.closest(".snui-root") ?? element).getBoundingClientRect().width,
  );
  // The narrow container step pads with space-3; wider panels use space-4.
  const gutter = await cssLength(
    content,
    rootWidth <= narrowBelow ? "var(--snui-space-3)" : "var(--snui-space-4)",
  );
  const padding = await content.evaluate((element) => {
    const computed = getComputedStyle(element);
    return [
      Number.parseFloat(computed.paddingLeft),
      Number.parseFloat(computed.paddingRight),
    ];
  });
  // With no inset reported, max() resolves to the spacing token in force.
  expect(padding).toEqual([gutter, gutter]);
});

/** The panel page's banners that carry actions: a bordered Retry, and a Dismiss. */
const BANNERS_WITH_ACTIONS = ["Provider unavailable", "Server units apply"];

/**
 * Where a banner's first action sits: its inset under the top border, and
 * how far its midline is from the title's.
 */
function firstActionPlacement(
  banner: Locator,
): Promise<{ inset: number; midlineOffset: number }> {
  return banner.evaluate((element) => {
    const action = element.querySelector(".snui-banner__actions > *");
    const heading = element.querySelector(".snui-banner__title");
    if (action === null || heading === null) {
      throw new Error("The banner has no action or no title.");
    }
    const box = element.getBoundingClientRect();
    const actionBox = action.getBoundingClientRect();
    const titleBox = heading.getBoundingClientRect();
    return {
      inset:
        actionBox.top -
        box.top -
        Number.parseFloat(getComputedStyle(element).borderTopWidth),
      midlineOffset: Math.abs(
        (actionBox.top + actionBox.bottom) / 2 -
          (titleBox.top + titleBox.bottom) / 2,
      ),
    };
  });
}

/**
 * How many lines a Progress label takes, and how far its tone glyph's midline
 * is from the midline of the label's first line.
 */
function toneGlyphPlacement(
  progress: Locator,
): Promise<{ lines: number; offset: number }> {
  return progress.evaluate((element) => {
    const label = element.querySelector(".snui-progress__label");
    const glyph = element.querySelector(".snui-progress__tone-glyph");
    if (label === null || glyph === null) {
      throw new Error("The progress has no label or no tone glyph.");
    }
    const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight);
    if (Number.isNaN(lineHeight)) {
      throw new Error("The label's line height is not a length.");
    }
    const range = document.createRange();
    range.selectNodeContents(label);
    const lineTops = new Set(
      [...range.getClientRects()].map((line) => Math.round(line.top)),
    );
    const glyphBox = glyph.getBoundingClientRect();
    return {
      lines: lineTops.size,
      offset: Math.abs(
        (glyphBox.top + glyphBox.bottom) / 2 -
          (label.getBoundingClientRect().top + lineHeight / 2),
      ),
    };
  });
}

interface EdgeBox {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** The geometry page's collapsible header shapes, plain and toned. */
const PLAIN_COLLAPSIBLE = "Provider status and metrics";
const TONED_ONE_LINE_COLLAPSIBLE = "Provider status";
const TONED_WRAPPING_COLLAPSIBLE = "Provider alerts and metrics";

/**
 * A collapsible header on the geometry page, found by its title: the summary
 * badge and action boxes, the title text's start edge, first-line midline,
 * and line count, the midlines of the chevron and of the toggle's tone glyph
 * (null when untoned), and the end of the header's content box.
 */
function collapsibleHeader(
  page: Page,
  title: string,
): Promise<{
  action: EdgeBox;
  badge: EdgeBox;
  chevronMid: number;
  contentEnd: number;
  glyphMid: number | null;
  titleLines: number;
  titleMid: number;
  titleStart: number;
}> {
  return page
    .locator(".snui-collapsible", {
      has: page.getByText(title, { exact: true }),
    })
    .evaluate((section) => {
      const header = section.querySelector(
        ":scope > .snui-collapsible__header",
      );
      if (header === null) throw new Error("The collapsible has no header.");
      const heading = header.querySelector(".snui-collapsible__title");
      const chevron = header.querySelector(".snui-collapsible__chevron");
      const badge = header.querySelector(
        ".snui-collapsible__summary--header .snui-badge",
      );
      const action = header.querySelector(
        ".snui-collapsible__actions .snui-button",
      );
      if (
        heading === null ||
        chevron === null ||
        badge === null ||
        action === null
      ) {
        throw new Error("The collapsible header lacks a part it should have.");
      }
      // The badge carries a tone glyph of its own, so the toggle's is looked
      // up inside the toggle.
      const glyph = header.querySelector(
        ".snui-collapsible__toggle .snui-tone-glyph",
      );
      const edges = ({ bottom, left, right, top }: DOMRect): EdgeBox => ({
        bottom,
        left,
        right,
        top,
      });
      const midline = ({ bottom, top }: DOMRect): number => (top + bottom) / 2;
      const range = document.createRange();
      range.selectNodeContents(heading);
      const lines = [...range.getClientRects()];
      const [firstLine] = lines;
      if (firstLine === undefined) throw new Error("The title has no text.");
      const computed = getComputedStyle(header);
      return {
        action: edges(action.getBoundingClientRect()),
        badge: edges(badge.getBoundingClientRect()),
        chevronMid: midline(chevron.getBoundingClientRect()),
        contentEnd:
          header.getBoundingClientRect().right -
          Number.parseFloat(computed.borderRightWidth) -
          Number.parseFloat(computed.paddingRight),
        glyphMid:
          glyph === null ? null : midline(glyph.getBoundingClientRect()),
        titleLines: new Set(lines.map((line) => Math.round(line.top))).size,
        titleMid: midline(firstLine),
        titleStart: firstLine.left,
      };
    });
}

test.describe("layout in a wide panel", () => {
  test.use({ viewport: { height: 812, width: 1024 } });

  test("keeps banner actions centered on the title and clear of the top border", async ({
    page,
  }, testInfo) => {
    await page.goto("/?states=1");
    await expectProjectPointer(page, testInfo);
    for (const title of BANNERS_WITH_ACTIONS) {
      const banner = page.locator(".snui-banner", {
        has: page.getByText(title, { exact: true }),
      });
      await expect(banner.locator(".snui-banner__actions")).toBeVisible();
      const floor = await cssLength(banner, "var(--snui-space-2)");
      const { inset, midlineOffset } = await firstActionPlacement(banner);
      // The inset keeps a focus ring on the action off the banner's border.
      expect(
        inset,
        `The first action of "${title}" sits closer than space-2 to the top border.`,
      ).toBeGreaterThanOrEqual(floor - 0.5);
      expect(
        midlineOffset,
        `The first action of "${title}" is not centered on the title.`,
      ).toBeLessThanOrEqual(1);
    }
  });

  test("centers a link action, shorter than a control, on the banner title", async ({
    page,
  }, testInfo) => {
    await page.goto("/geometry.html");
    await expectProjectPointer(page, testInfo);
    const banner = page.locator(".snui-banner", {
      has: page.getByRole("link", { name: "Open plugin settings" }),
    });
    const floor = await cssLength(banner, "var(--snui-space-2)");
    const { inset, midlineOffset } = await firstActionPlacement(banner);
    expect(
      midlineOffset,
      "The link action is not centered on the title.",
    ).toBeLessThanOrEqual(1);
    expect(
      inset,
      "The link action sits closer than space-2 to the top border.",
    ).toBeGreaterThanOrEqual(floor - 0.5);
  });

  test("centers a toned progress glyph on a one-line label", async ({
    page,
  }) => {
    await page.goto("/geometry.html");
    const { lines, offset } = await toneGlyphPlacement(
      page.locator(".snui-progress", {
        has: page.getByText("Tank", { exact: true }),
      }),
    );
    expect(lines).toBe(1);
    expect(
      offset,
      "The tone glyph is off the label's midline.",
    ).toBeLessThanOrEqual(1);
  });

  test("keeps a card with a long footnote to the prose measure in a start-aligned cluster", async ({
    page,
  }) => {
    await page.goto("/geometry.html");
    const card = page.locator(".snui-card", { hasText: "Oil pressure" });
    const measure = await cssLength(
      card.locator(".snui-card__footer-content"),
      "70ch",
    );
    const { contentWidth, footerWidth } = await card.evaluate((element) => {
      const footer = element.querySelector(".snui-card__footer");
      if (footer === null) throw new Error("The card has no footer.");
      const computed = getComputedStyle(element);
      const edges = [
        computed.borderLeftWidth,
        computed.borderRightWidth,
        computed.paddingLeft,
        computed.paddingRight,
      ].reduce((sum, width) => sum + Number.parseFloat(width), 0);
      return {
        contentWidth: element.getBoundingClientRect().width - edges,
        footerWidth: footer.getBoundingClientRect().width,
      };
    });
    // The footnote wraps at the measure rather than sizing the card, and the
    // footer's rule still spans the card.
    expect(
      contentWidth,
      "The footnote widens the card past the prose measure.",
    ).toBeLessThanOrEqual(measure + 0.5);
    expect(
      Math.abs(footerWidth - contentWidth),
      "The footer rule does not span the card.",
    ).toBeLessThanOrEqual(0.5);
  });

  test("centers a toned collapsible's glyph on a one-line title", async ({
    page,
  }) => {
    await page.goto("/geometry.html");
    const { glyphMid, titleLines, titleMid } = await collapsibleHeader(
      page,
      TONED_ONE_LINE_COLLAPSIBLE,
    );
    expect(titleLines).toBe(1);
    expect(
      Math.abs((glyphMid ?? Number.POSITIVE_INFINITY) - titleMid),
      "The tone glyph is off the title's midline.",
    ).toBeLessThanOrEqual(1);
  });
});

test.describe("layout in a phone-width panel", () => {
  test.use({ viewport: { height: 812, width: 375 } });

  test("keeps a narrow collapsible's action on the summary's row when it fits", async ({
    page,
  }, testInfo) => {
    await page.goto("/geometry.html");
    // The coarse pointer's wider gap and taller controls are the tight case,
    // and mobile-chromium grades it.
    await expectProjectPointer(page, testInfo);
    const { action, badge, contentEnd, titleStart } = await collapsibleHeader(
      page,
      PLAIN_COLLAPSIBLE,
    );
    expect(
      action.top,
      "The action drops below the summary badge.",
    ).toBeLessThan(badge.bottom);
    expect(
      Math.abs(action.right - contentEnd),
      "The action does not end at the header's content edge.",
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(badge.left - titleStart),
      "The summary badge does not start under the title text.",
    ).toBeLessThanOrEqual(1);
  });
});

test.describe("layout in a narrow panel", () => {
  test.use({ viewport: { height: 812, width: 320 } });

  test("stacks banner actions a row gap under the text at the base inset", async ({
    page,
  }) => {
    await page.goto("/?states=1");
    for (const title of BANNERS_WITH_ACTIONS) {
      const banner = page.locator(".snui-banner", {
        has: page.getByText(title, { exact: true }),
      });
      await expect(banner.locator(".snui-banner__actions")).toBeVisible();
      const base = await cssLength(banner, "var(--snui-space-3)");
      const { gap, paddingTop, rowGap } = await banner.evaluate((element) => {
        const actions = element.querySelector(".snui-banner__actions");
        const content = element.querySelector(".snui-banner__content");
        if (actions === null || content === null) {
          throw new Error("The banner has no actions or no content.");
        }
        const computed = getComputedStyle(element);
        return {
          gap:
            actions.getBoundingClientRect().top -
            content.getBoundingClientRect().bottom,
          paddingTop: Number.parseFloat(computed.paddingBlockStart),
          rowGap: Number.parseFloat(computed.rowGap),
        };
      });
      // Stacked, the actions keep their own line one row gap under the text,
      // so neither the lift nor the taller top padding of the wide layout
      // applies.
      expect(
        Math.abs(gap - rowGap),
        `The actions of "${title}" are lifted toward its text.`,
      ).toBeLessThanOrEqual(0.5);
      expect(paddingTop, `"${title}" keeps the wide top padding.`).toBe(base);
    }
  });

  test("keeps a stacked link action's row at the link's own height", async ({
    page,
  }) => {
    await page.goto("/geometry.html");
    const { linkHeight, rowHeight } = await page
      .locator(".snui-banner__actions", {
        has: page.getByRole("link", { name: "Open plugin settings" }),
      })
      .evaluate((row) => {
        const link = row.querySelector("a");
        if (link === null) throw new Error("The action row has no link.");
        return {
          linkHeight: link.getBoundingClientRect().height,
          rowHeight: row.getBoundingClientRect().height,
        };
      });
    // The control-height row is for centering beside the title. Stacked on a
    // line of its own, it would only add space under the link.
    expect(
      Math.abs(rowHeight - linkHeight),
      "The stacked action row is taller than its link.",
    ).toBeLessThanOrEqual(0.5);
  });

  test("keeps a toned progress glyph on a wrapped label's first line", async ({
    page,
  }) => {
    await page.goto("/geometry.html");
    const { lines, offset } = await toneGlyphPlacement(
      page.locator(".snui-progress", {
        has: page.getByText(/^Fresh water tank level/),
      }),
    );
    expect(lines, "The long label does not wrap.").toBeGreaterThan(1);
    expect(
      offset,
      "The tone glyph is off the midline of the label's first line.",
    ).toBeLessThanOrEqual(1);
  });

  test("keeps a wrapped collapsible's chevron on the first line and its action under the title text", async ({
    page,
  }, testInfo) => {
    await page.goto("/geometry.html");
    await expectProjectPointer(page, testInfo);
    const { action, badge, chevronMid, titleLines, titleMid, titleStart } =
      await collapsibleHeader(page, PLAIN_COLLAPSIBLE);
    expect(titleLines, "The title does not wrap.").toBeGreaterThan(1);
    expect(
      Math.abs(chevronMid - titleMid),
      "The chevron is off the midline of the title's first line.",
    ).toBeLessThanOrEqual(1);
    expect(
      action.top,
      "The action does not wrap below the summary badge.",
    ).toBeGreaterThanOrEqual(badge.bottom);
    // Wrapped, the action keeps the row's indent rather than falling back to
    // the header's edge.
    expect(
      Math.abs(badge.left - titleStart),
      "The summary badge does not start under the title text.",
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(action.left - titleStart),
      "The wrapped action does not start under the title text.",
    ).toBeLessThanOrEqual(1);
  });

  test("keeps a wrapped toned collapsible's glyph and chevron on the title's first line", async ({
    page,
  }, testInfo) => {
    await page.goto("/geometry.html");
    await expectProjectPointer(page, testInfo);
    const { chevronMid, glyphMid, titleLines, titleMid } =
      await collapsibleHeader(page, TONED_WRAPPING_COLLAPSIBLE);
    expect(titleLines, "The toned title does not wrap.").toBeGreaterThan(1);
    expect(
      Math.abs((glyphMid ?? Number.POSITIVE_INFINITY) - titleMid),
      "The tone glyph is off the midline of the title's first line.",
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(chevronMid - titleMid),
      "The chevron is off the midline of the title's first line.",
    ).toBeLessThanOrEqual(1);
  });

  test("starts a toned collapsible's summary row under the title text", async ({
    page,
  }, testInfo) => {
    await page.goto("/geometry.html");
    await expectProjectPointer(page, testInfo);
    const { action, badge, titleStart } = await collapsibleHeader(
      page,
      TONED_WRAPPING_COLLAPSIBLE,
    );
    // The row's indent covers the tone slot as well as the chevron, so the
    // badge and the action line up with the title text, not the glyph.
    expect(
      Math.abs(badge.left - titleStart),
      "The summary badge does not start under the toned title text.",
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(action.left - titleStart),
      "The action does not start under the toned title text.",
    ).toBeLessThanOrEqual(1);
  });
});
