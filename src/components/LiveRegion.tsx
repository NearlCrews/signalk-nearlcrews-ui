import { createElement, type HTMLAttributes, type ReactNode } from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";

export type LiveRegionElement = "div" | "span" | "p";

export interface LiveRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-live" | "children"> {
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
 * that already existed when its text changed. Reserve `"assertive"` for
 * errors that must interrupt.
 */
export function LiveRegion({
  as = "div",
  className,
  live = "polite",
  message,
  role: suppliedRole,
  ...props
}: LiveRegionProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  // The caller's ref travels inside the rest props, as React 19 allows.
  return createElement(
    as,
    {
      ...props,
      className: classNames("snui-visually-hidden", className),
      role: region.role,
      "aria-live": region["aria-live"],
    },
    message,
  );
}
