import AxeBuilder from "@axe-core/playwright";
import {
  test as base,
  type ConsoleMessage,
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

interface AxeRuleException {
  /** The axe rule id left out of this one run. */
  readonly id: string;
  /** Why the rule misreports the state under test; it is recorded, not optional. */
  readonly reason: string;
}

export interface AxeOptions {
  readonly disableRules?: readonly AxeRuleException[] | undefined;
}

/**
 * Runs axe over the page as it stands, color-contrast included, and fails on
 * any violation. Open overlays and enqueued toasts are part of the page, so
 * call it with those states present. A rule is left out only with a reason,
 * so every exception reads as a documented limitation at its call site.
 */
/**
 * Waits for every running transition and animation to finish.
 *
 * An axe pass that starts while an overlay is still fading measures colours
 * composited against whatever is behind it, not the ones the tokens set, and
 * reports a contrast failure that does not exist once the paint settles.
 */
/**
 * Reads `scrollLeft` once it stops moving.
 *
 * A scroll started by a key press takes time to come to rest, and a second
 * key sent while it is still running is swallowed, so a test that presses
 * twice in a row sees the region refuse to move rather than the engine
 * coalescing the two.
 */
export async function settledScrollLeft(region: Locator): Promise<number> {
  let previous = Number.NaN;
  await expect
    .poll(async () => {
      const current = await region.evaluate((element) => element.scrollLeft);
      const settled = current > 1 && current === previous;
      previous = current;
      return settled;
    })
    .toBe(true);
  return previous;
}

export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finishing = document
      .getAnimations()
      // A looping animation, such as the spinner or the indeterminate progress
      // fill, never finishes, so waiting on it would hang rather than settle.
      .filter(
        (animation) =>
          animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY,
      )
      .map((animation) => animation.finished.catch(() => undefined));
    await Promise.all(finishing);
  });
}

export async function expectNoAxeViolations(
  page: Page,
  options: AxeOptions = {},
): Promise<void> {
  const exceptions = options.disableRules ?? [];
  for (const exception of exceptions) {
    expect(exception.reason.trim().length).toBeGreaterThan(0);
  }
  const results = await new AxeBuilder({ page })
    .disableRules(exceptions.map((exception) => exception.id))
    .analyze();
  expect(results.violations).toEqual([]);
}

interface BrowserIssue {
  readonly kind: "console.error" | "pageerror";
  readonly pageUrl: string;
  readonly sourceUrl?: string | undefined;
  readonly text: string;
}

interface BrowserErrorFixture {
  readonly browserErrorCapture: undefined;
}

function isExpectedCspViolation(issue: BrowserIssue): boolean {
  if (issue.kind !== "console.error") return false;
  let location: URL;
  try {
    location = new URL(issue.pageUrl);
  } catch {
    return false;
  }
  const mode = location.searchParams.get("mode");
  return (
    location.pathname === "/csp.html" &&
    (mode === "missing" || mode === "wrong") &&
    /refused to apply (?:(?:an? )?inline style|a stylesheet)|applying inline style violates|blocked an inline style/i.test(
      issue.text,
    ) &&
    /content[- ]security[- ]policy|style-src(?:-elem)?/i.test(issue.text)
  );
}

export const test = base.extend<BrowserErrorFixture>({
  browserErrorCapture: [
    async ({ page }, provide) => {
      const issues: BrowserIssue[] = [];
      const onConsole = (message: ConsoleMessage): void => {
        if (message.type() !== "error") return;
        issues.push({
          kind: "console.error",
          pageUrl: page.url(),
          sourceUrl: message.location().url || undefined,
          text: message.text(),
        });
      };
      const onPageError = (error: Error): void => {
        issues.push({
          kind: "pageerror",
          pageUrl: page.url(),
          text: error.message,
        });
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      try {
        await provide(undefined);
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }

      const unexpected = issues.filter(
        (issue) => !isExpectedCspViolation(issue),
      );
      expect(
        unexpected,
        "Unexpected browser console errors or uncaught page errors were recorded.",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export type { Locator, Page, TestInfo };
export { expect };
