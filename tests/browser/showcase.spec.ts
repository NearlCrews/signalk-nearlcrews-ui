import {
  expect,
  expectNoAxeViolations,
  settleAnimations,
  test,
} from "./fixtures.js";

/** Bootstrap's fixed header z-index in the Signal K Admin, mirrored by the fixture. */
const HOST_HEADER_Z_INDEX = 1020;

test("renders the showcase without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error: Error) => {
    errors.push(error.message);
  });

  await page.goto("/showcase.html");
  await expect(
    page.getByRole("heading", { name: "Component showcase" }),
  ).toBeVisible();
  await expect(page.getByRole("grid", { name: "Fleet" })).toBeVisible();
  await expect(page.getByRole("grid", { name: "Fleet" })).toHaveAttribute(
    "aria-rowcount",
    "241",
  );
  const renderedRows = await page
    .getByRole("grid", { name: "Fleet" })
    .getByRole("row")
    .count();
  expect(renderedRows).toBeGreaterThan(1);
  expect(renderedRows).toBeLessThan(241);
  expect(errors).toEqual([]);
});

test("keeps a nested popover above its dialog", async ({ page }) => {
  await page.goto("/showcase.html");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.getByRole("button", { name: "Show approach note" }).click();

  const scrim = page.locator(".snui-scrim");
  const popover = page.getByRole("dialog", { name: "Show approach note" });
  const [dialogZIndex, popoverZIndex] = await Promise.all([
    scrim.evaluate((element) => Number(getComputedStyle(element).zIndex)),
    popover.evaluate((element) => Number(getComputedStyle(element).zIndex)),
  ]);

  expect(popoverZIndex).toBeGreaterThan(dialogZIndex);
  await expect(popover).toBeVisible();
});

test("keeps tall popover content scrollable inside the visual viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/showcase.html");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.getByRole("button", { name: "Show approach note" }).click();

  const popover = page.getByRole("dialog", { name: "Show approach note" });
  await popover.evaluate((element) => {
    const spacer = document.createElement("div");
    spacer.style.height = "900px";
    spacer.setAttribute("aria-hidden", "true");
    const finalAction = document.createElement("button");
    finalAction.type = "button";
    finalAction.textContent = "Final popover action";
    element.append(spacer, finalAction);
  });

  await expect(popover).toHaveCSS("overflow-y", "auto");
  const dimensions = await popover.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await popover.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    popover.getByRole("button", { name: "Final popover action" }),
  ).toBeVisible();
  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(568);
  }
});

test("scrolls a wide table inside its region while the panel stays put", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/showcase.html");

  const region = page.getByRole("region", {
    name: "Signal K paths, scrollable",
  });
  await expect(region).toBeVisible();
  await expect(region).toHaveCSS("overflow-x", "auto");

  const overflow = await region.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(
    overflow.scrollWidth,
    "the fixture table is not wider than its region, so nothing is under test",
  ).toBeGreaterThan(overflow.clientWidth);

  // The point of the region: the table overflows it, and the panel around it
  // does not gain a sideways scroll of its own.
  const pageSizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageSizes.scrollWidth).toBeLessThanOrEqual(pageSizes.clientWidth);

  // The overflow is reachable by keyboard because the region takes focus and
  // the arrow keys scroll it both ways.
  await region.focus();
  await expect(region).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(1);
  const scrolledRight = await region.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("ArrowLeft");
  // Back by a step rather than to exactly zero: the step is the engine's own,
  // so a press that had already reached the end does not return in one.
  await expect
    .poll(() => region.evaluate((element) => element.scrollLeft))
    .toBeLessThan(scrolledRight);
});

test("keeps secret input focus and selection while revealing", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const input = page.getByLabel("API key");
  await input.focus();
  await input.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new Error("Expected the API key input.");
    }
    element.setSelectionRange(5, 12);
  });

  await page.getByRole("button", { name: "Show" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toBeFocused();
  await expect
    .poll(() =>
      input.evaluate((element) => {
        if (!(element instanceof HTMLInputElement)) return null;
        return [element.selectionStart, element.selectionEnd];
      }),
    )
    .toEqual([5, 12]);
});

test("keeps virtualized grid behavior stable across measured rows and windows", async ({
  page,
}) => {
  // Measuring many virtualized rows is slow on a loaded runner.
  test.slow();
  await page.goto("/showcase.html");
  const grid = page.getByRole("grid", { name: "Fleet" });
  const row = (name: string) =>
    grid.getByRole("row").filter({ hasText: name }).first();
  const nameHeader = grid.getByRole("columnheader", { name: "Boat" });

  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "descending");
  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "ascending");

  const firstRow = row("Vessel 001");
  const secondRow = row("Vessel 002");
  const initialGap = await Promise.all([
    firstRow.boundingBox(),
    secondRow.boundingBox(),
  ]).then(([first, second]) => {
    if (first === null || second === null) {
      throw new Error("Expected the first two fleet rows to be rendered.");
    }
    return second.y - first.y;
  });

  await page.getByRole("button", { name: "Expand first vessel" }).click();
  await expect
    .poll(async () => {
      const [first, second] = await Promise.all([
        firstRow.boundingBox(),
        secondRow.boundingBox(),
      ]);
      if (first === null || second === null) return null;
      return {
        firstHeight: Math.round(first.height),
        rowGap: Math.round(second.y - first.y),
      };
    })
    .toEqual({ firstHeight: 81, rowGap: 81 });
  expect(initialGap).toBeLessThan(72);

  await firstRow.focus();
  for (let index = 0; index < 36; index += 1) {
    await page.keyboard.press("ArrowDown");
  }
  const activeRowIndex = await page.evaluate(() =>
    Number(
      document.activeElement
        ?.closest("[role='row']")
        ?.getAttribute("aria-rowindex"),
    ),
  );
  expect(activeRowIndex).toBeGreaterThan(30);
  await page.keyboard.press("Space");
  await expect(
    grid.locator(`[role="row"][aria-rowindex="${String(activeRowIndex)}"]`),
  ).toHaveAttribute("aria-selected", "true");

  await grid.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  const lastRow = row("Vessel 240");
  await expect(lastRow).toBeVisible();
  await expect(lastRow).toHaveAttribute("data-snui-zebra-odd", "true");

  await grid.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(nameHeader).toBeVisible();
  await nameHeader.focus();
  await page.keyboard.press("Enter");
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "descending");
  await grid.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(lastRow).toBeVisible();
  await expect(lastRow).not.toHaveAttribute("data-snui-zebra-odd");
  await lastRow.click();
  await expect(lastRow).toHaveAttribute("aria-selected", "true");
});

test("audits open overlays and every toast tone with axe", async ({ page }) => {
  test.slow();
  await page.goto("/showcase.html");
  await page.addStyleTag({ content: "* { transition: none !important; }" });

  // Dialog with its nested popover open.
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.getByRole("button", { name: "Show approach note" }).click();
  const popover = page.getByRole("dialog", { name: "Show approach note" });
  await expect(popover).toBeVisible();
  await expect(popover).toBeFocused();
  await expectNoAxeViolations(page, {
    disableRules: [
      {
        id: "scrollable-region-focusable",
        reason:
          "React Aria gives the popover tabindex -1 and moves focus onto it when it opens, so a scrolling popover with only text is keyboard scrollable; axe cannot see programmatic focus and reports this rule for exactly that pattern.",
      },
    ],
  });
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  // This audit is about axe, not focus return (the dialog unit tests cover
  // that). WebKit under load can leave focus on the dialog container after the
  // popover unmounts, so put it on the trigger before the Escape that closes
  // the dialog.
  await page.getByRole("button", { name: "Show approach note" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Menu open.
  await page.getByRole("button", { name: "Panel actions" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Every tone, in batches the queue cap holds at once, so axe sees each tone
  // rendered rather than evicted. Batching also keeps the test off the cap's
  // exact value, which is the queue's to choose.
  const region = page.getByRole("region", { name: "Notifications" });
  const toasts = region.locator(".snui-toast");
  for (const tones of [
    ["info", "success"],
    ["warning", "danger"],
  ]) {
    for (const tone of tones) {
      await page.getByRole("button", { name: `${tone} toast` }).click();
    }
    await expect(toasts).toHaveCount(tones.length);
    await expectNoAxeViolations(page);
    // Each dismissal is awaited: a toast stays in the DOM while it animates
    // out, so a second click would otherwise land on the same button.
    for (let remaining = tones.length; remaining > 0; remaining -= 1) {
      await region.getByRole("button", { name: "Dismiss" }).first().click();
      await expect(toasts).toHaveCount(remaining - 1);
    }
  }
});

test("keeps toasts reachable while a dialog is open", async ({ page }) => {
  // The axe pass over an open modal is slow on a loaded runner.
  test.slow();
  await page.goto("/showcase.html");
  await page.getByRole("button", { name: "danger toast" }).click();
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Anchorage details" }),
  ).toBeVisible();

  // The scrim and the dialog fade in on `--snui-transition-normal`, and an axe
  // pass that starts mid-fade measures composited colours rather than the ones
  // the tokens set, which reads as a contrast failure that does not exist.
  await settleAnimations(page);

  const region = page.getByRole("region", { name: "Notifications" });
  const dismiss = region.getByRole("button", { name: "Dismiss" });
  // The host is a top layer: not hidden, not inert, and focusable.
  await expect(page.locator(".snui-toast-region-host")).toHaveAttribute(
    "data-react-aria-top-layer",
  );
  await expect(region.getByRole("alert")).toBeVisible();
  await dismiss.focus();
  await expect(dismiss).toBeFocused();
  await expectNoAxeViolations(page);
});

test("paints the dialog scrim and toasts above the Admin header and sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto("/showcase.html?host-chrome=1");
  const header = page.locator(".app-header");
  const sidebar = page.locator(".sidebar");
  await expect(header).toHaveCSS("position", "fixed");
  await expect(header).toHaveCSS("z-index", String(HOST_HEADER_Z_INDEX));
  await expect(sidebar).toHaveCSS("z-index", String(HOST_HEADER_Z_INDEX - 1));

  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Anchorage details" }),
  ).toBeVisible();

  // The topmost element at a point inside the header, and at one inside the
  // sidebar, belongs to the modal layer: the scrim itself, or the dialog it
  // holds where the standard dialog width reaches over the sidebar.
  const hits = await page.evaluate(() => {
    const point = (selector: string): boolean | null => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      if (box === undefined) return null;
      const element = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return element !== null && element.closest(".snui-scrim") !== null;
    };
    return { header: point(".app-header"), sidebar: point(".sidebar") };
  });
  expect(hits).toEqual({ header: true, sidebar: true });

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The toast host is a fixed box in the same stacking context as the header,
  // so a larger z-index is what paints it above the header wherever the two
  // overlap.
  await page.getByRole("button", { name: "warning toast" }).click();
  const host = page.locator(".snui-toast-region-host");
  await expect(host).toHaveCSS("position", "fixed");
  const hostZIndex = await host.evaluate((element) =>
    Number(getComputedStyle(element).zIndex),
  );
  expect(hostZIndex).toBeGreaterThan(HOST_HEADER_Z_INDEX);
});
