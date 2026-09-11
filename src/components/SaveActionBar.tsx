import { type ReactNode, useEffect, useRef, useState } from "react";

import type { AnnouncementMode } from "../utils/announcement.js";
import { resolveLabel } from "../utils/labels.js";
import type { StatusTone } from "../utils/tone.js";
import { ActionBar, type ActionBarProps } from "./ActionBar.js";
import { Button } from "./Button.js";
import { StatusIndicator } from "./StatusIndicator.js";

export interface SaveActionBarLabels {
  /** Status while the configuration is clean and already applied. */
  readonly clean: string;
  readonly discard: string;
  readonly save: string;
  /** Status while `saving` is true. */
  readonly saving: string;
  /** Status while the plugin has never been configured. */
  readonly unconfigured: string;
  /** Status while there are edits to save. */
  readonly unsaved: string;
}

const DEFAULT_LABELS: SaveActionBarLabels = {
  clean: "No unsaved changes",
  discard: "Discard",
  save: "Save",
  saving: "Saving changes",
  unconfigured: "Save to enable the plugin.",
  unsaved: "Unsaved changes",
};

const DEFAULT_SAVED_MESSAGE = "Save requested";

/**
 * How long the saved message stays up, measured from the save request. Long
 * enough to be read and heard, short enough that the bar returns to reporting
 * the configuration rather than the last thing that happened to it.
 */
const DEFAULT_SAVED_MESSAGE_DURATION_MS = 2_500;

export interface SaveActionBarProps
  extends Omit<ActionBarProps, "actions" | "status" | "statusRef"> {
  /** The working configuration differs from the last requested snapshot. */
  readonly dirty: boolean;
  /**
   * A validation message that blocks saving, or nothing when the form is
   * valid. It becomes the status text and is announced like every other
   * state, because the reason saving is blocked is the one thing the bar has
   * to say.
   */
  readonly invalidMessage?: string | null | undefined;
  readonly labels?: Partial<SaveActionBarLabels> | undefined;
  readonly onDiscard: () => void;
  readonly onSave: () => void;
  /**
   * Epoch milliseconds of the last save request, or null before the first.
   * The bar reports the request for `savedMessageDurationMs` from that
   * instant and then falls back to the state underneath, so a panel keeps no
   * timer of its own and never has to write the timestamp back to null.
   */
  readonly saveRequestedAt?: number | null | undefined;
  /** Status text once a save has been requested and nothing is pending. */
  readonly savedMessage?: string | undefined;
  /**
   * How long the saved message stays up after a save request. Zero leaves it
   * up until `saveRequestedAt` changes, for a panel that ends the window on
   * something other than the clock, such as a server confirmation.
   */
  readonly savedMessageDurationMs?: number | undefined;
  readonly saving?: boolean | undefined;
  /**
   * The host supplied no configuration, so the plugin has never been set up.
   * Save stays enabled so the defaults can be requested without an edit.
   */
  readonly unconfigured?: boolean | undefined;
}

export interface SaveActionBarState {
  readonly discardDisabled: boolean;
  /**
   * Always polite: the status keeps one role across every state, and only its
   * text changes. Attaching the role in the same render that writes the text
   * is the pattern this package avoids everywhere else, because a live region
   * created together with its message is not announced reliably.
   */
  readonly live: AnnouncementMode;
  readonly message: string;
  readonly saveDisabled: boolean;
  readonly tone: StatusTone;
}

/**
 * The state inputs of {@link resolveSaveActionBarState}: the same values
 * `SaveActionBar` takes, with the same defaults, so a test of the rules reads
 * like the props the panel passes.
 */
export interface SaveActionBarStateInput {
  readonly dirty: boolean;
  readonly invalidMessage?: string | null | undefined;
  readonly labels?: Partial<SaveActionBarLabels> | undefined;
  /**
   * A save request while its message is still up. The component owns that
   * window, so a rules test passes the timestamp for the reported state and
   * null for the state the bar falls back to once the window closes.
   */
  readonly saveRequestedAt?: number | null | undefined;
  /** Defaults to the component's own "Save requested". */
  readonly savedMessage?: string | undefined;
  readonly saving?: boolean | undefined;
  readonly unconfigured?: boolean | undefined;
}

/**
 * The save rules shared by every configuration panel, as data so a consumer
 * can test them without rendering. Save is enabled while there is something
 * to save: edits, or a plugin that has never been configured. Invalid input
 * and an in-flight save block it.
 *
 * Every string falls back to the component's own default, so the rules a test
 * exercises are the rules the rendered bar runs.
 */
export function resolveSaveActionBarState({
  dirty,
  invalidMessage,
  labels: labelOverrides,
  savedMessage,
  saveRequestedAt,
  saving = false,
  unconfigured = false,
}: SaveActionBarStateInput): SaveActionBarState {
  const labels = resolveLabels(labelOverrides);
  const invalid = (invalidMessage?.trim() ?? "") !== "";
  if (saving) {
    return {
      discardDisabled: true,
      live: "polite",
      message: labels.saving,
      saveDisabled: true,
      tone: "info",
    };
  }
  if (invalid) {
    return {
      discardDisabled: !dirty,
      live: "polite",
      message: invalidMessage?.trim() ?? "",
      saveDisabled: true,
      tone: "danger",
    };
  }
  if (dirty) {
    return {
      discardDisabled: false,
      live: "polite",
      message: labels.unsaved,
      saveDisabled: false,
      tone: "warning",
    };
  }
  if (saveRequestedAt !== null && saveRequestedAt !== undefined) {
    return {
      discardDisabled: true,
      live: "polite",
      message: resolveLabel(savedMessage, DEFAULT_SAVED_MESSAGE),
      saveDisabled: !unconfigured,
      tone: "info",
    };
  }
  if (unconfigured) {
    return {
      discardDisabled: true,
      live: "polite",
      message: labels.unconfigured,
      saveDisabled: false,
      tone: "info",
    };
  }
  return {
    discardDisabled: true,
    live: "polite",
    message: labels.clean,
    saveDisabled: true,
    tone: "neutral",
  };
}

function resolveLabels(
  overrides: Partial<SaveActionBarLabels> | undefined,
): SaveActionBarLabels {
  return {
    clean: resolveLabel(overrides?.clean, DEFAULT_LABELS.clean),
    discard: resolveLabel(overrides?.discard, DEFAULT_LABELS.discard),
    save: resolveLabel(overrides?.save, DEFAULT_LABELS.save),
    saving: resolveLabel(overrides?.saving, DEFAULT_LABELS.saving),
    unconfigured: resolveLabel(
      overrides?.unconfigured,
      DEFAULT_LABELS.unconfigured,
    ),
    unsaved: resolveLabel(overrides?.unsaved, DEFAULT_LABELS.unsaved),
  };
}

/**
 * Milliseconds left of the window a save request opened, or null where no
 * window is running: no request, an unusable timestamp, or a consumer that
 * keeps the window itself with a duration of zero. A timestamp ahead of this
 * clock counts as now, so skew between the host and the panel lengthens no
 * window.
 */
function remainingWindowMs(
  saveRequestedAt: number | null | undefined,
  durationMs: number,
  nowMs: number,
): number | null {
  if (saveRequestedAt === null || saveRequestedAt === undefined) return null;
  if (!Number.isFinite(saveRequestedAt) || durationMs <= 0) return null;
  return Math.max(0, durationMs - Math.max(0, nowMs - saveRequestedAt));
}

/**
 * Reports whether the message for a save request has outlived its window.
 *
 * One timeout per request, armed for what is left of the window rather than
 * its full length, so a panel that mounts holding an older timestamp shows no
 * confirmation for a save the user finished with minutes ago. A second
 * request restarts the window instead of inheriting what the first had left,
 * because the effect re-runs on the new timestamp.
 */
function useSavedMessageWindowClosed(
  saveRequestedAt: number | null | undefined,
  durationMs: number,
): boolean {
  // A panel mounting after the window has already run out starts closed, so
  // the stale confirmation is never rendered and never announced.
  const [closedRequestAt, setClosedRequestAt] = useState<number | null>(() => {
    if (saveRequestedAt === null || saveRequestedAt === undefined) return null;
    const remainingMs = remainingWindowMs(
      saveRequestedAt,
      durationMs,
      Date.now(),
    );
    return remainingMs === 0 ? saveRequestedAt : null;
  });
  const closed =
    closedRequestAt !== null && closedRequestAt === saveRequestedAt;

  useEffect(() => {
    if (closed || saveRequestedAt === null || saveRequestedAt === undefined) {
      return undefined;
    }
    const remainingMs = remainingWindowMs(
      saveRequestedAt,
      durationMs,
      Date.now(),
    );
    if (remainingMs === null) return undefined;
    const timer = setTimeout(() => {
      setClosedRequestAt(saveRequestedAt);
    }, remainingMs);
    return () => {
      clearTimeout(timer);
    };
  }, [closed, durationMs, saveRequestedAt]);

  return closed;
}

/**
 * The Save and Discard footer of a configuration panel with its status line.
 * After either action, focus moves to the status, because the button that was
 * pressed usually disables itself and would otherwise drop focus to the body.
 * Configuration state stays with the consumer; this component owns
 * presentation, focus, and how long the saved message stays up.
 */
export function SaveActionBar({
  dirty,
  invalidMessage,
  labels: labelOverrides,
  onDiscard,
  onSave,
  saveRequestedAt,
  savedMessage,
  savedMessageDurationMs = DEFAULT_SAVED_MESSAGE_DURATION_MS,
  saving = false,
  sticky = "viewport-bottom",
  unconfigured = false,
  ...props
}: SaveActionBarProps): React.JSX.Element {
  const statusRef = useRef<HTMLDivElement>(null);
  const labels = resolveLabels(labelOverrides);
  const savedWindowClosed = useSavedMessageWindowClosed(
    saveRequestedAt,
    savedMessageDurationMs,
  );
  const state = resolveSaveActionBarState({
    dirty,
    invalidMessage,
    labels,
    savedMessage,
    saveRequestedAt: savedWindowClosed ? null : saveRequestedAt,
    saving,
    unconfigured,
  });

  // Focus moves before the action runs, so it is already on the status when
  // the re-render disables the pressed button.
  const runAndFocusStatus = (action: () => void): void => {
    statusRef.current?.focus();
    action();
  };

  const status: ReactNode = (
    <StatusIndicator tone={state.tone} live={state.live}>
      {state.message}
    </StatusIndicator>
  );

  return (
    <ActionBar
      {...props}
      sticky={sticky}
      statusRef={statusRef}
      status={status}
      actions={
        <>
          <Button
            variant="primary"
            loading={saving}
            loadingLabel={labels.saving}
            disabled={state.saveDisabled && !saving}
            onClick={() => runAndFocusStatus(onSave)}
          >
            {labels.save}
          </Button>
          <Button
            disabled={state.discardDisabled}
            onClick={() => runAndFocusStatus(onDiscard)}
          >
            {labels.discard}
          </Button>
        </>
      }
    />
  );
}
