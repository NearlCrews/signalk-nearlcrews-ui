import { expect, test } from "./fixtures.js";

test("loads classic and ESM remotes against host React and ReactDOM", async ({
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
  await expect(page.getByText("Composite entry ready")).toHaveCount(2);
  await expect(page.getByText("Data-grid entry ready")).toHaveCount(2);
  await expect(
    page.getByRole("textbox", { name: "Federation forms entry" }),
  ).toHaveCount(2);
  await expect(page.getByText("Saved 0 times")).toHaveCount(2);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(1);

  await page
    .locator("#classic-root")
    .getByRole("button", { name: "Save configuration" })
    .click();
  await expect(page.locator("#classic-root")).toContainText("Saved 1 times");
  await expect(page.locator("#esm-root")).toContainText("Saved 0 times");

  const roots = page.locator("[data-snui-version]");
  const firstThemeGroup = page
    .getByRole("radiogroup", { name: "Theme" })
    .first();
  await firstThemeGroup.getByRole("radio", { name: "Night" }).click();
  await expect(roots).toHaveCount(2);
  await expect(roots.nth(0)).toHaveAttribute("data-snui-theme", "night");
  await expect(roots.nth(1)).toHaveAttribute("data-snui-theme", "night");

  const classicRoot = page.locator("#classic-root");
  const esmRoot = page.locator("#esm-root");
  await classicRoot.getByRole("button", { name: "Notify" }).click();
  const classicPanelRoot = classicRoot.locator("[data-snui-root]");
  await expect(classicPanelRoot.getByText("Host portal ready")).toHaveCount(1);
  await expect(
    classicPanelRoot.locator(":scope > .snui-toast-region-host"),
  ).toHaveCount(1);
  await expect(esmRoot.locator(".snui-toast")).toHaveCount(0);
  await expect(page.locator("body > .snui-toast-region-host")).toHaveCount(0);
  await expect(esmRoot.locator(".snui-toast-region-host")).toHaveCount(1);

  await page.evaluate(() => window.unmountFederationFixture?.("classic-root"));
  await expect(page.getByText("Fixture ready")).toHaveCount(1);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(1);

  await page.evaluate(() => window.unmountFederationFixture?.("esm-root"));
  await expect(page.getByText("Fixture ready")).toHaveCount(0);
  await expect(page.locator("style[data-snui-styles]")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeEmpty();
  expect(pageErrors).toEqual([]);
});
