import type { HTMLAttributes, ReactNode, RefAttributes } from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import type { StatusTone } from "../utils/tone.js";
import { ToneMark } from "./ToneMark.js";


export type StatusIndicatorSize = "default" | "compact";

export interface StatusIndicatorProps
  extends HTMLAttributes<HTMLSpanElement>,
    RefAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
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
      <span className="snui-status__dot" aria-hidden="true" />
      <ToneMark tone={tone} toneLabel={toneLabel} />
      <span
        className={
          size === "compact" ? "snui-visually-hidden" : "snui-status__text"
        }
      >
        {children}
      </span>
    </span>
  );
}
