import type {
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";

import { announcementRole } from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import {
  isSemanticTone,
  type StatusTone,
  TONE_GLYPHS,
  TONE_LABELS,
} from "../utils/tone.js";
import { Button } from "./Button.js";

export type BannerTone = StatusTone;
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title">,
    RefAttributes<HTMLDivElement> {
  readonly actions?: ReactNode | undefined;
  readonly dismissFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly dismissLabel?: string | undefined;
  readonly live?: BannerLive | undefined;
  readonly onDismiss?:
    | ((event: MouseEvent<HTMLButtonElement>) => void)
    | undefined;
  readonly title?: ReactNode | undefined;
  readonly tone?: BannerTone | undefined;
  readonly toneLabel?: string | undefined;
}

export function Banner({
  actions,
  children,
  className,
  dismissFocusRef,
  dismissLabel = "Dismiss",
  live,
  onDismiss,
  ref,
  role: suppliedRole,
  title,
  tone = "info",
  toneLabel,
  ...props
}: BannerProps): React.JSX.Element {
  const effectiveLive = live ?? "off";
  const role = suppliedRole ?? announcementRole(effectiveLive);
  // `alert` and `status` already imply a live region. Emitting `aria-live`
  // beside them double speaks on some screen readers, and an explicit "off"
  // would silence a role the caller asked for.
  const ariaLive = role === undefined ? live : undefined;
  const hasActions = hasReactContent(actions) || onDismiss !== undefined;
  const effectiveDismissLabel = dismissLabel.trim() || "Dismiss";
  const semantic = isSemanticTone(tone);
  const effectiveToneLabel = semantic
    ? (toneLabel?.trim() ?? "") || TONE_LABELS[tone]
    : undefined;

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={role}
      aria-live={ariaLive}
    >
      <div className="snui-banner__content">
        {semantic ? (
          <span className="snui-banner__tone-icon" aria-hidden="true">
            {TONE_GLYPHS[tone]}
          </span>
        ) : null}
        <div className="snui-banner__text">
          {effectiveToneLabel === undefined ? null : (
            <span className="snui-visually-hidden">{effectiveToneLabel}. </span>
          )}
          {hasReactContent(title) ? (
            <div className="snui-banner__title">
              {title}
              <span className="snui-visually-hidden">. </span>
            </div>
          ) : null}
          <div className="snui-banner__body">{children}</div>
        </div>
      </div>
      {hasActions ? (
        <div className="snui-banner__actions">
          {actions}
          {onDismiss !== undefined ? (
            <Button
              variant="ghost"
              size="compact"
              onClick={(event) => {
                onDismiss(event);
                if (dismissFocusRef !== undefined) {
                  queueMicrotask(() => dismissFocusRef.current?.focus());
                }
              }}
            >
              {effectiveDismissLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
