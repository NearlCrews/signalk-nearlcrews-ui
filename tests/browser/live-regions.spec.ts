import { SAVE_ACTION_BAR_LABEL_DEFAULTS } from "../../src/utils/panel-label-defaults.js";
import { expect, type Page, test } from "./fixtures.js";
import { expectExposedLiveText, liveTextExposure } from "./live-regions.js";

/*
 * Announcement specs in the unit suite prove which words a region holds. These
 * prove the region holding them is one assistive technology can still reach
 * at that moment, which is where a modal overlay, hiding the rest of the page
 * behind `inert` and `aria-hidden`, silences a region without changing its
 * text.
 */

/** Speaks through the panel announcer the fixture hands to the page. */
function announce(
  page: Page,
  message: string,
  assertive = false,
): Promise<void> {
  return page.evaluate(
    ([words, interrupt]) => {
      const fixture = window.snuiLiveRegions;
      if (fixture === undefined) throw new Error("The fixture is not mounted.");
      fixture.announce(words, { assertive: interrupt });
    },
    [message, assertive] as const,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/live-regions.html");
  await expect(page.getByRole("button", { name: "Open dialog" })).toBeVisible();
});

test("keeps the panel announcer exposed while a dialog is open", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Anchor watch" });
  await expect(dialog).toBeVisible();

  await dialog
    .getByRole("button", { name: "Announce from the dialog" })
    .click();
  await expectExposedLiveText(page, "Anchor watch armed");
  await dialog
    .getByRole("button", { name: "Interrupt from the dialog" })
    .click();
  await expectExposedLiveText(page, "Anchor drag detected");
});

test("keeps the panel announcer exposed while a menu is open", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Panel actions" }).click();
  await expect(page.getByRole("menu")).toBeVisible();

  await announce(page, "Chart tiles refreshed");
  await expectExposedLiveText(page, "Chart tiles refreshed");
  await expect(page.getByRole("menu")).toBeVisible();
});

test("keeps the panel announcer exposed while a popover is open", async ({
  page,
}) => {
  await page.getByRole("button", { name: "About the watch" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await announce(page, "Watch radius changed", true);
  await expectExposedLiveText(page, "Watch radius changed");
});

test("speaks a failure toast raised under a dialog", async ({ page }) => {
  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Anchor watch" });
  await dialog.getByRole("button", { name: "Raise a failure toast" }).click();

  await expectExposedLiveText(page, "Depth alarm");
  await expect(dialog).toBeVisible();
});

test("speaks the save bar status after Save", async ({ page }) => {
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expectExposedLiveText(page, SAVE_ACTION_BAR_LABEL_DEFAULTS.saved);
});

test("speaks an announcing banner", async ({ page }) => {
  await page.getByRole("button", { name: "Show the notice" }).click();

  await expectExposedLiveText(page, "Wind rising");
});

test("reports a region a modal hides, naming what hides it", async ({
  page,
}) => {
  // The helper has to fail on the arrangement it exists to catch, so a region
  // is added outside the dialog without the exemption the package's own
  // regions carry, and the page's verdict on it is read.
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Anchor watch" }),
  ).toBeVisible();
  await page.locator(".snui-root__content").evaluate((content) => {
    const region = document.createElement("div");
    region.setAttribute("role", "status");
    region.textContent = "Unexempted words";
    content.append(region);
  });

  await expect
    .poll(() => liveTextExposure(page, "Unexempted words"))
    .toMatch(
      /^every live region carrying "Unexempted words" is hidden \(div: .+ is (inert|aria-hidden)\)$/,
    );
  expect(await liveTextExposure(page, "Never spoken")).toBe(
    'no live region carries "Never spoken"',
  );
});
