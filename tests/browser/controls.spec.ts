import { expect, type Page, test } from "./fixtures.js";

/** Computed values of two system colors, read from a probe element. */
async function systemColors(
  page: Page,
): Promise<{ buttonFace: string; buttonText: string }> {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    document.body.append(probe);
    probe.style.color = "ButtonText";
    const buttonText = getComputedStyle(probe).color;
    probe.style.color = "ButtonFace";
    const buttonFace = getComputedStyle(probe).color;
    probe.remove();
    return { buttonFace, buttonText };
  });
}

test("paints the inline confirmation's Cancel button in system colors under forced colors", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "reduce",
  });

  const confirmation = page.getByRole("region", {
    name: "Reset configuration?",
  });
  await expect(confirmation).toBeVisible();
  // The confirmation itself opts out of forced-color adjustment; its Cancel
  // button must not inherit that opt-out with the author theme.
  await expect(confirmation).toHaveCSS("forced-color-adjust", "none");

  const cancel = confirmation.getByRole("button", { name: "Cancel" });
  const colors = await systemColors(page);
  await expect(cancel).toHaveCSS("forced-color-adjust", "none");
  await expect(cancel).toHaveCSS("background-color", colors.buttonFace);
  await expect(cancel).toHaveCSS("color", colors.buttonText);
  await expect(cancel).toHaveCSS("border-top-color", colors.buttonText);

  // The confirmation focuses its own container on open; one Tab reaches
  // Cancel through the keyboard, so :focus-visible applies as it would for a
  // keyboard user rather than after a pointer press.
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await expect(cancel).toHaveCSS("outline-style", "solid");
  await expect(cancel).toHaveCSS("outline-width", "2px");
});

test("renders text controls at 16 pixels or more on a coarse pointer", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");

  for (const control of [
    page.getByRole("textbox", { name: "Server URL" }),
    page.getByRole("spinbutton", { name: "Refresh interval" }),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("textbox", { name: "Operator notes" }),
  ]) {
    await expect(control).toBeVisible();
    const fontSize = await control.evaluate(
      (element) => getComputedStyle(element).fontSize,
    );
    expect(
      Number.parseFloat(fontSize),
      `${await control.evaluate((element) => element.tagName)} renders below the iOS zoom threshold`,
    ).toBeGreaterThanOrEqual(16);
  }
});

test("keeps text controls at the panel type size on a fine pointer", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Server URL" });
  const fontSize = await input.evaluate(
    (element) => getComputedStyle(element).fontSize,
  );
  // 0.9375rem at the 16px root: the coarse-pointer rule must not leak here.
  expect(Number.parseFloat(fontSize)).toBeCloseTo(15, 0);
});
