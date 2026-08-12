export interface FormatRelativeAgeOptions {
  /** Text returned for a missing, non-finite, or negative age. */
  readonly fallback?: string | undefined;
  readonly locale?: string | readonly string[] | undefined;
  readonly numeric?: Intl.RelativeTimeFormatNumeric | undefined;
  readonly style?: Intl.RelativeTimeFormatStyle | undefined;
}

const RELATIVE_UNITS = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
] as const satisfies readonly (readonly [
  Intl.RelativeTimeFormatUnit,
  number,
])[];

/**
 * Formats an elapsed age in milliseconds with deterministic unit thresholds.
 * Values are always ages in the past; callers with timestamps should compute
 * and clamp their age at the data boundary.
 */
export function formatRelativeAge(
  ageMs: number | null | undefined,
  {
    fallback = "unknown",
    locale,
    numeric = "always",
    style = "narrow",
  }: FormatRelativeAgeOptions = {},
): string {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(ageMs)) {
    return fallback;
  }
  if (ageMs < 0) return fallback;

  const ageSeconds = ageMs / 1_000;
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
  const formatter = new Intl.RelativeTimeFormat(
    locale === undefined
      ? undefined
      : [...(typeof locale === "string" ? [locale] : locale)],
    { numeric, style },
  );
  return formatter.format(-Math.round(ageSeconds / selected[1]), selected[0]);
}
