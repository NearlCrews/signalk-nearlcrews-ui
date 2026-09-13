import { useEffect, useState } from "react";

import type { RelativeAgeTimestamp } from "../utils/format-relative-age.js";
import { type Freshness, resolveFreshness } from "../utils/freshness.js";
import { subscribeToClock } from "../utils/shared-clock.js";

/** Default interval between freshness re-reads, matching `RelativeAge`. */
const DEFAULT_TICK_MS = 10_000;

export interface PollFreshnessOptions {
  /** Age at which the last sample stops counting as current. */
  readonly staleAfterMs: number;
  /** Milliseconds between re-reads; 0 stops the clock. */
  readonly tickMs?: number | undefined;
}

export interface PollFreshness extends Freshness {
  /** The instant the age was measured against, for a paired `RelativeAge`. */
  readonly nowMs: number;
}

/**
 * Keeps the age and the staleness of a polled value current.
 *
 * A panel states its poll interval once and gets both, instead of pairing a
 * timestamp with a threshold rule written somewhere else. The clock is shared
 * with every other reader of the same cadence and is read in an effect, never
 * during render, so a render stays pure and StrictMode replays agree.
 */
export function usePollFreshness(
  lastUpdated: RelativeAgeTimestamp | null | undefined,
  { staleAfterMs, tickMs = DEFAULT_TICK_MS }: PollFreshnessOptions,
): PollFreshness {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (tickMs <= 0) return undefined;
    return subscribeToClock(tickMs, setNowMs);
  }, [tickMs]);

  return { ...resolveFreshness(lastUpdated, nowMs, staleAfterMs), nowMs };
}
