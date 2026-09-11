import {
  createElement,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type LiveRegionElement = "div" | "span" | "p";

/**
 * The blank beat between a repeat announcement and its message. A screen
 * reader compares the region against the text it last read, so text cleared
 * and restored inside one of its processing ticks reads as no change at all,
 * and nothing is spoken. A tenth of a second clears every tick this package
 * targets while staying under what a listener would notice as a delay.
 */
const REPEAT_BLANK_MS = 100;

export interface LiveRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-live" | "children"> {
  /**
   * Change it to announce `message` again, the same words twice in a row
   * included. Any value that differs from the last one does: the count of
   * presses, or the id of the event that produced the message.
   */
  readonly announceKey?: string | number | undefined;
  readonly as?: LiveRegionElement | undefined;
  /** Announcement mode; exactly one of `role` or `aria-live` is emitted. */
  readonly live?: AnnouncementMode | undefined;
  /** The text to announce. The region stays mounted while this is empty. */
  readonly message?: ReactNode | undefined;
  readonly ref?: React.Ref<HTMLElement> | undefined;
}

/**
 * A visually hidden announcer for state changes that no visible control owns,
 * such as "3 paths detected" after a scan. Render it once, before the first
 * message, and update `message`: screen readers only observe a live region
 * that already existed when its text changed. Repeating a message it already
 * carries changes nothing in the DOM and is therefore silent, so pass an
 * `announceKey` that changes per announcement and the region re-announces the
 * same words for you. Reserve `"assertive"` for errors that must interrupt.
 */
export function LiveRegion({
  announceKey,
  as = "div",
  className,
  live = "polite",
  message,
  role: suppliedRole,
  ...props
}: LiveRegionProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  const [announcedKey, setAnnouncedKey] = useState(announceKey);
  // A region carrying only aria-live="off" speaks for nobody, so there is
  // nothing to re-announce there.
  const silent = region.role === undefined && region["aria-live"] === "off";
  // The message is withheld for one beat so the region really empties before
  // it fills again. An empty message has nothing to re-announce, so it goes
  // straight through and no timer runs.
  const repeating =
    announceKey !== announcedKey && hasReactContent(message) && !silent;

  useEffect(() => {
    if (!repeating) return undefined;
    const timer = setTimeout(() => {
      setAnnouncedKey(announceKey);
    }, REPEAT_BLANK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [announceKey, repeating]);

  // The caller's ref travels inside the rest props, as React 19 allows.
  return createElement(
    as,
    {
      ...props,
      className: classNames("snui-visually-hidden", className),
      role: region.role,
      "aria-live": region["aria-live"],
    },
    repeating ? null : message,
  );
}
