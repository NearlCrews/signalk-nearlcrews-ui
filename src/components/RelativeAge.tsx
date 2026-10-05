import { type HTMLAttributes, type RefAttributes, useMemo } from "react";

import { useClockReading } from "../hooks/use-clock-reading.js";
import { classNames } from "../utils/class-names.js";
import {
  type FormatRelativeAgeOptions,
  formatRelativeAge,
  formatRelativeAgeSince,
  type RelativeAgeTimestamp,
  timestampToMs,
} from "../utils/format-relative-age.js";
import { resolveBundledLabel } from "../utils/labels.js";
import { usePanelLocale } from "../utils/locale.js";
import { RELATIVE_AGE_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { createPolymorphicElement } from "../utils/polymorphic.js";
import { definedProps } from "../utils/props.js";
import { DEFAULT_CLOCK_TICK_MS } from "../utils/shared-clock.js";

export type RelativeAgeElement = "time" | "span";

export interface RelativeAgeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children">,
    RefAttributes<HTMLElement> {
  /** An already computed age. The consumer re-renders to refresh it. */
  readonly ageMs?: number | null | undefined;
  /**
   * Defaults to `time` when `since` is given and `span` otherwise. A `time`
   * asked for without a readable `since` renders as a `span` instead: a time
   * element with no `dateTime` has to carry a machine-readable string as its
   * own text, and "3 minutes ago" is not one.
   */
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
 * computed. The clock is seeded once in the initial state, read again on the
 * shared tick, and read once more in the render that first sees a new
 * `since`, so a moment stamped at receipt is never measured against an older
 * reading. That reading is stored with the moment, so every later render of
 * it is pure and StrictMode replays agree.
 */
export function RelativeAge({
  ageMs,
  as,
  className,
  options: suppliedOptions,
  since,
  tickMs = DEFAULT_CLOCK_TICK_MS,
  ...props
}: RelativeAgeProps): React.JSX.Element {
  const panelLocale = usePanelLocale();
  const bundledFallback = usePanelLabels()?.relativeAge?.fallback;
  // The panel's locale unless the caller names one, so an age and the numbers
  // the same panel formats itself cannot end up in two languages. The
  // fallback follows the rule every bundled string follows: the caller's,
  // then the panel's, then the default, with blank text reading as absent at
  // each step, so an unknown age never renders an empty element.
  const options = useMemo<FormatRelativeAgeOptions | undefined>(() => {
    const suppliedFallback = suppliedOptions?.fallback;
    const fallback = resolveBundledLabel(
      suppliedFallback,
      bundledFallback,
      RELATIVE_AGE_LABEL_DEFAULTS.fallback,
    );
    // The caller's own object is kept whenever nothing needs filling in, so
    // a stable options prop costs no new object per render.
    if (
      panelLocale === undefined &&
      fallback === (suppliedFallback ?? RELATIVE_AGE_LABEL_DEFAULTS.fallback)
    ) {
      return suppliedOptions;
    }
    return {
      ...definedProps({ locale: panelLocale }),
      ...definedProps(suppliedOptions ?? {}),
      fallback,
    };
  }, [bundledFallback, panelLocale, suppliedOptions]);

  const ownsClock = since !== null && since !== undefined;

  // Read once per render, so a string timestamp is not parsed again on every
  // tick that checks whether the words changed.
  const sinceMs = timestampToMs(since);
  // A settled age formats the same for tick after tick: "3 hours ago" is
  // still "3 hours ago" ten seconds later, and an age past a minute repeats
  // for five ticks out of six. Two formats are far cheaper than the render
  // they save, so a tick commits only when the words would change, and a new
  // moment is measured against a clock read as it arrives.
  const nowMs = useClockReading(sinceMs, tickMs, {
    changes: (candidateMs, currentMs) =>
      formatRelativeAgeSince(sinceMs, candidateMs, options) !==
      formatRelativeAgeSince(sinceMs, currentMs, options),
  });
  const text = ownsClock
    ? formatRelativeAgeSince(sinceMs, nowMs, options)
    : formatRelativeAge(ageMs, options);

  /*
   * A time element promises a machine-readable moment, so it is used only
   * where there is one to stamp. Without a `dateTime` attribute the element's
   * own text has to be the machine-readable string, and "3 minutes ago" is
   * not one, so an unreadable timestamp falls back to a span whether the
   * element was chosen here or asked for by the caller.
   */
  const stampable = Number.isFinite(sinceMs);
  const requested = as ?? (stampable ? "time" : "span");
  const element = requested === "time" && !stampable ? "span" : requested;

  return createPolymorphicElement(
    element,
    {
      ...props,
      className: classNames("snui-relative-age", className),
      dateTime:
        element === "time" ? new Date(sinceMs).toISOString() : undefined,
    },
    text,
  );
}
