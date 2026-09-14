import { useEffect, useState } from "react";

import type { RelativeAgeTimestamp } from "../utils/format-relative-age.js";
import { type Freshness, resolveFreshness } from "../utils/freshness.js";
import {
  DEFAULT_CLOCK_TICK_MS,
  subscribeToClock,
} from "../utils/shared-clock.js";

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
  { staleAfterMs, tickMs = DEFAULT_CLOCK_TICK_MS }: PollFreshnessOptions,
): PollFreshness {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // A cadence that is not a positive finite number does not tick at all;
  // subscribeToClock owns that rule for every reader of the shared clock.
  useEffect(() => subscribeToClock(tickMs, setNowMs), [tickMs]);

  return { ...resolveFreshness(lastUpdated, nowMs, staleAfterMs), nowMs };
}
