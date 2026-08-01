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
  expect(errors).toEqual([]);
});
