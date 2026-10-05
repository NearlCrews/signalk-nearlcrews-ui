import { describe, expect, it, vi } from "vitest";

import type * as FormatRelativeAgeModule from "../../src/utils/format-relative-age.js";
import {
  countConstructors,
  interceptConstructors,
} from "./lib/relative-time-format.js";

/**
 * Mirrors FORMATTER_CACHE_LIMIT in src/utils/intl.ts, the cache this module
 * formats through: it is emptied once it holds this many formatters.
 */
const FORMATTER_CACHE_LIMIT = 32;
/** A distinct private-use tag per index, so each one builds its own formatter. */
const localeAt = (index: number): string => `en-x-p${String(index)}`;
const FIRST_LOCALE = localeAt(0);
const LAST_LOCALE = localeAt(FORMATTER_CACHE_LIMIT);
const LOCALES = Array.from({ length: FORMATTER_CACHE_LIMIT + 1 }, (_, index) =>
  localeAt(index),
);

/**
 * A fresh module per test. The formatter cache is module state that lives as
 * long as the page, so a test that filled it would decide the next one.
 */
async function loadFormatRelativeAge(): Promise<
  typeof FormatRelativeAgeModule
> {
  vi.resetModules();
  return import("../../src/utils/format-relative-age.js");
}

describe("relative age formatter cache", () => {
  it("keeps every locale on screen cached, not only the last one", async () => {
    const { formatRelativeAge } = await loadFormatRelativeAge();
    const constructorCount = countConstructors();

    // A panel renders several ages at once, so an entry has to survive the
    // formatter built after it.
    formatRelativeAge(300_000, { locale: FIRST_LOCALE });
    formatRelativeAge(300_000, { locale: LAST_LOCALE });
    formatRelativeAge(600_000, { locale: FIRST_LOCALE });

    expect(constructorCount()).toBe(2);
  });

  it("empties the cache at its limit instead of growing with the page", async () => {
    const { formatRelativeAge } = await loadFormatRelativeAge();
    const constructorCount = countConstructors();

    for (const locale of LOCALES) formatRelativeAge(300_000, { locale });
    expect(constructorCount()).toBe(LOCALES.length);

    // The limit empties the cache, it does not switch it off: the tag that
    // refilled it is still a hit.
    formatRelativeAge(600_000, { locale: LAST_LOCALE });
    expect(constructorCount()).toBe(LOCALES.length);

    // The tag that filled the first slot went out with the rest, so a panel
    // that cycles through locales cannot pin formatters in memory forever.
    formatRelativeAge(300_000, { locale: FIRST_LOCALE });
    expect(constructorCount()).toBe(LOCALES.length + 1);
  });

  it("propagates a formatter failure that is not a locale problem", async () => {
    const { formatRelativeAge } = await loadFormatRelativeAge();
    let failed = false;
    interceptConstructors(() => {
      if (failed) return;
      failed = true;
      throw new TypeError("Intl data is unavailable.");
    });

    // Only a RangeError means "this tag is not usable". The retry with the
    // runtime default locale would succeed here, so a failure that reaches
    // the caller is the one thing that proves the retry was not attempted.
    expect(() => formatRelativeAge(300_000)).toThrow(TypeError);
  });
});
