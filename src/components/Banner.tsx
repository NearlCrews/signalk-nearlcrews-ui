import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type BannerTone = "info" | "success" | "warning" | "danger";
export type BannerLive = "off" | "polite" | "assertive";

export interface BannerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "aria-live" | "role" | "title"> {
  readonly live?: BannerLive;
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
  children,
  className,
  live,
  title,
  tone = "info",
  ...props
}: BannerProps): React.JSX.Element {
  const effectiveLive = live ?? "off";
  const role =
    effectiveLive === "assertive"
      ? "alert"
      : effectiveLive === "polite"
        ? "status"
        : undefined;

  return (
    <div
      {...props}
      className={classNames("snui-banner", `snui-banner--${tone}`, className)}
      role={role}
      aria-live={effectiveLive === "off" ? undefined : effectiveLive}
    >
      <span className="snui-visually-hidden">{TONE_LABELS[tone]}. </span>
      {hasReactContent(title) ? (
        <div className="snui-banner__title">
          {title}
          <span className="snui-visually-hidden">. </span>
        </div>
      ) : null}
      <div className="snui-banner__body">{children}</div>
    </div>
  );
}
