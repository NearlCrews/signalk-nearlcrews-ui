import { expect, type Locator, systemColors, test } from "./fixtures.js";

/** One computed style value of the first element the locator matches. */
function styleOf(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

test("keeps a button at its own type size inside a small-text card footer", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/showcase.html");

  const footerButton = page.getByRole("button", { name: "Open plan" });
  const rowButton = page.getByRole("button", { name: "Secondary" });
  expect(await styleOf(footerButton, "font-size")).toBe(
    await styleOf(rowButton, "font-size"),
  );
});

test("draws a button rendered as an anchor as the variant it names", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/showcase.html");

  const anchor = page.getByRole("link", { name: "Anchor form" });
  const ghost = page.getByRole("button", { name: "Ghost" });
  const ghostColor = await styleOf(ghost, "color");
  await expect(anchor).toHaveCSS("text-decoration-line", "none");
  await expect(anchor).toHaveCSS("color", ghostColor);
  // The link hover color does not reach it either.
  await anchor.hover();
  await expect(anchor).toHaveCSS("color", ghostColor);
  await expect(anchor).toHaveCSS("text-decoration-line", "none");
});

test("dims a disabled checkbox's label with the disabled text color", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");

  const labelOf = (name: string): Locator =>
    page
      .getByRole("checkbox", { name })
      .locator("xpath=..")
      .locator(".snui-checkbox__label");
  const disabledText = await styleOf(
    page.getByRole("button", { name: "Disabled" }),
    "color",
  );
  await expect(labelOf("Unavailable option")).toHaveCSS("color", disabledText);
  expect(await styleOf(labelOf("Optional diagnostics"), "color")).not.toBe(
    disabledText,
  );

  // The markers set their own colors, and they dim with the label rather
  // than reading stronger than the text they annotate.
  await labelOf("Unavailable option").evaluate((element) => {
    for (const className of ["snui-optional-mark", "snui-required-mark"]) {
      const marker = element.ownerDocument.createElement("span");
      marker.className = className;
      marker.textContent =
        className === "snui-required-mark" ? "*" : "Optional";
      element.append(marker);
    }
  });
  for (const marker of [".snui-optional-mark", ".snui-required-mark"]) {
    await expect(labelOf("Unavailable option").locator(marker)).toHaveCSS(
      "color",
      disabledText,
    );
  }
});

test("paints blocked buttons and a disabled checkbox label GrayText under forced colors", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const colors = await systemColors(page, [
    "ButtonText",
    "GrayText",
    "LinkText",
  ]);

  // The aria-disabled button matches the native disabled one rather than
  // painting the theme's disabled token.
  for (const name of ["Disabled", "Unavailable here"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toHaveCSS("color", colors.GrayText);
    await expect(button).toHaveCSS("border-top-color", colors.GrayText);
  }
  // A busy button keeps its variant, as every theme does.
  await expect(page.getByRole("button", { name: "Saving" })).toHaveCSS(
    "color",
    colors.ButtonText,
  );
  const label = page
    .getByRole("checkbox", { name: "Unavailable option" })
    .locator("xpath=..")
    .locator(".snui-checkbox__label");
  await expect(label).toHaveCSS("color", colors.GrayText);

  // A marker inside the label takes the system color too, rather than its
  // theme color, while a link, which the disabled box does not disable,
  // keeps the system link color. Both are added to the rendered label here,
  // which is all the rules need to reach them.
  await label.evaluate((element) => {
    const marker = element.ownerDocument.createElement("span");
    marker.className = "snui-optional-mark";
    marker.textContent = "Optional";
    const link = element.ownerDocument.createElement("a");
    link.href = "https://signalk.org/";
    link.textContent = "terms";
    element.append(marker, link);
  });
  await expect(label.locator(".snui-optional-mark")).toHaveCSS(
    "color",
    colors.GrayText,
  );
  await expect(label.locator("a")).toHaveCSS("color", colors.LinkText);

  // A blocked danger button dims its dashed outline with its text.
  const unavailable = page.getByRole("button", { name: "Unavailable here" });
  await unavailable.evaluate((element) => {
    element.classList.replace("snui-button--secondary", "snui-button--danger");
  });
  await expect(unavailable).toHaveCSS("outline-style", "dashed");
  await expect(unavailable).toHaveCSS("outline-color", colors.GrayText);
});

test("keeps a focused danger button's ring under forced colors while the pointer rests on it", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/showcase.html");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const colors = await systemColors(page, ["ButtonText", "CanvasText"]);

  const danger = page.getByRole("button", { name: "Danger", exact: true });
  // Resting, the dashed outline is the danger cue.
  await expect(danger).toHaveCSS("outline-style", "dashed");
  await expect(danger).toHaveCSS("outline-color", colors.ButtonText);

  await page.keyboard.press("Tab");
  await danger.focus();
  await expect(danger).toHaveCSS("outline-style", "solid");
  // The hover restatement keeps system colors; it must not bring the
  // dashed outline back over the focus ring.
  await danger.hover();
  await expect(danger).toHaveCSS("outline-style", "solid");
  await expect(danger).toHaveCSS("outline-color", colors.CanvasText);
});

test("shows the focus ring on a keyboard-focused invalid field under forced colors", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/?states=1");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });

  for (const field of [
    page.getByRole("textbox", { name: "Invalid server URL" }),
    page.getByRole("slider", { name: "Invalid confidence threshold" }),
    page.getByRole("checkbox", { name: "Missing agreement" }),
  ]) {
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    // At rest the dashed outline carries the invalid state.
    await expect(field).toHaveCSS("outline-style", "dashed");
    // A keystroke puts the page in keyboard modality, so the focus that
    // follows is visible focus.
    await page.keyboard.press("Shift");
    await field.focus();
    await expect(field).toHaveCSS("outline-style", "solid");
    await expect(field).toHaveCSS("outline-width", "2px");
  }
});
