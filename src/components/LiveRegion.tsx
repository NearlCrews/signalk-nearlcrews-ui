import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useReducer,
} from "react";

import {
  type AnnouncementMode,
  announcesUpdates,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { createPolymorphicElement } from "../utils/polymorphic.js";
import { hasReactContent } from "../utils/react-node.js";
import { useRepeatAnnouncement } from "../utils/repeat-announcement.js";

export type LiveRegionElement = "div" | "span" | "p";

/**
 * The blank beat a freshly mounted region waits out before it says anything.
 * A screen reader compares the region against the text it last read, so text
 * that appears inside one of its processing ticks reads as no change at all,
 * and nothing is spoken. The repeat beat is the same length and lives in
 * `useRepeatAnnouncement`, which every announcing component shares.
 */
const MOUNT_BLANK_MS = 100;

export interface LiveRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-live" | "children">,
    RefAttributes<HTMLElement> {
  /**
   * Change it to announce `message` again, the same words twice in a row
   * included. Any value that differs from the last one does: the count of
   * presses, or the id of the event that produced the message.
   */
  readonly announceKey?: string | number | undefined;
  /**
   * Whether a message already present on the first render is announced.
   * Defaults to true. Set it to false where the region mounts together with
   * its subject, a panel switching to a mode that renders both, so the region
   * empties for a beat first and the announcement is observed rather than
   * missed.
   */
  readonly announceOnMount?: boolean | undefined;
  readonly as?: LiveRegionElement | undefined;
  /**
   * Announcement mode. Defaults to `"polite"` here, because the component
   * exists to announce; the components that only sometimes announce, `Banner`,
   * `StatusIndicator`, and `Metric`, default to `"off"` instead. A role and
   * `aria-live` are not both emitted for a role that already announces.
   */
  readonly live?: AnnouncementMode | undefined;
  /** The text to announce. The region stays mounted while this is empty. */
  readonly message?: ReactNode | undefined;
}

/**
 * A visually hidden announcer for state changes that no visible control owns,
 * such as "3 paths detected" after a scan. Render it once, before the first
 * message, and update `message`: screen readers only observe a live region
 * that already existed when its text changed. Repeating a message it already
 * carries changes nothing in the DOM and is therefore silent, so pass an
 * `announceKey` that changes per announcement and the region re-announces the
 * same words for you. Reserve `"assertive"` for errors that must interrupt.
 *
 * The rule that hides the text lives in the root sheet, so a region rendered
 * outside a `PanelRoot` renders its announcements as visible text.
 */
export function LiveRegion({
  announceKey,
  announceOnMount = true,
  as = "div",
  className,
  live = "polite",
  message,
  role: suppliedRole,
  ...props
}: LiveRegionProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  // A reducer rather than useState: the lint rule against a synchronous
  // setState inside an effect does not fire on a dispatch, and this is a
  // one-way latch that opens once the region has existed for a beat.
  const [settled, markSettled] = useReducer(() => true, announceOnMount);
  // A region that announces nothing speaks for nobody, so there is nothing to
  // re-announce and nothing to hold back there.
  const silent = !announcesUpdates(region);
  // The message is withheld for one beat so the region really empties before
  // it fills again. An empty message has nothing to re-announce, so it goes
  // straight through and no timer runs.
  const repeating = useRepeatAnnouncement(
    announceKey,
    hasReactContent(message) && !silent,
  );
  const withheld = !settled && !silent;

  useEffect(() => {
    if (settled) return undefined;
    // The ambient timer is deliberate: this component owns no node, so there
    // is no owning window to read the timer from.
    const timer = setTimeout(markSettled, MOUNT_BLANK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [settled]);

  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames("snui-visually-hidden", className),
      role: region.role,
      "aria-live": region["aria-live"],
    },
    repeating || withheld ? null : message,
  );
}
