import type { HTMLAttributes, ReactNode, RefAttributes } from "react";

import {
  type AnnouncementMode,
  announcesUpdates,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { createPolymorphicElement } from "../utils/polymorphic.js";
import { hasReactContent, reactNodeText } from "../utils/react-node.js";
import {
  useFirstMessageHold,
  useRepeatAnnouncement,
  useSettlingText,
  waitsToSettle,
} from "../utils/repeat-announcement.js";

export type LiveRegionElement = "div" | "span" | "p";

export interface LiveRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-live" | "children">,
    RefAttributes<HTMLElement> {
  /**
   * Change it to announce `message` again, the same words twice in a row
   * included. Any value that differs from the last one does: the count of
   * presses, or the id of the event that produced the message.
   */
  readonly announceKey?: string | number | undefined;
  readonly as?: LiveRegionElement | undefined;
  /**
   * Holds a message present on the first render for one beat, so the region
   * exists empty before its text arrives and the announcement is observed
   * rather than missed. Set it where the region mounts together with its
   * subject, a panel switching to a mode that renders both. Defaults to false,
   * which renders the first message at once: right for a region mounted with
   * the panel, before anything has happened, whose first message arrives
   * later.
   */
  readonly deferFirstMessage?: boolean | undefined;
  /**
   * Announcement mode. Defaults to `"polite"` here, because the component
   * exists to announce; the components that only sometimes announce, `Banner`,
   * `StatusIndicator`, and `Metric`, default to `"off"` instead. A role and
   * `aria-live` are not both emitted for a role that already announces.
   */
  readonly live?: AnnouncementMode | undefined;
  /** The text to announce. The region stays mounted while this is empty. */
  readonly message?: ReactNode | undefined;
  /**
   * Milliseconds a changed message has to stay the same before the region
   * exposes it. Each change restarts the wait, so a result count that follows
   * every keystroke is announced once, after the typing stops, rather than
   * once per key. The region is empty while it waits, and the message it
   * mounts with is exposed at once. Change is measured on the message's text,
   * so a message made only of components that render their own text never
   * waits. Unset, or anything but a positive number, exposes every change at
   * once.
   */
  readonly settleMs?: number | undefined;
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
  as = "div",
  className,
  deferFirstMessage = false,
  live = "polite",
  message,
  role: suppliedRole,
  settleMs,
  ...props
}: LiveRegionProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  // A region that announces nothing speaks for nobody, so there is nothing to
  // re-announce, hold back, or wait for there.
  const announcing = announcesUpdates(region);
  const holding = useFirstMessageHold(announcing && deferFirstMessage);
  // The text is read only when a wait was asked for, because walking the
  // message costs a render nothing otherwise.
  const settles = announcing && waitsToSettle(settleMs);
  const settling = useSettlingText(
    settles ? reactNodeText(message) : "",
    settles ? settleMs : undefined,
  );
  // The message is withheld for one beat so the region really empties before
  // it fills again. An empty message has nothing to re-announce, so it goes
  // straight through and no timer runs.
  const repeating = useRepeatAnnouncement(
    announceKey,
    announcing && hasReactContent(message),
  );

  return createPolymorphicElement(
    as,
    {
      ...props,
      className: classNames("snui-visually-hidden", className),
      role: region.role,
      "aria-live": region["aria-live"],
    },
    repeating || holding || settling ? null : message,
  );
}
