/**
 * The locale shape every formatter in the package takes, and the cache that
 * builds each `Intl` formatter once. Nothing here imports React, so the
 * formatting entry can reach it from a worker or a plain Node script.
 */

/** A BCP 47 locale or list, in the shape every formatter in the package takes. */
export type PanelLocale = string | readonly string[];

/**
 * How many formatters one cache holds. The cap only bounds a pathological
 * caller: a panel formats in one or two locales with a handful of variants.
 */
const FORMATTER_CACHE_LIMIT = 32;

/**
 * Returns the formatter for a locale and a variant, building it with `build`
 * the first time the pair is asked for. `variant` names every other option
 * the built formatter depends on, and `build` receives the locale as the list
 * `Intl` takes, or undefined for the runtime default.
 *
 * @internal
 */
export type FormatterCache<F> = (
  locale: PanelLocale | undefined,
  variant: string,
  build: (locales: readonly string[] | undefined) => F,
) => F;

/**
 * A cache of formatters keyed by locale and variant.
 *
 * A malformed or unsupported locale tag is data, often from a host setting,
 * so it builds the runtime default formatter rather than breaking a render.
 * Anything else `build` throws is a real failure and propagates.
 *
 * @internal
 */
export function createFormatterCache<F>(): FormatterCache<F> {
  const formatters = new Map<string, F>();

  return (locale, variant, build) => {
    // Concatenated rather than serialized, and read straight off the caller's
    // value: formatters run on every render of every value on screen, and the
    // default path has no locale at all. The copy Intl needs waits for a miss.
    // A list joins on a character no tag holds, so a host setting passed as
    // one comma-joined string, a rejected tag, never shares a key with it.
    const tags =
      typeof locale === "string" ? locale : (locale?.join("\u0001") ?? "");
    const key = `${tags}\u0000${variant}`;
    const cached = formatters.get(key);
    if (cached !== undefined) return cached;

    const locales =
      locale === undefined
        ? undefined
        : typeof locale === "string"
          ? [locale]
          : [...locale];
    let formatter: F;
    try {
      formatter = build(locales);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      formatter = build(undefined);
    }
    // A full clear rather than an eviction: rebuilding a handful of
    // formatters is cheaper than tracking use order.
    if (formatters.size >= FORMATTER_CACHE_LIMIT) formatters.clear();
    formatters.set(key, formatter);
    return formatter;
  };
}
