import { describe, expect, it } from "vitest";

import { stubAnimationFrames } from "../helpers.js";

describe("stubAnimationFrames", () => {
  it("never hands out a handle twice, as the real scheduler never does", () => {
    const { cancelled, runAll } = stubAnimationFrames();

    const first = window.requestAnimationFrame(() => undefined);
    runAll();
    const second = window.requestAnimationFrame(() => undefined);
    window.cancelAnimationFrame(second);

    // A reused handle would make the cancelled list name the frame that
    // already ran as well as the one still pending.
    expect(first).toBe(1);
    expect(second).not.toBe(first);
    expect(cancelled).toEqual([second]);
  });
});
