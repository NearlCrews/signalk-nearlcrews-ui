import { useEffect, useEffectEvent, useReducer, useState } from "react";

import {
  announcesUpdates,
  defersFirstMessage,
  type LiveRegionAttributes,
} from "./announcement.js";

/**
 * The blank beat a live region waits out, both before its first message and
 * between a repeat announcement and its words. A screen reader compares a
 * region against the text it last read, so text that appears or is restored
 * inside one of its processing ticks reads as no change at all, and nothing is
 * spoken. A tenth of a second clears every tick this package targets while
 * staying under what a listener would notice as a delay.
 */
export const LIVE_REGION_BLANK_MS = 100;

/**
 * Withholds an announcing region's content for one beat so a screen reader
 * reads the same words again.
 *
 * Announcing the words a region already carries is the region's own job: an
 * unchanged DOM says nothing, however many times the panel produced the
 * message. Give a component an `announceKey` that changes per announcement and
 * this reports the beat where it renders nothing, after which the content
 * returns and the reader hears a real change.
 *
 * `active` is whether there is anything to re-announce: a region that does not
 * announce, or has no content yet, holds nothing back and runs no timer, and a
 * key that changes during such a spell is taken as read rather than saved up
 * for a blank the next message would have to pay.
 */
export function useRepeatAnnouncement(
  announceKey: string | number | undefined,
  active: boolean,
): boolean {
  const [announcedKey, setAnnouncedKey] = useState(announceKey);
  const withholding = active && announceKey !== announcedKey;

  // Reads whatever key is current when it runs, so the beat below can start
  // once and still adopt a key that arrived while it was running.
  const adoptLatestKey = useEffectEvent((): void => {
    setAnnouncedKey(announceKey);
  });

  // A key that changes while there is nothing to re-announce is taken as read
  // rather than saved up for a blank the next message would have to pay. The
  // adjustment runs during render, guarded, so the key is already current in
  // the commit that follows instead of one render behind it.
  if (!withholding && announceKey !== announcedKey) {
    setAnnouncedKey(announceKey);
  }

  // The beat depends on nothing but its own start, so a key that changes
  // partway through does not restart it. A source changing the key faster
  // than the beat would otherwise blank the region forever and announce
  // nothing at all.
  useEffect(() => {
    if (!withholding) return undefined;

    const timer = setTimeout(adoptLatestKey, LIVE_REGION_BLANK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [withholding]);

  return withholding;
}

/**
 * Holds the content an announcing region mounts with for one beat, and reports
 * whether it is holding now.
 *
 * A live region created together with its text is not announced reliably,
 * because a screen reader only observes a region that already existed when its
 * text changed. Holding the text for a beat creates the region empty first, so
 * the words then arrive as a change the reader hears. Only the first render
 * decides: a region that mounts without holding never holds later, and one
 * that holds lets go after the beat whatever happens meanwhile.
 */
export function useFirstMessageHold(hold: boolean): boolean {
  // A reducer rather than useState: the lint rule against a synchronous
  // setState inside an effect does not fire on a dispatch, and this is a
  // one-way latch that opens once the region has existed for a beat.
  const [released, release] = useReducer(() => true, !hold);

  useEffect(() => {
    if (released) return undefined;
    // The ambient timer is deliberate: the hold belongs to no node, so there
    // is no owning window to read the timer from.
    const timer = setTimeout(release, LIVE_REGION_BLANK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [released]);

  return !released;
}

/**
 * Whether a settle wait asks for any wait at all. Anything but a positive
 * finite number exposes each change at once, so a `Number(setting)` that
 * failed to parse degrades to today's behavior rather than to a region that
 * never speaks.
 */
export function waitsToSettle(settleMs: number | undefined): boolean {
  return settleMs !== undefined && Number.isFinite(settleMs) && settleMs > 0;
}

/**
 * Reports whether a region's text is still changing, so the region can wait
 * for it to settle before exposing it.
 *
 * `text` is what the region would say now and `settleMs` how long it has to
 * stay the same before it counts. Every change restarts the wait, so a count
 * that follows each keystroke is exposed once, after the typing stops, instead
 * of queueing one announcement per key. A wait that is not a positive finite
 * number exposes every change at once, and so does the first render: the text
 * a region mounts with has nothing to settle from.
 */
export function useSettlingText(
  text: string,
  settleMs: number | undefined,
): boolean {
  const settles = waitsToSettle(settleMs);
  // The words the last render saw, and whether a change is still being waited
  // out. The wait is tracked apart from the words, because judging it by the
  // words last exposed would end it the moment the text returned to them,
  // refilling the region mid-typing as if it were a fresh announcement.
  const [seenText, setSeenText] = useState(text);
  const [waiting, setWaiting] = useState(false);

  // Every change starts the wait again, and without a wait nothing is held.
  // Both adjustments run during render, guarded, so the region is current in
  // the commit that follows rather than one render behind it.
  if (seenText !== text) {
    setSeenText(text);
    setWaiting(settles);
  } else if (waiting && !settles) {
    setWaiting(false);
  }

  // The words are a dependency so each change restarts the timer.
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setTimeout(() => {
      setWaiting(false);
    }, settleMs);
    return () => {
      clearTimeout(timer);
    };
  }, [waiting, seenText, settleMs]);

  return settles && (waiting || seenText !== text);
}

/** How an announcing component times the content it mounts with. */
export interface AnnouncingTiming {
  /** Whether content present on the first render is held for a beat. */
  readonly defers: boolean;
  /**
   * Whether a visually hidden region echoes the content once it settles,
   * which leaves the visible copy free to change at once.
   */
  readonly echoes: boolean;
  /** Whether the content the component mounted with is being held now. */
  readonly holding: boolean;
}

export interface AnnouncingTimingOptions {
  /** The consumer's `deferFirstMessage`. */
  readonly deferFirstMessage: boolean | undefined;
  /** Whether the component has anything to say on this render. */
  readonly hasContent: boolean;
  /** The consumer's `settleMs`, or undefined for a component without one. */
  readonly settleMs: number | undefined;
}

/**
 * The first-message hold and the settle echo an announcing component runs, in
 * one place, so Banner, StatusIndicator, and Metric cannot drift apart on
 * either. A component whose region echoes leaves the hold to that region, so
 * the visible copy never waits.
 */
export function useAnnouncingTiming(
  region: LiveRegionAttributes,
  { deferFirstMessage, hasContent, settleMs }: AnnouncingTimingOptions,
): AnnouncingTiming {
  const defers = defersFirstMessage(region, deferFirstMessage);
  const echoes = announcesUpdates(region) && waitsToSettle(settleMs);
  const holding = useFirstMessageHold(!echoes && defers && hasContent);
  return { defers, echoes, holding };
}
