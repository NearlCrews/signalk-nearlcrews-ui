import {
  expect,
  expectNoAxeViolations,
  movePointerOffPanel,
  selectFleetRow,
  selectTheme,
  settleAnimations,
  skipOutsideChromium,
  THEMES,
  test,
} from "./fixtures.js";

/*
 * The panel page runs axe in every theme, but it renders a fraction of the
 * components. The showcase renders the rest (the grid, tables, tabs, choice
 * controls, progress, empty state, disclosures, and every overlay), and each
 * overlay module remaps tokens its own way, so only a rendered audit in each
 * theme grades what the operator reads. Night matters most: it is the helm
 * theme, and its text contrast is capped by design. The showcase baselines
 * take the pixels in the same three themes; this file grades them.
 *
 * Chromium only, like the screenshots: the audit grades token pairs, which
 * every engine resolves the same way, and one engine keeps the run short.
 */

/** Why the audits run in one engine. */
const GRADED_IN_CHROMIUM = "Graded in Chromium only.";

for (const theme of THEMES) {
  test(`grades the showcase with axe in ${theme}`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo, GRADED_IN_CHROMIUM);
    // A full-page audit of the showcase is slow on a loaded runner.
    test.slow();
    await page.goto("/showcase.html");
    await selectTheme(page, theme);
    await selectFleetRow(page);
    // The click leaves the pointer on the row, and its hover fill would stand
    // in for the plain selected fill under the audit.
    await movePointerOffPanel(page);
    // The theme change transitions colors, and an audit mid-transition grades
    // blended colors the tokens never set.
    await settleAnimations(page);

    await expectNoAxeViolations(page);
  });
}

test("grades an open dialog and a danger toast with axe in Night", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo, GRADED_IN_CHROMIUM);
  test.slow();
  await page.goto("/showcase.html");
  await selectTheme(page, "Night");
  await page.getByRole("button", { name: "danger toast" }).click();
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Anchorage details" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Notifications" })
      .locator(".snui-toast")
      .filter({ hasText: "danger toast" }),
  ).toBeVisible();
  // The scrim, the dialog, and the toast all fade in.
  await settleAnimations(page);

  await expectNoAxeViolations(page);
});
