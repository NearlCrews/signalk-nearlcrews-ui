import { expect, test } from "@playwright/test";

const CSP_NONCE = "snui-csp-fixture";

for (const fixture of [
  { mode: "matching", stylesApply: true, styleNonce: CSP_NONCE },
  { mode: "missing", stylesApply: false, styleNonce: null },
  { mode: "wrong", stylesApply: false, styleNonce: "wrong-nonce" },
] as const) {
  test(`${fixture.mode} style nonce`, async ({ page }) => {
    const response = await page.goto(`/csp.html?mode=${fixture.mode}`);

    expect(response?.headers()["content-security-policy"]).toContain(
      `style-src 'nonce-${CSP_NONCE}'`,
    );

    const button = page.getByRole("button", { name: "CSP target" });
    const style = page.locator("style[data-snui-styles]");
    await expect(button).toBeVisible();
    await expect(style).toHaveCount(1);

    await expect(style).toHaveJSProperty("nonce", fixture.styleNonce ?? "");

    const display = await button.evaluate(
      (element) => getComputedStyle(element).display,
    );
    if (fixture.stylesApply) {
      expect(display).toBe("inline-flex");
    } else {
      expect(display).not.toBe("inline-flex");
    }
  });
}
