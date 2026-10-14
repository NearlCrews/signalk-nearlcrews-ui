import { describe, expect, it, vi } from "vitest";

import type * as WarnOnceModule from "../../src/utils/warn-once.js";

/**
 * Mirrors REPORTED_KEY_LIMIT in src/utils/warn-once.ts: the dedupe forgets
 * every key once it holds this many.
 */
const REPORTED_KEY_LIMIT = 100;

/**
 * A fresh module per test. The remembered keys are module state that lives as
 * long as the page, so a test that filled them would decide the next one.
 */
async function loadWarnOnce(): Promise<typeof WarnOnceModule> {
  vi.resetModules();
  return import("../../src/utils/warn-once.js");
}

describe("warnOnce", () => {
  it("warns once per key", async () => {
    const { warnOnce } = await loadWarnOnce();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnce("pump", "The pump is unnamed.");
    warnOnce("pump", "The pump is unnamed.");
    warnOnce("valve", "The valve is unnamed.");

    expect(warn.mock.calls).toEqual([
      ["The pump is unnamed."],
      ["The valve is unnamed."],
    ]);
  });

  it("forgets every key once it remembers the limit, and starts again", async () => {
    const { warnOnce } = await loadWarnOnce();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    for (let index = 0; index < REPORTED_KEY_LIMIT; index += 1) {
      warnOnce(`key-${String(index)}`, `message ${String(index)}`);
    }
    expect(warn).toHaveBeenCalledTimes(REPORTED_KEY_LIMIT);

    // Still remembered while the set is full.
    warnOnce("key-0", "message 0");
    expect(warn).toHaveBeenCalledTimes(REPORTED_KEY_LIMIT);

    // One key past the limit empties the set, so the first key warns again.
    warnOnce("key-past-the-limit", "message past the limit");
    warnOnce("key-0", "message 0");
    expect(warn).toHaveBeenCalledTimes(REPORTED_KEY_LIMIT + 2);
  });

  it("reports nothing in a production build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { warnOnce } = await loadWarnOnce();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnce("pump", "The pump is unnamed.");

    expect(warn).not.toHaveBeenCalled();
  });
});
