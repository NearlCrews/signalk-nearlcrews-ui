import { CONTAINER_BREAKPOINT_NARROW } from "../../src/styles/tokens.js";
import { expect, type Locator, type Page, test } from "./fixtures.js";

/*
 * Rendered checks for the design tokens: the unit suite proves the declared
 * pairs, this file proves what the browser paints from them.
 */

type ThemeName = "Light" | "Dark" | "Night";

async function selectTheme(page: Page, theme: ThemeName): Promise<void> {
  await page.getByRole("radio", { name: theme }).click();
  await expect(page.locator("[data-snui-version]")).toHaveAttribute(
    "data-snui-theme",
    theme.toLowerCase(),
  );
}

function backgroundOf(locator: Locator): Promise<string> {
  return locator.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
}

/**
 * The color a token resolves to inside the panel, read from a probe so the
 * comparison is against the theme in force rather than a hard-coded value.
 */
function tokenColor(anchor: Locator, token: string): Promise<string> {
  return anchor.evaluate((element, name) => {
    const probe = document.createElement("span");
    probe.style.background = `var(${name})`;
    element.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, token);
}

/** Computed values of the system colors the forced-colors rules name. */
function systemColors(
  page: Page,
): Promise<{ canvasText: string; highlight: string }> {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    // Opting the probe out keeps it reporting the system color itself rather
    // than the substitute the engine paints over an author color.
    probe.style.forcedColorAdjust = "none";
    document.body.append(probe);
    probe.style.color = "CanvasText";
    const canvasText = getComputedStyle(probe).color;
    probe.style.color = "Highlight";
    const highlight = getComputedStyle(probe).color;
    probe.remove();
    return { canvasText, highlight };
  });
}

/** Resolves a computed border radius (px or %) against the element's width. */
async function radiusRatio(dot: Locator): Promise<number> {
  return dot.evaluate((element) => {
    const { borderRadius, width } = getComputedStyle(element);
    const [horizontal = "0"] = borderRadius.split(" ");
    const px = horizontal.endsWith("%")
      ? (Number.parseFloat(horizontal) / 100) * Number.parseFloat(width)
      : Number.parseFloat(horizontal);
    return px / Number.parseFloat(width);
  });
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
    testInfo.project.name !== "mobile-chromium",
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

  const colors = await systemColors(page);
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
  expect(selected.color).toBe(colors.highlight);
  // A highlight the engine paints nowhere is not a selection mark.
  expect(selected.width).toBeGreaterThan(0);
  expect(unselectedBorder).not.toBe(colors.highlight);

  // Arrow keys move the tab stop, so the ring is measured after a real
  // keyboard interaction rather than a programmatic focus.
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  const sources = list.getByRole("tab", { name: "Sources" });
  await expect(sources).toBeFocused();
  await expect(sources).toHaveCSS("outline-style", "solid");
  await expect(sources).toHaveCSS("outline-width", "2px");
  await expect(sources).toHaveCSS("outline-color", colors.canvasText);
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
  expect(styles.mark["background-color"]).toBe("rgba(0, 0, 0, 0)");
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
  const [padding, gutter] = await content.evaluate((element, breakpoint) => {
    const computed = getComputedStyle(element);
    const probe = document.createElement("span");
    element.append(probe);
    // The narrow container step pads with space-3; wider panels use space-4.
    probe.style.width = breakpoint;
    const narrowBelow = Number.parseFloat(getComputedStyle(probe).width);
    const root = element.closest(".snui-root") ?? element;
    probe.style.width =
      root.getBoundingClientRect().width <= narrowBelow
        ? "var(--snui-space-3)"
        : "var(--snui-space-4)";
    const token = Number.parseFloat(getComputedStyle(probe).width);
    probe.remove();
    return [
      [
        Number.parseFloat(computed.paddingLeft),
        Number.parseFloat(computed.paddingRight),
      ],
      token,
    ];
  }, CONTAINER_BREAKPOINT_NARROW);
  // With no inset reported, max() resolves to the spacing token in force.
  expect(padding).toEqual([gutter, gutter]);
});
