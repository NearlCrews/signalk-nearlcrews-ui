import { expect, test } from "@playwright/test";

test("loads classic and ESM remotes against one host React", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/federation.html");
  await expect(page.locator("body")).toHaveAttribute(
    "data-federation-ready",
    "true",
  );
  await expect(page.getByText("Fixture ready")).toHaveCount(2);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(1);

  const roots = page.locator("[data-snui-version]");
  const firstThemeGroup = page
    .getByRole("radiogroup", { name: "Theme" })
    .first();
  await firstThemeGroup.getByRole("radio", { name: "Night" }).click();
  await expect(roots).toHaveCount(2);
  await expect(roots.nth(0)).toHaveAttribute("data-snui-theme", "night");
  await expect(roots.nth(1)).toHaveAttribute("data-snui-theme", "night");

  await page.evaluate(() => window.unmountFederationFixture?.("classic-root"));
  await expect(page.getByText("Fixture ready")).toHaveCount(1);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(1);

  await page.evaluate(() => window.unmountFederationFixture?.("esm-root"));
  await expect(page.getByText("Fixture ready")).toHaveCount(0);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeEmpty();
  expect(pageErrors).toEqual([]);
});
