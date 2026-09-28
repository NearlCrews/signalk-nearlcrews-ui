import { expect, test } from "./fixtures.js";

/*
 * WCAG 1.4.12: a reader's own stylesheet may raise line height to 1.5 times
 * the font size, paragraph spacing to twice it, letter spacing to 0.12 times
 * it, and word spacing to 0.16 times it, and no text may be lost. Dyslexic and
 * low vision readers use exactly these overrides, and a rule that holds a
 * label, an addon, or an option on one line is where the extra width goes
 * missing. The narrowest supported width is the hardest case.
 */

/** The four overrides, marked important the way a reader's stylesheet has to. */
const TEXT_SPACING_STYLESHEET = `
*, *::before, *::after {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p {
  margin-block-end: 2em !important;
}
`;

/** The 1.4.12 reflow width, where the room the overrides take is scarcest. */
const NARROW_VIEWPORT = { width: 320, height: 812 };

/**
 * The text the check reads: field labels and group legends, choice labels,
 * input group addons and the fixed slot beside them, segmented legends and
 * options, and banner titles and text.
 */
const SPACED_TEXT_SELECTORS = [
  ".snui-field__label",
  ".snui-field-group__legend",
  ".snui-checkbox__label",
  ".snui-input-group__addon",
  ".snui-input-group__control--fixed",
  ".snui-segmented__legend",
  ".snui-segmented__option",
  ".snui-banner__title",
  ".snui-banner__text",
  ".snui-banner__body",
] as const;

/** The pages the check reads, with the states that render the most text. */
const PAGES = [
  ["panel", "/?states=1"],
  ["showcase", "/showcase.html"],
] as const;

/** What the page reports once the overrides apply. */
interface SpacingReport {
  /** Selectors that matched at least one rendered element carrying text. */
  readonly checked: readonly string[];
  /** One sentence per element whose text no longer fits where it is drawn. */
  readonly clipped: readonly string[];
  readonly pageClientWidth: number;
  readonly pageScrollWidth: number;
}

/**
 * Runs in the browser, so everything it uses is declared inside it. An element
 * loses text when its content is wider or taller than its own box, which
 * either hides the difference or spills it over its neighbors, or when an
 * ancestor that clips its overflow cuts it off. Elements inside a visually
 * hidden container are hidden on purpose and skipped.
 */
function readSpacingReport(selectors: readonly string[]): SpacingReport {
  const tolerance = 1;
  const clipped: string[] = [];
  const checked = new Set<string>();

  const intentionallyHidden = (element: Element): boolean => {
    for (
      let node: Element | null = element;
      node !== null;
      node = node.parentElement
    ) {
      if (getComputedStyle(node).clipPath !== "none") return true;
    }
    return false;
  };
  const clippingAncestor = (element: Element): Element | null => {
    const box = element.getBoundingClientRect();
    for (
      let node = element.parentElement;
      node !== null && node !== document.documentElement;
      node = node.parentElement
    ) {
      const style = getComputedStyle(node);
      const clipsInline = /hidden|clip/.test(style.overflowX);
      const clipsBlock = /hidden|clip/.test(style.overflowY);
      if (!clipsInline && !clipsBlock) continue;
      const bounds = node.getBoundingClientRect();
      if (
        (clipsInline &&
          (box.left < bounds.left - tolerance ||
            box.right > bounds.right + tolerance)) ||
        (clipsBlock &&
          (box.top < bounds.top - tolerance ||
            box.bottom > bounds.bottom + tolerance))
      ) {
        return node;
      }
    }
    return null;
  };

  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const text = element.textContent.replace(/\s+/g, " ").trim();
      if (text === "" || element.getClientRects().length === 0) continue;
      if (intentionallyHidden(element)) continue;
      checked.add(selector);

      const wider = element.scrollWidth - element.clientWidth;
      const taller = element.scrollHeight - element.clientHeight;
      if (wider > tolerance) {
        clipped.push(
          `${selector} "${text}" is ${String(wider)}px wider than its box`,
        );
      }
      if (taller > tolerance) {
        clipped.push(
          `${selector} "${text}" is ${String(taller)}px taller than its box`,
        );
      }
      const ancestor = clippingAncestor(element);
      if (ancestor !== null) {
        clipped.push(
          `${selector} "${text}" is cut off by ${ancestor.localName}.${[...ancestor.classList].join(".")}`,
        );
      }
    }
  }

  return {
    checked: [...checked],
    clipped,
    pageClientWidth: document.documentElement.clientWidth,
    pageScrollWidth: document.documentElement.scrollWidth,
  };
}

for (const [pageName, path] of PAGES) {
  test(`keeps every ${pageName} label, addon, option, and banner whole under text spacing overrides`, async ({
    page,
  }) => {
    await page.setViewportSize(NARROW_VIEWPORT);
    await page.goto(path);
    await expect(page.locator("[data-snui-version]").first()).toBeVisible();
    await page.addStyleTag({ content: TEXT_SPACING_STYLESHEET });

    // Layout settles over a frame or two once the spacing applies, and the
    // container queries re-evaluate against the wider text.
    await expect
      .poll(() => page.evaluate(readSpacingReport, SPACED_TEXT_SELECTORS))
      .toMatchObject({ clipped: [] });
    const report = await page.evaluate(
      readSpacingReport,
      SPACED_TEXT_SELECTORS,
    );
    expect(
      report.pageScrollWidth,
      "the page scrolls sideways under the overrides",
    ).toBeLessThanOrEqual(report.pageClientWidth);
    expect(
      report.checked.length,
      "the page renders none of the text under test",
    ).toBeGreaterThan(0);
  });
}

test("checks every kind of text the criterion names across the two pages", async ({
  page,
}) => {
  // A selector that stops matching, after a class rename, would leave its
  // text unchecked while the per-page tests still passed.
  await page.setViewportSize(NARROW_VIEWPORT);
  const checked = new Set<string>();
  for (const [, path] of PAGES) {
    await page.goto(path);
    await expect(page.locator("[data-snui-version]").first()).toBeVisible();
    const report = await page.evaluate(
      readSpacingReport,
      SPACED_TEXT_SELECTORS,
    );
    for (const selector of report.checked) checked.add(selector);
  }
  expect([...checked].sort()).toEqual([...SPACED_TEXT_SELECTORS].sort());
});

test("reports text a box or a clipping ancestor cuts off", async ({ page }) => {
  // The check has to fail on the arrangement it exists to catch: a one-line
  // addon narrower than its words, and a title inside a clipping box.
  await page.setViewportSize(NARROW_VIEWPORT);
  await page.goto("/?states=1");
  await expect(page.locator("[data-snui-version]").first()).toBeVisible();
  await page.locator(".snui-root__content").evaluate((content) => {
    const addon = document.createElement("span");
    addon.className = "snui-input-group__addon";
    Object.assign(addon.style, {
      display: "block",
      overflow: "hidden",
      whiteSpace: "nowrap",
      width: "3rem",
    });
    addon.textContent = "Nautical miles per hour";
    const clip = document.createElement("div");
    Object.assign(clip.style, { overflow: "hidden", width: "2rem" });
    const title = document.createElement("span");
    title.className = "snui-banner__title";
    Object.assign(title.style, { display: "block", width: "10rem" });
    title.textContent = "Clipped title";
    clip.append(title);
    content.append(addon, clip);
  });

  const report = await page.evaluate(readSpacingReport, SPACED_TEXT_SELECTORS);
  expect(report.clipped).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\.snui-input-group__addon "Nautical miles per hour" is \d+px wider than its box$/,
      ),
      '.snui-banner__title "Clipped title" is cut off by div.',
    ]),
  );
});
