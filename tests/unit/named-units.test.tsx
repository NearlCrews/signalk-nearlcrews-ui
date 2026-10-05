import { describe, expect, it } from "vitest";
import {
  hasUnitContent,
  isNamedUnit,
  renderUnit,
  unitSpokenText,
} from "../../src/utils/unit.js";

describe("named unit helpers", () => {
  it("tells a named unit from a node and reads it by name, or by its symbol", () => {
    expect(isNamedUnit({ name: "knots", symbol: "kn" })).toBe(true);
    expect(isNamedUnit("kn")).toBe(false);
    expect(isNamedUnit(<span>kn</span>)).toBe(false);
    expect(isNamedUnit(null)).toBe(false);

    expect(unitSpokenText({ name: " knots ", symbol: "kn" })).toBe("knots");
    // A blank name falls back to the symbol, which is then read as drawn.
    expect(unitSpokenText({ name: " ", symbol: "kn" })).toBe("kn");
    expect(unitSpokenText(12)).toBe("12");
    // A unit drawn through markup of its own is read as the text it renders.
    expect(unitSpokenText(<abbr title="knots">kn</abbr>)).toBe("kn");
    expect(unitSpokenText(<span aria-hidden="true">kn</span>)).toBeUndefined();

    expect(hasUnitContent({ name: "", symbol: "" })).toBe(false);
    expect(hasUnitContent({ name: "knots", symbol: "" })).toBe(true);
    expect(hasUnitContent(" ")).toBe(false);
  });

  it("draws a named unit with no name as its plain symbol", () => {
    expect(renderUnit({ name: " ", symbol: "kn" })).toBe("kn");
  });
});
