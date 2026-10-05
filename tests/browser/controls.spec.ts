import {
  emulateForcedColors,
  expect,
  expectSolidOutline,
  MOBILE_PROJECT,
  resetConfirmation,
  skipOutsideChromium,
  styleOf,
  systemColors,
  test,
} from "./fixtures.js";

/**
 * The text controls each fixture page renders, by role and accessible name.
 * One rule sizes them all, so both pages are read against it.
 */
const TEXT_CONTROLS = [
  {
    path: "/",
    controls: [
      ["textbox", "Server URL"],
      ["spinbutton", "Refresh interval"],
      ["combobox", "Provider mode"],
      ["textbox", "Operator notes"],
    ],
  },
  {
    path: "/showcase.html",
    controls: [
      ["textbox", "Server URL"],
      ["combobox", "Provider mode"],
      ["textbox", "Operator notes"],
    ],
  },
] as const;

test("paints the inline confirmation's Cancel button in system colors under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/?states=1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await emulateForcedColors(page);

  const confirmation = resetConfirmation(page);
  await expect(confirmation).toBeVisible();
  // The confirmation itself opts out of forced-color adjustment; its Cancel
  // button must not inherit that opt-out with the author theme.
  await expect(confirmation).toHaveCSS("forced-color-adjust", "none");

  const cancel = confirmation.getByRole("button", { name: "Cancel" });
  const colors = await systemColors(page, ["ButtonFace", "ButtonText"]);
  await expect(cancel).toHaveCSS("forced-color-adjust", "none");
  await expect(cancel).toHaveCSS("background-color", colors.ButtonFace);
  await expect(cancel).toHaveCSS("color", colors.ButtonText);
  await expect(cancel).toHaveCSS("border-top-color", colors.ButtonText);

  // The confirmation focuses its own container on open; one Tab reaches
  // Cancel through the keyboard, so :focus-visible applies as it would for a
  // keyboard user rather than after a pointer press.
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  await expectSolidOutline(cancel);
});

test("renders text controls at 16 pixels or more on a coarse pointer", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== MOBILE_PROJECT,
    "The 16 pixel floor targets iOS Safari focus zoom, driven by the coarse-pointer query.",
  );

  for (const { controls, path } of TEXT_CONTROLS) {
    await page.goto(path);
    for (const [role, name] of controls) {
      const control = page.getByRole(role, { name });
      await expect(control).toBeVisible();
      expect(
        Number.parseFloat(await styleOf(control, "font-size")),
        `The ${role} "${name}" on ${path} renders below the iOS zoom threshold.`,
      ).toBeGreaterThanOrEqual(16);
    }
  }
});

test("keeps text controls at the panel type size on a fine pointer", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Server URL" });
  // 0.9375rem at the 16px root: the coarse-pointer rule must not leak here.
  expect(Number.parseFloat(await styleOf(input, "font-size"))).toBeCloseTo(
    15,
    0,
  );
});
