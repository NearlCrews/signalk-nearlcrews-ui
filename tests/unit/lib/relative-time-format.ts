import { vi } from "vitest";

/**
 * Runs `onConstruct` ahead of every relative time formatter that is built,
 * keeping the real behavior for each one it lets through.
 */
export function interceptConstructors(onConstruct: () => void): void {
  const Original = Intl.RelativeTimeFormat;
  vi.spyOn(Intl, "RelativeTimeFormat").mockImplementation(function (
    this: unknown,
    ...args: ConstructorParameters<typeof Intl.RelativeTimeFormat>
  ) {
    onConstruct();
    return new Original(...args);
  });
}

/** Counts every relative time formatter that is built. */
export function countConstructors(): () => number {
  let constructed = 0;
  interceptConstructors(() => {
    constructed += 1;
  });
  return () => constructed;
}
