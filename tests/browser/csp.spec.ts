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
    // Progress installs its own module sheet, which is the half of the nonce
    // contract the root sheet cannot prove: a module sheet has to carry the
    // same nonce or a nonce-enforcing host renders that component unstyled.
    const moduleStyle = page.locator(
      'style[data-snui-style-module="progress"]',
    );
    const progressFill = page.locator(".snui-progress__fill");
    await expect(button).toBeVisible();
    await expect(style).toHaveCount(1);
    await expect(moduleStyle).toHaveCount(1);
    await expect(progressFill).toHaveAttribute("style", /inline-size: 50%/);

    await expect(style).toHaveJSProperty("nonce", fixture.styleNonce ?? "");
    await expect(moduleStyle).toHaveJSProperty(
      "nonce",
      fixture.styleNonce ?? "",
    );

    const display = await button.evaluate(
      (element) => getComputedStyle(element).display,
    );
    // The inline size above is a style attribute, which style-src-attr allows
    // in every case, so the fill's painted color is what says whether the
    // module sheet's own rules were applied.
    const fillBackground = await progressFill.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    if (fixture.stylesApply) {
      expect(display).toBe("inline-flex");
      expect(fillBackground).not.toBe("rgba(0, 0, 0, 0)");
    } else {
      expect(display).not.toBe("inline-flex");
      expect(fillBackground).toBe("rgba(0, 0, 0, 0)");
    }
  });
}
