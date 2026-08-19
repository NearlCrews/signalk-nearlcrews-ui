import { expect, test } from "./fixtures.js";

const CSP_NONCE = "snui-csp-fixture";

for (const fixture of [
  { mode: "matching", stylesApply: true, styleNonce: CSP_NONCE },
  { mode: "missing", stylesApply: false, styleNonce: null },
  { mode: "wrong", stylesApply: false, styleNonce: "wrong-nonce" },
] as const) {
  test(`${fixture.mode} style nonce`, async ({ page }) => {
    const response = await page.goto(`/csp.html?mode=${fixture.mode}`);

    expect(response?.headers()["content-security-policy"]).toContain(
      `style-src-elem 'nonce-${CSP_NONCE}'`,
    );
    expect(response?.headers()["content-security-policy"]).toContain(
      "style-src-attr 'unsafe-inline'",
    );

    const button = page.getByRole("button", { name: "CSP target" });
    const style = page.locator("style[data-snui-styles]");
    const progressFill = page.locator(".snui-progress__fill");
    await expect(button).toBeVisible();
    await expect(style).toHaveCount(1);
    await expect(progressFill).toHaveAttribute("style", /inline-size: 50%/);

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
