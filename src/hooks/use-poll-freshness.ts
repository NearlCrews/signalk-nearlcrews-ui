import {
  type RelativeAgeTimestamp,
  timestampToMs,
} from "../utils/format-relative-age.js";
import { type Freshness, resolveFreshness } from "../utils/freshness.js";
import { DEFAULT_CLOCK_TICK_MS } from "../utils/shared-clock.js";
import { useClockReading } from "./use-clock-reading.js";

export interface PollFreshnessOptions {
  /** Age at which the last sample stops counting as current. */
  readonly staleAfterMs: number;
  /**
   * Milliseconds between re-reads of the age. 0 stops the clock and the stale
   * flag with it: the age and the flag are measured when a sample arrives and
   * not again until the next one.
   */
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
 * timestamp with a threshold rule written somewhere else. The age refreshes on
 * the shared clock every `tickMs`; the stale flag does not wait for it, and
 * turns the moment the threshold passes, because it is what tells an operator
 * the numbers on screen have stopped moving. A new sample is measured against
 * the clock read as it arrives, in the render that first sees it, so a sample
 * stamped at receipt reads as current however long the panel has been open,
 * even between long ticks or while the document is hidden and the clock
 * paused. Every other render reuses a stored reading, so it stays pure and
 * StrictMode replays agree.
 */
export function usePollFreshness(
  lastUpdated: RelativeAgeTimestamp | null | undefined,
  { staleAfterMs, tickMs = DEFAULT_CLOCK_TICK_MS }: PollFreshnessOptions,
): PollFreshness {
  const lastUpdatedMs = timestampToMs(lastUpdated);
  // The instant the sample crosses the threshold, when there is one to cross.
  const nowMs = useClockReading(lastUpdatedMs, tickMs, {
    wakeAtMs: staleAfterMs > 0 ? lastUpdatedMs + staleAfterMs : Number.NaN,
  });

  return { ...resolveFreshness(lastUpdatedMs, nowMs, staleAfterMs), nowMs };
}
