import {
  NEGATIVE_TOLERANCE_MS,
  type RelativeAgeTimestamp,
  timestampToMs,
} from "./format-relative-age.js";

/** How old the last sample is, and whether that is too old. */
export interface Freshness {
  /**
   * Age of the last sample in milliseconds, or undefined when there is none
   * or it cannot be stated: a sample stamped more than a minute in the
   * browser's future has no age a reader could trust.
   */
  readonly ageMs: number | undefined;
  /** Whether the last sample is older than the threshold, or untrustworthy. */
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
 * Measure liveness from the moment the browser received the sample, and keep
 * a Signal K `timestamp` for saying how old the source claims the value is:
 * the server's clock and the browser's are independent. A watched path's
 * `meta.timeout`, in seconds, times 1,000 is the natural `staleAfterMs`.
 *
 * Clock skew follows the rule `formatRelativeAge` follows, so a paired
 * `RelativeAge` and this flag agree. A sample up to a minute in the future
 * reads as age zero, because the freshest sample from a slightly fast server
 * lands there. Beyond that the age is unknown, and with a threshold set the
 * sample counts as stale: a reading that could not go stale until the
 * browser's clock caught up is the failure this exists to catch. With no
 * sample at all there is no age and nothing has gone stale yet: a panel that
 * has not polled once reports that through its own loading state.
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

  const thresholdSet = staleAfterMs > 0;
  const signedAgeMs = nowMs - lastUpdatedMs;
  if (signedAgeMs < -NEGATIVE_TOLERANCE_MS) {
    return { ageMs: undefined, stale: thresholdSet };
  }

  const ageMs = Math.max(0, signedAgeMs);
  return { ageMs, stale: thresholdSet && ageMs > staleAfterMs };
}
