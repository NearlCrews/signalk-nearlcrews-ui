import { describe, expect, it } from "vitest";

import {
  assertKnownOptions,
  formatCount,
  joinNames,
  readOption,
  readValues,
} from "../../bin/lib/cli-arguments.mjs";
import {
  joinList,
  formatCount as packageFormatCount,
} from "../../src/utils/text.js";

describe("readOption", () => {
  it("reads the value a flag was given", () => {
    expect(readOption(["--root", "plugins/foo"], "--root")).toBe("plugins/foo");
    expect(readOption(["--runtime"], "--root")).toBeUndefined();
  });

  it("names what the option takes when a flag follows it", () => {
    expect(() =>
      readOption(["--root", "--remote"], "--root", "a path"),
    ).toThrow("--root requires a path.");
    expect(() => readOption(["--root"], "--root", "a path")).toThrow(
      "--root requires a path.",
    );
  });

  it("refuses a repeated option rather than keeping the first value", () => {
    // Silently keeping the first checks something other than what was asked.
    expect(() =>
      readOption(["--root", "one", "--root", "two"], "--root", "a path"),
    ).toThrow("--root was given 2 times, and it takes one value.");
  });
});

describe("readValues", () => {
  it("keeps every value of a repeatable option, in order", () => {
    expect(
      readValues(
        ["--expect", "one", "--runtime", "--expect", "two"],
        "--expect",
      ),
    ).toEqual(["one", "two"]);
    expect(readValues(["--runtime"], "--expect")).toEqual([]);
  });

  it("names what the option takes when a flag follows it", () => {
    expect(() =>
      readValues(["--expect", "--runtime"], "--expect", "text"),
    ).toThrow("--expect requires text.");
  });
});

describe("joinNames", () => {
  it("writes a list with the serial comma", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["--expose"])).toBe("--expose");
    expect(joinNames(["--expect", "--expose"])).toBe("--expect and --expose");
    expect(joinNames(["--container", "--expect", "--expose"])).toBe(
      "--container, --expect, and --expose",
    );
    expect(joinNames(["a", "b", "c"], "or")).toBe("a, b, or c");
  });
});

describe("assertKnownOptions", () => {
  const known = ["--root", "--remote"];

  it("passes an argument list of known options and their values", () => {
    expect(() =>
      assertKnownOptions(["--root", ".", "--remote", "public/x.js"], known),
    ).not.toThrow();
  });

  it("refuses a misspelled option, which would otherwise skip a check", () => {
    expect(() =>
      assertKnownOptions(["--root", ".", "--basline", "size.json"], known),
    ).toThrow("--basline is not an option this check takes.");
  });

  it("names every unknown option once, and adds the hint it was given", () => {
    expect(() =>
      assertKnownOptions(
        ["--one", "a", "--two", "b", "--one", "c", "--three", "d"],
        known,
        " Read the usage.",
      ),
    ).toThrow(
      "--one, --two, and --three are not options this check takes. Read the usage.",
    );
  });
});

describe("the command line's copies of the package wording helpers", () => {
  // `bin` ships without `scripts` and cannot import the package's TypeScript
  // sources, so the wording rules are written twice. These hold the copies to
  // the originals, so a change to either reaches both.
  const lists = [
    [],
    ["one"],
    ["one", "two"],
    ["one", "two", "three"],
    ["one", "two", "three", "four"],
  ];

  it("join a list the way joinList does", () => {
    for (const names of lists) {
      expect(joinNames(names)).toBe(joinList(names));
      expect(joinNames(names, "or")).toBe(joinList(names, "or"));
    }
  });

  it("count a noun the way formatCount does", () => {
    for (const count of [0, 1, 2, 11]) {
      expect(formatCount(count, "bundle")).toBe(
        packageFormatCount(count, "bundle"),
      );
      expect(formatCount(count, "match", "matches")).toBe(
        packageFormatCount(count, "match", "matches"),
      );
    }
  });
});
