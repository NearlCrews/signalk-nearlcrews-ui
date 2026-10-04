import { useEffect, useEffectEvent, useState } from "react";

import {
  isTimerDelay,
  MAX_TIMER_DELAY_MS,
  subscribeToClock,
} from "../utils/shared-clock.js";

/** A clock reading and the moment it was taken for. */
interface ClockReading {
  readonly momentMs: number;
  readonly nowMs: number;
}

export interface ClockReadingOptions {
  /**
   * Whether a tick's reading changes anything the caller renders, given the
   * candidate reading and the one in use. A tick it answers false for commits
   * no render, which is how a settled "3 hours ago" stays put. Unset, every
   * tick commits.
   */
  readonly changes?:
    | ((candidateMs: number, currentMs: number) => boolean)
    | undefined;
  /**
   * An instant the caller needs a reading just after, such as the moment a
   * sample crosses its stale threshold. One timer waits for it while the
   * clock ticks, so the answer does not wait for the next tick.
   */
  readonly wakeAtMs?: number | undefined;
}

/**
 * The shared clock as read by something measuring one moment, such as the
 * time a sample arrived: every `tickMs`, just after `wakeAtMs`, and at once
 * when the moment changes.
 *
 * The last point is the one that matters. A reading only moves when a tick
 * changes something, so it can be minutes old, and a new sample stamped at
 * receipt measured against it would sit that far in the future, past the
 * minute of skew tolerated, and read as stale or of unknown age. The reading
 * is therefore taken in the render that first sees the new moment, so no
 * commit ever measures the moment against an older one: a later correction
 * would come too late for an effect that already acted on the first commit,
 * such as a note announcing a turn to stale. That render reads the clock
 * once per moment and stores it, so every later render of the same moment is
 * pure and a StrictMode replay agrees. `tickMs` of 0, or any cadence no timer
 * can wait, stops the ticks and the wake, and the moment is still measured
 * when it arrives. A moment that is not a finite number subscribes to nothing.
 */
export function useClockReading(
  momentMs: number,
  tickMs: number,
  { changes, wakeAtMs }: ClockReadingOptions = {},
): number {
  const [reading, setReading] = useState<ClockReading>(() => ({
    momentMs,
    nowMs: Date.now(),
  }));

  let current = reading;
  // Object.is, so an absent moment (NaN) equals itself and reads nothing.
  if (!Object.is(reading.momentMs, momentMs)) {
    // Read once per new moment and stored, the adjustment React documents for
    // state that follows a prop: the renders after it see the stored reading.
    // eslint-disable-next-line react-hooks/purity -- the one read per moment described above
    current = { momentMs, nowMs: Date.now() };
    setReading(current);
  }
  const { nowMs } = current;

  const adopt = useEffectEvent((candidateMs: number): void => {
    if (changes !== undefined && !changes(candidateMs, nowMs)) return;
    setReading((previous) => ({ ...previous, nowMs: candidateMs }));
  });

  // A cadence no timer can wait does not tick at all; subscribeToClock owns
  // that rule for every reader of the shared clock.
  const measures = Number.isFinite(momentMs);
  useEffect(() => {
    if (!measures) return undefined;
    return subscribeToClock(tickMs, adopt);
  }, [measures, tickMs]);

  // One timer for the instant rather than a faster clock for everyone. The
  // clock is read a millisecond after it, so a strict comparison sees it
  // passed. A timer that fires early, or a wait longer than one timer holds,
  // leaves a reading short of the instant, which runs this again for the rest.
  const clockRuns = isTimerDelay(tickMs);
  const wakeMs =
    clockRuns &&
    measures &&
    wakeAtMs !== undefined &&
    Number.isFinite(wakeAtMs) &&
    wakeAtMs >= nowMs
      ? wakeAtMs
      : Number.NaN;
  useEffect(() => {
    if (!Number.isFinite(wakeMs)) return undefined;
    const delayMs = Math.min(
      MAX_TIMER_DELAY_MS,
      Math.max(0, wakeMs - Date.now()) + 1,
    );
    const timer = setTimeout(() => {
      setReading((previous) => ({ ...previous, nowMs: Date.now() }));
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [nowMs, wakeMs]);

  return nowMs;
}
