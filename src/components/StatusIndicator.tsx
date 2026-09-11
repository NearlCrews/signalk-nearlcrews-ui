import type { HTMLAttributes, ReactNode, RefAttributes } from "react";

import {
  type AnnouncementMode,
  announcesUpdates,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import { ToneMark } from "./ToneMark.js";

export type StatusIndicatorSize = "default" | "compact";

export interface StatusIndicatorProps
  extends HTMLAttributes<HTMLSpanElement>,
    RefAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  /**
   * Announces the indicator's own updates. Render the indicator whenever the
   * panel can produce a status and let its content go empty, rather than
   * mounting it beside the first message; an empty announcing indicator
   * renders as a shell that occupies no space.
   */
  readonly live?: AnnouncementMode | undefined;
  /**
   * `"compact"` shows the dot and glyph only, for chips and dense grids. The
   * text stays in the accessibility tree as the indicator's name.
   */
  readonly size?: StatusIndicatorSize | undefined;
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

/**
 * A status dot beside its text. The dot carries a per-tone shape and the
 * semantic tones add the shared glyph, so info and neutral differ without
 * color. A blank `toneLabel` falls back to the default tone name, as it does
 * on every other tone-badged component.
 */
export function StatusIndicator({
  children,
  className,
  live,
  ref,
  role: suppliedRole,
  size = "default",
  tone = "neutral",
  toneLabel,
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  // An announcing indicator keeps its region mounted so a screen reader
  // observes it before the first status arrives. With nothing to report it
  // renders as an empty shell, which the stylesheet takes out of the flow, so
  // no dot or glyph stands where there is no status yet.
  const silent = announcesUpdates(region) && !hasReactContent(children);

  return (
    <span
      {...props}
      ref={ref}
      className={classNames(
        "snui-status",
        `snui-status--${tone}`,
        `snui-status--size-${size}`,
        className,
      )}
      role={region.role}
      aria-live={region["aria-live"]}
    >
      {silent ? null : (
        <>
          <span className="snui-status__dot" aria-hidden="true" />
          <ToneMark tone={tone} toneLabel={toneLabel} />
          <span
            className={
              size === "compact" ? "snui-visually-hidden" : "snui-status__text"
            }
          >
            {children}
          </span>
        </>
      )}
    </span>
  );
}
