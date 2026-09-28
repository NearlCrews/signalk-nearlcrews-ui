import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useEffectEvent,
  useRef,
} from "react";

import { useClockReading } from "../hooks/use-clock-reading.js";
import { usePanelAnnouncer } from "../utils/announcer.js";
import {
  type FormatRelativeAgeOptions,
  type RelativeAgeNegative,
  type RelativeAgeTimestamp,
  timestampToMs,
} from "../utils/format-relative-age.js";
import { resolveFreshness } from "../utils/freshness.js";
import { resolveBundledLabels } from "../utils/labels.js";
import { FRESHNESS_NOTE_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { DEFAULT_CLOCK_TICK_MS } from "../utils/shared-clock.js";
import { RelativeAge } from "./RelativeAge.js";
import { Text } from "./Text.js";
import { ToneMark } from "./ToneMark.js";

/** Where the age goes in the fresh and stale wording. */
const AGE_PLACEHOLDER = "{age}";

/**
 * The words a `FreshnessNote` shows and speaks. Each falls back to the panel's
 * label bundle and then to the package default, blank text reading as absent.
 */
export interface FreshnessNoteLabels {
  /** Shown while the readout is current. Defaults to "Checked {age}". */
  readonly fresh?: string | undefined;
  /**
   * Spoken once when a stale readout is current again. Defaults to "Status is
   * current again."
   */
  readonly freshAnnouncement?: string | undefined;
  /**
   * Shown while the readout is current but its sample is stamped more than a
   * minute ahead of this clock, or ahead of it at all under
   * `options.negative: "fallback"`, so no age can be stated. Defaults to
   * "Checked at an unknown time".
   */
  readonly freshUnknown?: string | undefined;
  /** Shown before the first sample. Defaults to "Not checked yet". */
  readonly pending?: string | undefined;
  /**
   * Shown while the readout is stale, in words of its own, because "Checked"
   * on a stale readout reads as reassurance. Defaults to "Out of date: updated
   * {age}".
   */
  readonly stale?: string | undefined;
  /**
   * Spoken once when the readout turns stale. Defaults to "Status is out of
   * date."
   */
  readonly staleAnnouncement?: string | undefined;
  /**
   * Shown while the readout is stale and its sample is stamped more than a
   * minute ahead of this clock, or ahead of it at all under
   * `options.negative: "fallback"`, so no age can be stated. Defaults to "Out
   * of date: last update time unknown".
   */
  readonly staleUnknown?: string | undefined;
}

export interface FreshnessNoteProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    RefAttributes<HTMLSpanElement> {
  /**
   * Replaces the wording for this note. `fresh` and `stale` mark where the
   * age goes with `{age}`; a translation may move it, and one without it
   * shows no age.
   */
  readonly labels?: FreshnessNoteLabels | undefined;
  /** How the age is worded, as `RelativeAge` takes it. */
  readonly options?: FormatRelativeAgeOptions | undefined;
  /**
   * The moment of the last good sample, best taken from the browser's clock
   * when the sample arrived. Null or unreadable shows the pending wording.
   */
  readonly since: RelativeAgeTimestamp | null | undefined;
  /**
   * Whether the sample is too old to trust. The threshold stays with the
   * panel: pass the `stale` that `usePollFreshness` reports, measured with
   * the same `tickMs`.
   */
  readonly stale: boolean;
  /** Milliseconds between refreshes of the age. */
  readonly tickMs?: number | undefined;
  /** Accessible name of the warning mark a stale note carries. */
  readonly toneLabel?: string | undefined;
}

/**
 * Whether a sample's age is past stating at this instant: stamped more than
 * the skew tolerance ahead of the clock, the rule resolveFreshness keeps, or
 * ahead of it at all where the caller asked RelativeAge never to clamp.
 */
function ageCannotBeStated(
  sinceMs: number,
  nowMs: number,
  negative: RelativeAgeNegative | undefined,
): boolean {
  if (negative === "fallback" && nowMs < sinceMs) return true;
  return resolveFreshness(sinceMs, nowMs, 0).ageMs === undefined;
}

/** Puts the age where a wording marks it, or shows the words alone. */
function withAge(wording: string, age: ReactNode): ReactNode {
  const at = wording.indexOf(AGE_PLACEHOLDER);
  if (at === -1) return wording;
  return (
    <>
      {wording.slice(0, at)}
      {age}
      {wording.slice(at + AGE_PLACEHOLDER.length)}
    </>
  );
}

/**
 * How old a polled status is, as one line: "Checked 2 minutes ago" in muted
 * text while it is current, and a warning, "Out of date: updated 6 minutes
 * ago", with the warning mark once it is stale, so the state never rests on
 * color alone.
 *
 * The age ticks, so the note is not a live region: a region around it would
 * speak every tick. The panel's announcer says the turn to stale once, and the
 * recovery once, and nothing is spoken for the state the note mounts in. Both
 * need a `PanelShell` around the note.
 */
export function FreshnessNote({
  labels,
  options,
  ref,
  since,
  stale,
  tickMs,
  toneLabel,
  ...props
}: FreshnessNoteProps): React.JSX.Element {
  const words = resolveBundledLabels(
    FRESHNESS_NOTE_LABEL_DEFAULTS,
    labels,
    usePanelLabels()?.freshnessNote,
  );
  const announce = usePanelAnnouncer();

  const reportTurn = useEffectEvent((nowStale: boolean): void => {
    announce(nowStale ? words.staleAnnouncement : words.freshAnnouncement);
  });

  // The state the note mounted in is not news; only a change of it is.
  const announcedStale = useRef(stale);
  useEffect(() => {
    if (announcedStale.current === stale) return;
    announcedStale.current = stale;
    reportTurn(stale);
  }, [stale]);

  const sinceMs = timestampToMs(since);
  const hasSample = Number.isFinite(sinceMs);
  // Read only to tell whether the age can be stated: a sample stamped more
  // than a minute ahead of this clock, or ahead of it at all under
  // `options.negative: "fallback"`, has none a reader could trust, and the
  // RelativeAge beside it would print its fallback mid-sentence. The note
  // re-renders only when that answer flips, and a new sample is measured
  // against a clock read as it arrives.
  const negative = options?.negative;
  const nowMs = useClockReading(
    hasSample ? sinceMs : Number.NaN,
    tickMs ?? DEFAULT_CLOCK_TICK_MS,
    {
      changes: (candidateMs, currentMs) =>
        ageCannotBeStated(sinceMs, candidateMs, negative) !==
        ageCannotBeStated(sinceMs, currentMs, negative),
    },
  );
  const ageUnknown = hasSample && ageCannotBeStated(sinceMs, nowMs, negative);

  const age = <RelativeAge since={since} options={options} tickMs={tickMs} />;
  let content: ReactNode = words.pending;
  if (ageUnknown) content = stale ? words.staleUnknown : words.freshUnknown;
  else if (hasSample) content = withAge(stale ? words.stale : words.fresh, age);

  return (
    <Text {...props} ref={ref} size="sm" tone={stale ? "warning" : "muted"}>
      {stale ? (
        <ToneMark
          className="snui-freshness__tone-glyph"
          tone="warning"
          toneLabel={toneLabel}
        />
      ) : null}
      {content}
    </Text>
  );
}
