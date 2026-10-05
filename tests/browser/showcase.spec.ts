import {
  type Box,
  boxOf,
  controlTargetFloor,
  emulateForcedColors,
  expect,
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  expectSolidOutline,
  expectTargetFloor,
  FORCED_COLORS_CONTRAST_EXCEPTION,
  FULL_PAGE_SNAPSHOT,
  freezeMotion,
  gridRow,
  type Locator,
  matchBaseline,
  movePointerOffPanel,
  type Page,
  selectFleetRow,
  selectTheme,
  settleAnimations,
  settledScrollLeft,
  skipOutsideChromium,
  styleOf,
  type ThemeName,
  test,
} from "./fixtures.js";

/** Bootstrap's fixed header z-index in the Signal K Admin, mirrored by the fixture. */
const HOST_HEADER_Z_INDEX = 1020;

/** Animation frames the scripted grid scroll is measured over. */
const SCROLL_FRAMES = 20;

/**
 * Layout reads one scrolling frame may cost.
 *
 * This is a runaway guard rather than a tight budget: measuring the rows a
 * virtualized grid actually renders costs tens of reads per frame, while
 * measuring the whole 241 row collection, or re-measuring the toast host and
 * the docked bar on every frame, costs hundreds. The ceiling sits between the
 * two so the second one fails and ordinary work does not.
 */
const SCROLL_LAYOUT_READS_PER_FRAME = 200;

// Console errors and uncaught page errors are the automatic
// `browserErrorCapture` fixture's job for every test in this file, so this one
// asserts only that the showcase rendered.
test("renders the showcase", async ({ page }) => {
  await page.goto("/showcase.html");
  await expect(
    page.getByRole("heading", { name: "Component showcase" }),
  ).toBeVisible();
  const grid = page.getByRole("grid", { name: "Fleet" });
  await expect(grid).toBeVisible();
  await expect(grid).toHaveAttribute("aria-rowcount", "241");
  const renderedRows = await grid.getByRole("row").count();
  expect(renderedRows).toBeGreaterThan(1);
  expect(renderedRows).toBeLessThan(241);
});

test("keeps a nested popover above its dialog", async ({ page }) => {
  await page.goto("/showcase.html");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await page.getByRole("button", { name: "Show approach note" }).click();

  const scrim = page.locator(".snui-scrim");
  const popover = page.getByRole("dialog", { name: "Show approach note" });
  const [dialogZIndex, popoverZIndex] = await Promise.all([
    styleOf(scrim, "z-index"),
    styleOf(popover, "z-index"),
  ]);

  expect(Number(popoverZIndex)).toBeGreaterThan(Number(dialogZIndex));
  await expect(popover).toBeVisible();
});

test("flips a popover anchored in panel flow and keeps its width", async ({
  page,
}) => {
  // A popover in ordinary panel flow, rather than the one inside the dialog:
  // collision flipping and the width variable are layout behaviors, so this is
  // the only place either is exercised against a real box.
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.goto("/showcase.html");
  const trigger = page.getByRole("button", { name: "About this anchorage" });
  await trigger.evaluate((element) => {
    element.scrollIntoView({ behavior: "instant", block: "end" });
  });
  // The panel carries a sticky action bar, which publishes a scroll clearance
  // that stops this scroll with the trigger above the bar rather than under
  // it. A trigger under the bar is pressed only after the click scrolls the
  // panel again, which puts it back where the popover has room to open
  // downward and the flip under test never happens.
  const triggerBox = await boxOf(trigger);
  await trigger.click();

  const popover = page.getByRole("dialog", { name: "About this anchorage" });
  await expect(popover).toBeVisible();
  await expect(popover).toHaveAttribute("data-placement", "top");
  await expect(popover).toHaveCSS("width", "280px");

  const box = await boxOf(popover);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(400);
  // The flip was forced rather than incidental: the popover is taller than
  // the room its trigger left below itself.
  expect(400 - (triggerBox.y + triggerBox.height)).toBeLessThan(box.height);
  // Free-form content is shown rather than clipped away to the border.
  const clipped = await popover.evaluate(
    (element) => element.scrollHeight > element.clientHeight,
  );
  expect(clipped).toBe(false);
});

test("opens an anchored overlay at full height in a scrolled panel", async ({
  page,
}) => {
  // The panel is many viewports tall, so the trigger is a long way below the
  // top of the panel by the time it is pressed. An overlay whose room to grow
  // is measured from the panel rather than from the viewport reports none left
  // and opens clipped to an empty sliver, which reads as a menu that refuses
  // to open.
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.goto("/showcase.html");
  await page.getByRole("button", { name: "Panel actions" }).click();

  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const clipped = await menu.evaluate(
    (element) => element.scrollHeight > element.clientHeight,
  );
  expect(clipped).toBe(false);

  const [surfaceBox, lastItemBox] = await Promise.all([
    boxOf(page.locator(".snui-menu-popover")),
    boxOf(page.getByRole("menuitem", { name: "Reset layout" })),
  ]);
  expect(lastItemBox.y + lastItemBox.height).toBeLessThanOrEqual(
    surfaceBox.y + surfaceBox.height,
  );
  expect(surfaceBox.y + surfaceBox.height).toBeLessThanOrEqual(400);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("applies the control target floor to the dense showcase controls", async ({
  page,
}, testInfo) => {
  // The panel fixture measures the form controls; these are the dense ones it
  // has none of, and axe is no backstop because its target-size rule is off by
  // default. The data grid is left out on purpose: the fixture sets
  // density="compact" on it, which is a deliberate step below the floor.
  const floor = controlTargetFloor(testInfo);
  await page.goto("/showcase.html");

  await expectTargetFloor(page.getByRole("tab", { name: "Overview" }), floor);
  await expectTargetFloor(
    page.getByRole("button", { name: "Connection log" }),
    floor,
  );
  await expectTargetFloor(
    page.getByRole("button", { name: "Show" }),
    floor,
    "both",
  );
  await expectTargetFloor(
    page.getByRole("button", { name: "About this anchorage" }),
    floor,
  );

  await page.getByRole("button", { name: "Panel actions" }).click();
  await expectTargetFloor(
    page.getByRole("menuitem", { name: "Refresh data" }),
    floor,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await page.getByRole("button", { name: "info toast" }).click();
  const region = page.getByRole("region", { name: "Notifications" });
  const dismiss = region.getByRole("button", { name: "Dismiss" });
  await expect(dismiss).toBeVisible();
  await expectTargetFloor(dismiss, floor, "both");
  await dismiss.click();
  await expect(region.locator(".snui-toast")).toHaveCount(0);

  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Anchorage details" });
  await expect(dialog).toBeVisible();
  await expectTargetFloor(dialog.getByRole("button", { name: "Done" }), floor);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("announces and dismisses the destructive alert dialog", async ({
  page,
}) => {
  await page.goto("/showcase.html");
  const trigger = page.getByRole("button", { name: "Open alert dialog" });
  await trigger.click();

  const alert = page.getByRole("alertdialog", { name: "Delete route?" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Keep route" })).toBeVisible();

  // The scrim and the surface fade in, and an axe pass mid-fade measures
  // composited colors rather than the ones the tokens set.
  await settleAnimations(page);
  await expectNoAxeViolations(page);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("bounds the layout reads a scrolling grid costs per frame", async ({
  page,
}) => {
  // Scrolling many virtualized rows is slow on a loaded runner.
  test.slow();
  await page.goto("/showcase.html");
  const grid = page.getByRole("grid", { name: "Fleet" });
  await expect(grid).toBeVisible();

  const measured = await grid.evaluate(async (element, frames) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "getBoundingClientRect",
    );
    if (descriptor === undefined) {
      throw new Error("Expected Element.prototype.getBoundingClientRect.");
    }
    const original = descriptor.value as (this: Element) => DOMRect;
    let reads = 0;
    Object.defineProperty(Element.prototype, "getBoundingClientRect", {
      ...descriptor,
      value: function counted(this: Element): DOMRect {
        reads += 1;
        return original.call(this);
      },
    });

    let scrolled = 0;
    try {
      for (let frame = 1; frame <= frames; frame += 1) {
        element.scrollTop = frame * 120;
        element.dispatchEvent(new Event("scroll"));
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        scrolled += 1;
      }
    } finally {
      Object.defineProperty(
        Element.prototype,
        "getBoundingClientRect",
        descriptor,
      );
    }
    return { reads, scrolled };
  }, SCROLL_FRAMES);

  expect(measured.scrolled).toBe(SCROLL_FRAMES);
  expect(measured.reads / measured.scrolled).toBeLessThanOrEqual(
    SCROLL_LAYOUT_READS_PER_FRAME,
  );
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
  const box = await boxOf(popover);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(568);
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
  await expectNoSidewaysScroll(page);

  // The overflow is reachable by keyboard because the region takes focus and
  // the arrow keys scroll it both ways.
  await region.focus();
  await expect(region).toBeFocused();
  await page.keyboard.press("ArrowRight");
  // Read it once it stops moving: a key sent while the previous scroll is
  // still running is swallowed, which reads as the region refusing to scroll
  // back rather than as two presses being coalesced.
  const scrolledRight = await settledScrollLeft(region);
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
  const nameHeader = grid.getByRole("columnheader", { name: "Boat" });
  /** Scrolls the grid to its top or its end the way a user's scroll does. */
  const scrollGrid = (toEnd: boolean) =>
    grid.evaluate((element, end) => {
      element.scrollTop = end ? element.scrollHeight : 0;
      element.dispatchEvent(new Event("scroll"));
    }, toEnd);

  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "descending");
  await nameHeader.click();
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "ascending");

  const firstRow = gridRow(grid, "Vessel 001");
  const secondRow = gridRow(grid, "Vessel 002");
  const [initialFirst, initialSecond] = await Promise.all([
    boxOf(firstRow),
    boxOf(secondRow),
  ]);
  const initialGap = initialSecond.y - initialFirst.y;

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

  await scrollGrid(true);
  const lastRow = gridRow(grid, "Vessel 240");
  await expect(lastRow).toBeVisible();
  await expect(lastRow).toHaveAttribute("data-snui-zebra-odd", "true");

  await scrollGrid(false);
  await expect(nameHeader).toBeVisible();
  await nameHeader.focus();
  await page.keyboard.press("Enter");
  await expect(nameHeader).toHaveAttribute("data-sort-direction", "descending");
  await scrollGrid(false);
  await expect(lastRow).toBeVisible();
  await expect(lastRow).not.toHaveAttribute("data-snui-zebra-odd");
  await lastRow.click();
  await expect(lastRow).toHaveAttribute("aria-selected", "true");
});

test("audits open overlays and every toast tone with axe", async ({ page }) => {
  test.slow();
  await page.goto("/showcase.html");
  await freezeMotion(page);

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
  // pass that starts mid-fade measures composited colors rather than the ones
  // the tokens set, which reads as a contrast failure that does not exist.
  await settleAnimations(page);

  const region = page.getByRole("region", { name: "Notifications" });
  const dismiss = region.getByRole("button", { name: "Dismiss" });
  // The host is a top layer: not hidden, not inert, and focusable.
  await expect(page.locator(".snui-toast-region-host")).toHaveAttribute(
    "data-react-aria-top-layer",
  );
  // The card is not a live region: the failure is spoken from the host's
  // persistent assertive region, which stays exposed beside the modal.
  await expect(
    region.locator(".snui-toast").filter({ hasText: "danger toast" }),
  ).toBeVisible();
  await expect(
    page.locator(".snui-toast-region-host").getByRole("alert"),
  ).toContainText("danger toast");
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
  expect(Number(await styleOf(host, "z-index"))).toBeGreaterThan(
    HOST_HEADER_Z_INDEX,
  );
});

test("reconstructs every overlay module under forced colors", async ({
  page,
}, testInfo) => {
  skipOutsideChromium(testInfo);
  await page.goto("/showcase.html");
  await emulateForcedColors(page);

  // Every overlay module at once: the three existing forced-colors probes
  // cover controls, tabs, and the inline confirmation, so the blocks in
  // toast.ts, dialog.ts, menu.ts, and popover.ts are otherwise never painted
  // in a test.
  await page.getByRole("button", { name: "danger toast" }).click();
  const toneDot = page.locator(".snui-toast__tone-dot").first();
  await expect(toneDot).toHaveCSS("forced-color-adjust", "none");

  await page.getByRole("button", { name: "Panel actions" }).click();
  await expectSolidOutline(page.locator(".snui-menu-popover"));
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "About this anchorage" }).click();
  await expectSolidOutline(page.locator(".snui-popover").first());
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open dialog" }).click();
  await expectSolidOutline(page.locator(".snui-dialog"));

  await expectNoAxeViolations(page, {
    disableRules: [FORCED_COLORS_CONTRAST_EXCEPTION],
  });
});

/**
 * The pixel baselines the showcase takes in each theme: the whole page, where
 * the grid, table, tabs, form controls, badges, status indicators, and banners
 * all render, the dialog with its nested popover open, and the open menu.
 * Between them they paint every per-component style module the panel page
 * never renders. The names are literals, so the family check can read them.
 */
const SHOWCASE_BASELINES = [
  {
    dialog: "showcase-light-dialog.png",
    menu: "showcase-light-menu.png",
    page: "showcase-light.png",
    theme: "Light",
  },
  {
    dialog: "showcase-dark-dialog.png",
    menu: "showcase-dark-menu.png",
    page: "showcase-dark.png",
    theme: "Dark",
  },
  {
    dialog: "showcase-night-dialog.png",
    menu: "showcase-night-menu.png",
    page: "showcase-night.png",
    theme: "Night",
  },
] as const satisfies readonly {
  readonly dialog: string;
  readonly menu: string;
  readonly page: string;
  readonly theme: ThemeName;
}[];

/**
 * The moment the showcase's clock is pinned to, so every relative age reads
 * the same in every capture.
 */
const SHOWCASE_NOW = new Date("2026-09-01T12:00:00Z");

/** Pixels of page kept around an anchored overlay's clipped capture. */
const OVERLAY_CLIP_MARGIN = 16;

/**
 * Fails when the sticky action bar overlaps the table's caption or header
 * row, which a full-page capture would then show covered.
 */
async function expectTableClearOfActionBar(page: Page): Promise<void> {
  const table = page.getByRole("table", { name: "Signal K paths" });
  const [bar, head] = await Promise.all([
    boxOf(page.locator(".snui-action-bar").last()),
    table.evaluate((element) => {
      const caption = element.querySelector("caption");
      const header = element.querySelector("thead");
      if (caption === null || header === null) {
        throw new Error("The table has no caption and header row.");
      }
      const top = caption.getBoundingClientRect().top;
      const bottom = header.getBoundingClientRect().bottom;
      return { bottom, top };
    }),
  ]);
  const overlaps = bar.y < head.bottom && bar.y + bar.height > head.top;
  expect(
    overlaps,
    "The action bar covers the table's caption or header row.",
  ).toBe(false);
}

/** The page region covering a trigger and the overlay anchored to it. */
async function clipAround(
  page: Page,
  ...locators: readonly Locator[]
): Promise<Box> {
  const boxes = await Promise.all(locators.map((locator) => boxOf(locator)));
  const viewport = page.viewportSize();
  const left = Math.max(
    0,
    Math.min(...boxes.map((box) => box.x)) - OVERLAY_CLIP_MARGIN,
  );
  const top = Math.max(
    0,
    Math.min(...boxes.map((box) => box.y)) - OVERLAY_CLIP_MARGIN,
  );
  const right = Math.min(
    viewport?.width ?? Number.POSITIVE_INFINITY,
    Math.max(...boxes.map((box) => box.x + box.width)) + OVERLAY_CLIP_MARGIN,
  );
  const bottom = Math.min(
    viewport?.height ?? Number.POSITIVE_INFINITY,
    Math.max(...boxes.map((box) => box.y + box.height)) + OVERLAY_CLIP_MARGIN,
  );
  return {
    height: Math.round(bottom - top),
    width: Math.round(right - left),
    x: Math.round(left),
    y: Math.round(top),
  };
}

/*
 * One pass per theme selects and settles the theme once, then compares the
 * page and its overlays with their baselines, so a token or selector change
 * that repaints a grid, a dialog, or a menu in Dark or Night fails here even
 * when no assertion names it. The axe audit of the same pages in each theme
 * lives in theme-accessibility.spec.ts. Chromium only, like every desktop
 * baseline.
 */
for (const baseline of SHOWCASE_BASELINES) {
  test(`matches the showcase baselines in ${baseline.theme}`, async ({
    page,
  }, testInfo) => {
    skipOutsideChromium(testInfo);
    test.slow();
    await page.clock.setFixedTime(SHOWCASE_NOW);
    await page.goto("/showcase.html");
    await freezeMotion(page);
    await selectTheme(page, baseline.theme);
    // The capture shows the selected row's rest fill, so the pointer leaves
    // the row it clicked before the capture.
    const selectedRow = await selectFleetRow(page);
    // The page is captured in a viewport as tall as the page. A full-page
    // capture of a shorter one paints the bottom-sticky action bar at the
    // bottom of whatever viewport the click left, over the table's caption
    // and header row, and a scroll to the end instead moves the grid out of
    // view, where its virtualizer renders no rows. In a viewport holding the
    // whole page the bar rests in its own slot and every grid row renders.
    const viewport = page.viewportSize();
    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.setViewportSize({
      height: pageHeight,
      width: viewport?.width ?? 1280,
    });
    await movePointerOffPanel(page);
    await expect(selectedRow).not.toHaveAttribute("data-hovered");
    await expectTableClearOfActionBar(page);
    await settleAnimations(page);
    await matchBaseline(page, testInfo, baseline.page, FULL_PAGE_SNAPSHOT);
    if (viewport !== null) await page.setViewportSize(viewport);

    const menuTrigger = page.getByRole("button", { name: "Panel actions" });
    await menuTrigger.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await settleAnimations(page);
    await matchBaseline(page, testInfo, baseline.menu, {
      animations: "disabled",
      clip: await clipAround(page, menuTrigger, menu),
    });
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);

    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Anchorage details" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Show approach note" }).click();
    const note = page.getByRole("dialog", { name: "Show approach note" });
    await expect(note).toBeVisible();
    await settleAnimations(page);
    await matchBaseline(page, testInfo, baseline.dialog, {
      animations: "disabled",
    });
  });
}
