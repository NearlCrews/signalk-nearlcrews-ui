import {
  type RelativeAgeTimestamp,
  timestampToMs,
} from "./format-relative-age.js";

/** How old the last sample is, and whether that is too old. */
export interface Freshness {
  /** Age of the last sample in milliseconds, or undefined when there is none. */
  readonly ageMs: number | undefined;
  /** Whether the last sample is older than the threshold. */
  readonly stale: boolean;
}

/**
 * Derives the age and the staleness of a polled value from one threshold.
 *
 * A panel that polls a plugin decides freshness twice over: how old the last
 * good sample is, and whether that age has passed the point where the reading
 * should no longer be trusted. Both come from the same subtraction, so a
 * consumer states its poll interval once instead of writing one rule beside
 * the timestamp and a different one beside the indicator.
 *
 * A negative age reads as zero, because clock skew between the Signal K
 * server and the browser makes the freshest sample slightly negative and a
 * sample from the future is not stale. With no sample at all there is no age
 * and nothing has gone stale yet: a panel that has not polled once reports
 * that through its own loading state, not through this.
 */
export function resolveFreshness(
  lastUpdated: RelativeAgeTimestamp | null | undefined,
  nowMs: number,
  staleAfterMs: number,
): Freshness {
  const lastUpdatedMs = timestampToMs(lastUpdated);
  if (!Number.isFinite(lastUpdatedMs)) {
    return { ageMs: undefined, stale: false };
  }

  const ageMs = Math.max(0, nowMs - lastUpdatedMs);
  return { ageMs, stale: staleAfterMs > 0 && ageMs > staleAfterMs };
}
