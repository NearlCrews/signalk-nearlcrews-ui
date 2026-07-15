import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type BannerTone = "info" | "success" | "warning" | "danger";
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "title"> {
  readonly actions?: ReactNode;
  readonly dismissLabel?: string;
  readonly live?: BannerLive;
  readonly onDismiss?: () => void;
  readonly title?: ReactNode;
  readonly tone?: BannerTone;
}

const TONE_LABELS: Readonly<Record<BannerTone, string>> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  danger: "Error",
};

export function Banner({
  actions,
  children,
  className,
  dismissLabel = "Dismiss",
  live,
  onDismiss,
  role: suppliedRole,
  title,
  tone = "info",
  ...props
}: BannerProps): React.JSX.Element {
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

  return (
    <div
      {...props}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={role}
      aria-live={effectiveLive === "off" ? undefined : effectiveLive}
    >
      <div className="snui-banner__content">
        <span className="snui-visually-hidden">{TONE_LABELS[tone]}. </span>
        {hasReactContent(title) ? (
          <div className="snui-banner__title">
            {title}
            <span className="snui-visually-hidden">. </span>
          </div>
        ) : null}
        <div className="snui-banner__body">{children}</div>
      </div>
      {hasActions ? (
        <div className="snui-banner__actions">
          {actions}
          {onDismiss !== undefined ? (
            <button
              type="button"
              className="snui-banner__dismiss"
              onClick={onDismiss}
            >
              {effectiveDismissLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
