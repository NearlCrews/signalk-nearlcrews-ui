import {
  createElement,
  type HTMLAttributes,
  type RefAttributes,
  useEffect,
  useState,
} from "react";

import { classNames } from "../utils/class-names.js";
import {
  type FormatRelativeAgeOptions,
  formatRelativeAge,
  formatRelativeAgeSince,
  type RelativeAgeTimestamp,
  timestampToMs,
} from "../utils/format-relative-age.js";

export type RelativeAgeElement = "time" | "span";

/** Default interval between re-renders while the component owns the clock. */
const DEFAULT_TICK_MS = 10_000;

export interface RelativeAgeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    RefAttributes<HTMLElement> {
  /** An already computed age. The consumer re-renders to refresh it. */
  readonly ageMs?: number | null | undefined;
  /** Defaults to `time` when `since` is given and `span` otherwise. */
  readonly as?: RelativeAgeElement | undefined;
  readonly options?: FormatRelativeAgeOptions | undefined;
  /**
   * The moment the age counts from. The component then owns the clock: it
   * re-renders every `tickMs` and stamps the element with `dateTime`.
   */
  readonly since?: RelativeAgeTimestamp | null | undefined;
  /** Milliseconds between clock ticks while `since` is set; 0 disables ticking. */
  readonly tickMs?: number | undefined;
}

/**
 * Renders a relative age such as "3 minutes ago". Give it `since` for a live
 * age the component keeps current, or `ageMs` for a value the consumer already
 * computed. The clock is read in an effect, never during render, so a render
 * stays pure and StrictMode replays agree.
 */
export function RelativeAge({
  ageMs,
  as,
  className,
  options,
  since,
  tickMs = DEFAULT_TICK_MS,
  ...props
}: RelativeAgeProps): React.JSX.Element {
  const ownsClock = since !== null && since !== undefined;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!ownsClock || tickMs <= 0) return undefined;
    const interval = setInterval(() => setNowMs(Date.now()), tickMs);
    return () => clearInterval(interval);
  }, [ownsClock, tickMs]);

  const sinceMs = timestampToMs(since);
  const text = ownsClock
    ? formatRelativeAgeSince(since, nowMs, options)
    : formatRelativeAge(ageMs, options);
  const element = as ?? (ownsClock ? "time" : "span");

  // The caller's ref travels inside the rest props, as React 19 allows.
  return createElement(
    element,
    {
      ...props,
      className: classNames("snui-relative-age", className),
      dateTime:
        element === "time" && Number.isFinite(sinceMs)
          ? new Date(sinceMs).toISOString()
          : undefined,
    },
    text,
  );
}
