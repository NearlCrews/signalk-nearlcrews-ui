import type { HTMLAttributes, ReactNode } from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import {
  isSemanticTone,
  resolveToneLabel,
  type StatusTone,
} from "../utils/tone.js";
import { ToneAnnouncement } from "./ToneAnnouncement.js";

export type { StatusTone };

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly live?: AnnouncementMode | undefined;
  readonly tone?: StatusTone | undefined;
  readonly toneLabel?: string | undefined;
}

export function StatusIndicator({
  children,
  className,
  live,
  role: suppliedRole,
  tone = "neutral",
  toneLabel,
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  // The dot carries a per-tone shape, so the state survives without color.
  // An explicitly blank label suppresses the announcement entirely here,
  // unlike the tone-badged components that always name their tone.
  const trimmedToneLabel = toneLabel?.trim();
  const effectiveToneLabel = isSemanticTone(tone)
    ? resolveToneLabel(tone, toneLabel)
    : trimmedToneLabel;

  return (
    <span
      {...props}
      className={classNames("snui-status", `snui-status--${tone}`, className)}
      role={region.role}
      aria-live={region["aria-live"]}
    >
      <span className="snui-status__dot" aria-hidden="true" />
      <ToneAnnouncement
        label={trimmedToneLabel === "" ? undefined : effectiveToneLabel}
      />
      <span>{children}</span>
    </span>
  );
}
