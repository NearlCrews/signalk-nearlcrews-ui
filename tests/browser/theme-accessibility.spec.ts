import {
  expect,
  expectNoAxeViolations,
  movePointerOffPanel,
  selectTheme,
  settleAnimations,
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

const THEMES = ["Light", "Dark", "Night"] as const;

for (const theme of THEMES) {
  test(`grades the showcase with axe in ${theme}`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Graded in Chromium only.");
    // A full-page audit of the showcase is slow on a loaded runner.
    test.slow();
    await page.goto("/showcase.html");
    await selectTheme(page, theme);
    // A selected grid row puts the selected fill, a row state nothing else on
    // the page shows, under the audit.
    const selectedRow = page
      .getByRole("grid", { name: "Fleet" })
      .getByRole("row")
      .filter({ hasText: "Vessel 002" })
      .first();
    await selectedRow.click();
    await expect(selectedRow).toHaveAttribute("aria-selected", "true");
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
  test.skip(testInfo.project.name !== "chromium", "Graded in Chromium only.");
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
