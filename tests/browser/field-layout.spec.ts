import {
  controlTargetFloor,
  expect,
  expectProjectPointer,
  type Locator,
  MOBILE_PROJECT,
  test,
} from "./fixtures.js";

/** A box that is there, or a failure naming what was not laid out. */
async function boxOf(
  locator: Locator,
): Promise<{ height: number; width: number; x: number; y: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error(`${String(locator)} has no layout box.`);
  return box;
}

const FIELD_GROUPS = ["Provider behavior", "Data sources"] as const;

test("names each field group by its legend", async ({ page }) => {
  await page.goto("/");
  // The first legend child names the fieldset whether or not it floats, in
  // every engine.
  for (const name of FIELD_GROUPS) {
    const group = page.getByRole("group", { name });
    await expect(group).toBeVisible();
    await expect(group.locator(":scope > legend")).toHaveText(name);
  }
});

test("keeps a field group legend inside its border and in the actions row on a wide panel", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit",
    "WebKit computes float to none on every grid item, so the legend stays the rendered legend in the fieldset border, the 0.12.0 rendering.",
  );
  await page.goto("/");
  // A narrow panel moves the actions under the description on purpose.
  const narrow = testInfo.project.name === MOBILE_PROJECT;

  for (const name of FIELD_GROUPS) {
    const group = page.getByRole("group", { name });
    const legend = group.locator(":scope > legend");
    const actions = group.locator(":scope > .snui-field-group__actions");
    // The float is what takes the legend out of the border; where it lands
    // is the grid's placement.
    await expect(legend).toHaveCSS("float", "inline-start");

    const [groupBox, legendBox, actionsBox] = await Promise.all([
      boxOf(group),
      boxOf(legend),
      boxOf(actions),
    ]);
    const borderTop = await group.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopWidth),
    );
    // Inside the border box, rather than in a notch the top border runs
    // into.
    expect(legendBox.y, name).toBeGreaterThanOrEqual(groupBox.y + borderTop);

    const sharesRow =
      legendBox.y < actionsBox.y + actionsBox.height &&
      actionsBox.y < legendBox.y + legendBox.height;
    expect(sharesRow, name).toBe(!narrow);
    if (narrow) {
      expect(actionsBox.y, name).toBeGreaterThan(legendBox.y);
    }
  }
});

test("stands text controls level with the buttons beside them", async ({
  page,
}, testInfo) => {
  const floor = controlTargetFloor(testInfo);

  await page.goto("/");
  await expectProjectPointer(page, testInfo);
  for (const control of [
    page.getByRole("textbox", { name: /Server URL/ }),
    page.getByRole("combobox", { name: "Provider mode" }),
    page.getByRole("button", { name: "Save" }),
  ]) {
    expect((await boxOf(control)).height, String(control)).toBe(floor);
  }

  // The pair a row puts side by side: a secret and its reveal action.
  await page.goto("/showcase.html");
  await expectProjectPointer(page, testInfo);
  const secret = page.getByLabel("API key", { exact: true });
  const reveal = page.getByRole("button", { name: "Show" });
  const [secretBox, revealBox] = await Promise.all([
    boxOf(secret),
    boxOf(reveal),
  ]);
  expect(secretBox.height).toBe(floor);
  expect(revealBox.height).toBe(floor);
  expect(
    Math.abs(
      secretBox.y + secretBox.height / 2 - (revealBox.y + revealBox.height / 2),
    ),
  ).toBeLessThan(1);
});

test("sets a field error's glyph apart from its message and hangs wrapped lines past it", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  // Narrow enough that the longer messages wrap.
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/?states=1");

  for (const message of [
    "Enter an HTTP or HTTPS URL.",
    "Choose a supported confidence threshold.",
    "Accept the provider agreement.",
  ]) {
    const text = page.getByText(message, { exact: true });
    const row = text.locator("xpath=..");
    const glyph = row.locator(".snui-tone-glyph");
    // One rectangle per line of the message's text, which the message box
    // itself, a flex item, would report as one.
    const [glyphBox, lines] = await Promise.all([
      boxOf(glyph),
      text.evaluate((element) => {
        const range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].map((rect) => rect.left);
      }),
    ]);
    // A visible gap after the glyph, the one other glyphs take.
    expect(lines[0] ?? 0, message).toBeGreaterThanOrEqual(
      glyphBox.x + glyphBox.width + 3,
    );
    // Every wrapped line starts where the first one does, past the glyph.
    for (const left of lines) {
      expect(left, message).toBeCloseTo(lines[0] ?? 0, 0);
    }
  }
  // The check above has to have met a wrapped message to prove the hang.
  const wrapped = await page
    .getByText("Choose a supported confidence threshold.", { exact: true })
    .evaluate((element) => {
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      const tops = new Set(
        [...range.getClientRects()].map((rect) => Math.round(rect.top)),
      );
      return tops.size;
    });
  expect(wrapped).toBeGreaterThan(1);
});

test("centers an inline field's label on its control when it has no description", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/showcase.html");

  const field = page
    .locator(".snui-field--inline")
    .filter({ has: page.getByText("Crew size", { exact: true }) });
  const [label, control] = await Promise.all([
    boxOf(field.locator(":scope > .snui-field__label")),
    boxOf(field.locator(":scope > .snui-field__control")),
  ]);
  expect(
    Math.abs(label.y + label.height / 2 - (control.y + control.height / 2)),
  ).toBeLessThan(1.5);
});

test("draws the optional marker at the regular weight, apart from its label", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/showcase.html");

  const label = page
    .locator(".snui-field__label")
    .filter({ hasText: "Call sign" });
  await expect(label.locator(".snui-optional-mark")).toHaveCSS(
    "font-weight",
    "400",
  );
  await expect(label).toHaveCSS("font-weight", "600");
});
