import { useEffect, useEffectEvent, useState } from "react";

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
