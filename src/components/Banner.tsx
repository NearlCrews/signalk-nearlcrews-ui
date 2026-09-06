import type {
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  RefAttributes,
  RefObject,
} from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import { classNames } from "../utils/class-names.js";
import { DEFAULT_DISMISS_LABEL, resolveLabel } from "../utils/labels.js";
import { hasReactContent } from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import { Button } from "./Button.js";
import { ToneMark } from "./ToneMark.js";

export type BannerTone = StatusTone;
/** @deprecated Use `AnnouncementMode`. */
export type BannerLive = AnnouncementMode;

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title">,
    RefAttributes<HTMLDivElement> {
  readonly actions?: ReactNode | undefined;
  readonly dismissFocusRef?: RefObject<HTMLElement | null> | undefined;
  readonly dismissLabel?: string | undefined;
  readonly live?: AnnouncementMode | undefined;
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
  dismissLabel = DEFAULT_DISMISS_LABEL,
  live,
  onDismiss,
  ref,
  role: suppliedRole,
  title,
  tone = "info",
  toneLabel,
  ...props
}: BannerProps): React.JSX.Element {
  const region = liveRegionProps(live, suppliedRole);
  const hasActions = hasReactContent(actions) || onDismiss !== undefined;
  const effectiveDismissLabel = resolveLabel(
    dismissLabel,
    DEFAULT_DISMISS_LABEL,
  );

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={region.role}
      aria-live={region["aria-live"]}
    >
      <div className="snui-banner__content">
        <ToneMark
          className="snui-banner__tone-icon"
          tone={tone}
          toneLabel={toneLabel}
        />
        <div className="snui-banner__text">
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
