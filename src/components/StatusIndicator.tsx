import type { HTMLAttributes, ReactNode, RefAttributes } from "react";

import {
  type AnnouncementMode,
  resolveAnnouncingRegion,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import { useRepeatAnnouncement } from "../utils/repeat-announcement.js";
import type { StatusTone } from "../utils/tone.js";
import type { Density } from "../utils/variants.js";
import { ToneMark } from "./ToneMark.js";

/** Alias of the shared {@link Density} vocabulary. */
export type StatusIndicatorSize = Density;

export interface StatusIndicatorProps
  extends HTMLAttributes<HTMLSpanElement>,
    RefAttributes<HTMLSpanElement> {
  /**
   * Change it to announce the current status again, the same words twice in a
   * row included: a screen reader compares a live region against the text it
   * last read, so repeating a status says nothing on its own. The press count,
   * or the id of the event that produced the status, does. The indicator
   * withholds its content for a tenth of a second and restores it, which is
   * visible as a brief blank, so pass a key only where a repeat matters.
   * Meaningful only on an announcing indicator.
   */
  readonly announceKey?: string | number | undefined;
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
  announceKey,
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
  // An announcing indicator keeps its region mounted so a screen reader
  // observes it before the first status arrives. With nothing to report it
  // renders as an empty shell, which the stylesheet takes out of the flow, so
  // no dot or glyph stands where there is no status yet.
  const { announcing, attributes, silent } = resolveAnnouncingRegion(
    live,
    suppliedRole,
    hasReactContent(children),
  );
  // A repeat empties the same shell for a beat, so the reader hears a change
  // where the words alone would have looked identical.
  const withholding = useRepeatAnnouncement(announceKey, announcing && !silent);

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
      role={attributes.role}
      aria-live={attributes["aria-live"]}
    >
      {silent || withholding ? null : (
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
