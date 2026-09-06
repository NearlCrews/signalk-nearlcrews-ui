import AxeBuilder from "@axe-core/playwright";
import {
  test as base,
  type ConsoleMessage,
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export interface AxeRuleException {
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
