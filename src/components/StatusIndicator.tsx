import type { HTMLAttributes, ReactNode } from "react";

import {
  type AnnouncementMode,
  announcementRole,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { isSemanticTone, type StatusTone, TONE_LABELS } from "../utils/tone.js";

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
  const effectiveLive = live ?? "off";
  const role = suppliedRole ?? announcementRole(effectiveLive);
  // `alert` and `status` already imply a live region, so a roled indicator
  // does not also carry aria-live.
  const ariaLive = role === undefined ? live : undefined;
  // The dot carries a per-tone shape, so the state survives without color.
  const trimmedToneLabel = toneLabel?.trim();
  const effectiveToneLabel = isSemanticTone(tone)
    ? (trimmedToneLabel ?? "") || TONE_LABELS[tone]
    : trimmedToneLabel;

  return (
    <span
      {...props}
      className={classNames("snui-status", `snui-status--${tone}`, className)}
      role={role}
      aria-live={ariaLive}
    >
      <span className="snui-status__dot" aria-hidden="true" />
      {trimmedToneLabel === "" || effectiveToneLabel === undefined ? null : (
        <span className="snui-visually-hidden">{effectiveToneLabel}. </span>
      )}
      <span>{children}</span>
    </span>
  );
}
