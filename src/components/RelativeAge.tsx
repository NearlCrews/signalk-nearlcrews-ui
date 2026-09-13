import {
  type HTMLAttributes,
  type RefAttributes,
  useEffect,
  useEffectEvent,
  useMemo,
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
import { usePanelLocale } from "../utils/locale.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { createPolymorphicElement } from "../utils/polymorphic.js";
import { definedProps } from "../utils/props.js";
import { subscribeToClock } from "../utils/shared-clock.js";

export type RelativeAgeElement = "time" | "span";

/** Default interval between re-renders while the component owns the clock. */
const DEFAULT_TICK_MS = 10_000;

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
 * computed. The clock is seeded once in the initial state and read again only
 * on the shared tick, never on a re-render, so a render stays pure and
 * StrictMode replays agree.
 */
export function RelativeAge({
  ageMs,
  as,
  className,
  options: suppliedOptions,
  since,
  tickMs = DEFAULT_TICK_MS,
  ...props
}: RelativeAgeProps): React.JSX.Element {
  const panelLocale = usePanelLocale();
  const bundledFallback = usePanelLabels()?.relativeAge?.fallback;
  // The panel's locale unless the caller names one, so an age and the numbers
  // the same panel formats itself cannot end up in two languages. The panel's
  // fallback wording joins on the same terms.
  const options = useMemo<FormatRelativeAgeOptions | undefined>(() => {
    const panelDefaults = {
      ...(panelLocale === undefined ? {} : { locale: panelLocale }),
      ...(bundledFallback === undefined ? {} : { fallback: bundledFallback }),
    };
    if (Object.keys(panelDefaults).length === 0) return suppliedOptions;
    return { ...panelDefaults, ...definedProps(suppliedOptions ?? {}) };
  }, [bundledFallback, panelLocale, suppliedOptions]);

  const ownsClock = since !== null && since !== undefined;
  const [nowMs, setNowMs] = useState(() => Date.now());

  const sinceMs = timestampToMs(since);
  const text = ownsClock
    ? formatRelativeAgeSince(since, nowMs, options)
    : formatRelativeAge(ageMs, options);

  const readClock = useEffectEvent((candidateMs: number): void => {
    // A settled age formats the same for tick after tick: "3 hours ago" is
    // still "3 hours ago" ten seconds later, and an age past a minute repeats
    // for five ticks out of six. One extra format is far cheaper than the
    // render it saves, and it also absorbs the millisecond of drift between
    // the initial state and the instant the subscription delivers at once.
    if (formatRelativeAgeSince(since, candidateMs, options) !== text) {
      setNowMs(candidateMs);
    }
  });

  useEffect(() => {
    // A non-finite cadence would reach setInterval as zero, so it is treated
    // as no ticking at all rather than as a runaway timer.
    if (!ownsClock || !Number.isFinite(tickMs) || tickMs <= 0) return undefined;
    return subscribeToClock(tickMs, readClock);
  }, [ownsClock, tickMs]);

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
  const dateTime = stampable ? new Date(sinceMs).toISOString() : undefined;

  return createPolymorphicElement(
    element,
    {
      ...props,
      className: classNames("snui-relative-age", className),
      dateTime: element === "time" ? dateTime : undefined,
    },
    text,
  );
}
