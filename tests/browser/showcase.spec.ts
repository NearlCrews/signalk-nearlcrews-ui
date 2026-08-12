import { expect, test } from "@playwright/test";

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
  test.setTimeout(60_000);
  await page.goto("/showcase.html");
  const grid = page.getByRole("grid", { name: "Fleet" });
  const row = (name: string) =>
    grid.getByRole("row").filter({ hasText: name }).first();

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

  const nameHeader = grid.getByRole("columnheader", { name: "Boat" });
  await nameHeader.click();
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
