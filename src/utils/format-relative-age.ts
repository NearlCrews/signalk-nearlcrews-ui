export type RelativeAgeNegative = "clamp" | "fallback";

export interface FormatRelativeAgeOptions {
  /** Text returned for a missing, non-finite, or rejected negative age. */
  readonly fallback?: string | undefined;
  /**
   * BCP 47 locale or list. An unsupported or malformed value falls back to the
   * runtime default locale instead of throwing.
   */
  readonly locale?: string | readonly string[] | undefined;
  /**
   * How an age below zero renders. Clock skew between the Signal K server and
   * the browser makes the freshest sample slightly negative, so `"clamp"`, the
   * default, treats ages down to minus 60 seconds as zero. Larger negative
   * ages, and every negative age under `"fallback"`, return `fallback`.
   */
  readonly negative?: RelativeAgeNegative | undefined;
  readonly numeric?: Intl.RelativeTimeFormatNumeric | undefined;
  readonly style?: Intl.RelativeTimeFormatStyle | undefined;
}

/** The compact rendering ("5m ago") that was the default before 0.9.0. */
export const RELATIVE_AGE_NARROW = {
  numeric: "always",
  style: "narrow",
} as const satisfies FormatRelativeAgeOptions;

/** Skew this large still reads as "now" under `negative: "clamp"`. */
const NEGATIVE_TOLERANCE_MS = 60_000;

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

/**
 * A month is one twelfth of a year here, so twelve rounded months promote to
 * one year instead of stalling at "12 months ago".
 */
const RELATIVE_UNITS = [
  ["year", SECONDS_PER_YEAR],
  ["month", SECONDS_PER_YEAR / 12],
  ["week", 7 * SECONDS_PER_DAY],
  ["day", SECONDS_PER_DAY],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
] as const satisfies readonly (readonly [
  Intl.RelativeTimeFormatUnit,
  number,
])[];

const FORMATTER_CACHE_LIMIT = 32;
const formatters = new Map<string, Intl.RelativeTimeFormat>();

function getFormatter(
  locale: string | readonly string[] | undefined,
  options: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  const locales =
    locale === undefined
      ? undefined
      : typeof locale === "string"
        ? [locale]
        : [...locale];
  // Concatenated rather than serialized: this runs on every render of every
  // relative age on screen, and the default path has no locale at all.
  const key = `${locales?.join(",") ?? ""}\u0000${options.numeric ?? ""}\u0000${options.style ?? ""}`;
  const cached = formatters.get(key);
  if (cached !== undefined) return cached;

  let formatter: Intl.RelativeTimeFormat;
  try {
    formatter = new Intl.RelativeTimeFormat(locales, options);
  } catch (error) {
    // A malformed or unsupported locale tag is data, often from a host
    // setting, so it degrades to the runtime default rather than breaking a
    // render. Anything else is a real failure and propagates.
    if (!(error instanceof RangeError)) throw error;
    formatter = new Intl.RelativeTimeFormat(undefined, options);
  }
  if (formatters.size >= FORMATTER_CACHE_LIMIT) formatters.clear();
  formatters.set(key, formatter);
  return formatter;
}

/**
 * Formats an elapsed age in milliseconds with deterministic unit thresholds.
 * Values are ages in the past. The largest unit the age reaches is used, and
 * a value that rounds up to the next unit is promoted, so 59.5 seconds reads
 * as one minute rather than sixty seconds.
 */
export function formatRelativeAge(
  ageMs: number | null | undefined,
  {
    fallback = "unknown",
    locale,
    negative = "clamp",
    numeric = "auto",
    style = "long",
  }: FormatRelativeAgeOptions = {},
): string {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(ageMs)) {
    return fallback;
  }
  let age = ageMs;
  if (age < 0) {
    if (negative === "fallback" || age < -NEGATIVE_TOLERANCE_MS) {
      return fallback;
    }
    age = 0;
  }

  const ageSeconds = age / 1_000;
  let unitIndex = RELATIVE_UNITS.findIndex(
    ([, seconds]) => ageSeconds >= seconds,
  );
  if (unitIndex < 0) unitIndex = RELATIVE_UNITS.length - 1;

  while (unitIndex > 0) {
    const unit = RELATIVE_UNITS[unitIndex];
    const largerUnit = RELATIVE_UNITS[unitIndex - 1];
    if (unit === undefined || largerUnit === undefined) break;
    if (Math.round(ageSeconds / unit[1]) * unit[1] < largerUnit[1]) break;
    unitIndex -= 1;
  }

  const selected = RELATIVE_UNITS[unitIndex];
  if (selected === undefined) return fallback;
  const formatter = getFormatter(locale, { numeric, style });
  return formatter.format(-Math.round(ageSeconds / selected[1]), selected[0]);
}

/** A point in time: epoch milliseconds, a `Date`, or a parseable timestamp string. */
export type RelativeAgeTimestamp = number | string | Date;

/** Epoch milliseconds for a timestamp, or NaN when it cannot be read. */
export function timestampToMs(
  timestamp: RelativeAgeTimestamp | null | undefined,
): number {
  if (timestamp === null || timestamp === undefined) return Number.NaN;
  if (typeof timestamp === "number") return timestamp;
  if (typeof timestamp === "string") return Date.parse(timestamp);
  return timestamp.getTime();
}

/**
 * Formats the age of a timestamp relative to `nowMs`. Signal K deltas carry
 * ISO timestamps, so strings and dates are accepted beside epoch milliseconds.
 */
export function formatRelativeAgeSince(
  timestamp: RelativeAgeTimestamp | null | undefined,
  nowMs: number,
  options?: FormatRelativeAgeOptions,
): string {
  const timestampMs = timestampToMs(timestamp);
  return formatRelativeAge(
    Number.isFinite(timestampMs) ? nowMs - timestampMs : undefined,
    options,
  );
}
