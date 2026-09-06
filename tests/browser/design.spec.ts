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
