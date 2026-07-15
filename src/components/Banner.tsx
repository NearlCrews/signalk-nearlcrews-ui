import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type BannerTone = "info" | "success" | "warning" | "danger";
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title"> {
  readonly actions?: ReactNode;
  readonly dismissFocusRef?: RefObject<HTMLElement | null>;
  readonly dismissLabel?: string;
  readonly live?: BannerLive;
  readonly onDismiss?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly title?: ReactNode;
  readonly tone?: BannerTone;
  readonly toneLabel?: string;
}

const TONE_LABELS: Readonly<Record<BannerTone, string>> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

const TONE_ICONS: Readonly<Record<BannerTone, string>> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "×",
};

export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    actions,
    children,
    className,
    dismissFocusRef,
    dismissLabel = "Dismiss",
    live,
    onDismiss,
    role: suppliedRole,
    title,
    tone = "info",
    toneLabel = TONE_LABELS[tone],
    ...props
  },
  ref,
): React.JSX.Element {
  const effectiveLive = live ?? "off";
  const role =
    suppliedRole ??
    (effectiveLive === "assertive"
      ? "alert"
      : effectiveLive === "polite"
        ? "status"
        : undefined);
  const hasActions = hasReactContent(actions) || onDismiss !== undefined;
  const effectiveDismissLabel = dismissLabel.trim() || "Dismiss";
  const effectiveToneLabel = toneLabel.trim() || TONE_LABELS[tone];

  return (
    <div
      {...props}
      ref={ref}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={role}
      aria-live={live}
    >
      <div className="snui-banner__content">
        <span className="snui-banner__tone-icon" aria-hidden="true">
          {TONE_ICONS[tone]}
        </span>
        <div className="snui-banner__text">
          <span className="snui-visually-hidden">{effectiveToneLabel}. </span>
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
            <button
              type="button"
              className="snui-banner__dismiss"
              onClick={(event) => {
                onDismiss(event);
                if (dismissFocusRef !== undefined) {
                  queueMicrotask(() => dismissFocusRef.current?.focus());
                }
              }}
            >
              {effectiveDismissLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
