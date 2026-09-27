import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { AnnouncementMode } from "../utils/announcement.js";
import { resolveBundledLabels, trimmedText } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import type { StatusTone } from "../utils/tone.js";
import { ActionBar, type ActionBarProps } from "./ActionBar.js";
import { Button, type ButtonAsButtonProps } from "./Button.js";
import { StatusIndicator } from "./StatusIndicator.js";

export interface SaveActionBarLabels {
  /** Status while the configuration is clean and already applied. */
  readonly clean: string;
  readonly discard: string;
  readonly save: string;
  /**
   * Status once a save has been requested and nothing is pending. A panel that
   * hears back from the server should pass its own wording here together with
   * `savedMessageDurationMs={0}`, and report the outcome itself.
   */
  readonly saved: string;
  /** Status while `saving` is true. */
  readonly saving: string;
  /**
   * Status while the plugin has never been configured. The one label written
   * as an instruction rather than as a state, because an unconfigured plugin
   * does nothing until someone saves it.
   */
  readonly unconfigured: string;
  /** Status while there are edits to save. */
  readonly unsaved: string;
}

const DEFAULT_LABELS: SaveActionBarLabels = {
  clean: "All changes saved",
  discard: "Discard",
  save: "Save",
  saved: "Save sent to the server",
  saving: "Saving changes",
  unconfigured: "Save to enable the plugin",
  unsaved: "Unsaved changes",
};

/**
 * The status keeps one role across every state, and only its text changes.
 * Attaching the role in the same render that writes the text is the pattern
 * this package avoids everywhere else, because a live region created together
 * with its message is not announced reliably.
 */
const SAVE_STATUS_LIVE: AnnouncementMode = "polite";

/**
 * How long the saved message stays up, measured from the save request. Long
 * enough to be read and heard, short enough that the bar returns to reporting
 * the configuration rather than the last thing that happened to it.
 */
const DEFAULT_SAVED_MESSAGE_DURATION_MS = 2_500;

/** Where focus goes after Save or Discard runs. */
export type SaveActionBarFocus = "none" | "status";

export interface SaveActionBarProps
  extends Omit<ActionBarProps, "actions" | "status" | "statusRef"> {
  /** The working configuration differs from the last requested snapshot. */
  readonly dirty: boolean;
  /**
   * Where focus goes after either action. `"status"`, the default, moves it to
   * the status line, because the button that was pressed usually disables
   * itself. Pass `"none"` where the panel owns the destination, for example a
   * save that validates and sends focus to the field it refused.
   */
  readonly focusOnAction?: SaveActionBarFocus | undefined;
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
   * timer of its own and never has to write the timestamp back to null. An
   * edit starts a new cycle, so a later request opens a window of its own even
   * when it carries the same instant.
   */
  readonly saveRequestedAt?: number | null | undefined;
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
  /**
   * The actions are refused rather than unavailable, so they keep their place
   * in the tab order and say why instead of vanishing from under the reader.
   * Only validation blocks this way.
   */
  readonly blocked: boolean;
  readonly discardDisabled: boolean;
  /**
   * Always polite: the status keeps one role across every state, and only its
   * text changes.
   */
  readonly live: AnnouncementMode;
  readonly message: string;
  readonly saveDisabled: boolean;
  readonly tone: StatusTone;
}

/**
 * The state inputs of {@link resolveSaveActionBarState}: the same values
 * `SaveActionBar` takes, with the same defaults, so a test of the rules reads
 * like the props the panel passes. `saveRequestedAt` is the one that differs
 * in practice: the component owns the window, so a rules test passes the
 * timestamp for the reported state and null for the state the bar falls back
 * to once the window closes.
 */
export type SaveActionBarStateInput = Pick<
  SaveActionBarProps,
  | "dirty"
  | "invalidMessage"
  | "labels"
  | "saveRequestedAt"
  | "saving"
  | "unconfigured"
>;

/**
 * The save rules shared by every configuration panel, as data so a consumer
 * can test them without rendering. Save is enabled while there is something
 * to save: edits, or a plugin that has never been configured. Invalid input
 * and an in-flight save block it.
 *
 * Every string falls back to the component's own default, so the rules a test
 * exercises are the rules the rendered bar runs.
 */
export function resolveSaveActionBarState(
  input: SaveActionBarStateInput,
): SaveActionBarState {
  return resolveStateWithLabels(
    input,
    resolveBundledLabels(DEFAULT_LABELS, input.labels, undefined),
  );
}

/**
 * One state of the bar. The live mode is filled in here rather than per
 * state, because it is the one thing no state changes, and only validation
 * blocks, so every other state leaves `blocked` out. The fields are written
 * out in a fixed order, because a consumer that serializes the state or
 * snapshots it sees that order.
 */
function saveState({
  blocked = false,
  discardDisabled,
  message,
  saveDisabled,
  tone,
}: Omit<SaveActionBarState, "blocked" | "live"> & {
  readonly blocked?: boolean;
}): SaveActionBarState {
  return {
    blocked,
    discardDisabled,
    live: SAVE_STATUS_LIVE,
    message,
    saveDisabled,
    tone,
  };
}

/**
 * The rules over an already-resolved label set, so the component resolves its
 * labels once per render rather than once here and once for the buttons.
 */
function resolveStateWithLabels(
  {
    dirty,
    invalidMessage,
    saveRequestedAt,
    saving = false,
    unconfigured = false,
  }: SaveActionBarStateInput,
  labels: SaveActionBarLabels,
): SaveActionBarState {
  const validationMessage = trimmedText(invalidMessage ?? undefined);
  if (saving) {
    return saveState({
      discardDisabled: true,
      message: labels.saving,
      saveDisabled: true,
      tone: "info",
    });
  }
  if (validationMessage !== "") {
    return saveState({
      blocked: true,
      discardDisabled: !dirty,
      message: validationMessage,
      saveDisabled: true,
      tone: "danger",
    });
  }
  if (dirty) {
    return saveState({
      discardDisabled: false,
      message: labels.unsaved,
      saveDisabled: false,
      // Edits waiting to be saved are the ordinary state of a panel being
      // used, so the status informs rather than cautioning; warning is kept
      // for a state that asks the operator to be careful.
      tone: "info",
    });
  }
  if (saveRequestedAt !== null && saveRequestedAt !== undefined) {
    return saveState({
      discardDisabled: true,
      message: labels.saved,
      saveDisabled: !unconfigured,
      tone: "info",
    });
  }
  if (unconfigured) {
    return saveState({
      discardDisabled: true,
      message: labels.unconfigured,
      saveDisabled: false,
      tone: "info",
    });
  }
  return saveState({
    discardDisabled: true,
    message: labels.clean,
    saveDisabled: true,
    tone: "neutral",
  });
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
  dirty: boolean,
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
  const [wasDirty, setWasDirty] = useState(dirty);

  // An edit begins a new save cycle, so the request that follows opens a
  // window of its own even when the panel stamps it with the same instant the
  // closed one carried, which two saves inside one millisecond do.
  if (wasDirty !== dirty) {
    setWasDirty(dirty);
    if (dirty && closedRequestAt !== null) setClosedRequestAt(null);
  }

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
 * pressed usually disables itself and would otherwise drop focus to the body;
 * a panel that owns the destination passes `focusOnAction="none"`.
 * Configuration state stays with the consumer; this component owns
 * presentation, focus, and how long the saved message stays up.
 */
export function SaveActionBar({
  dirty,
  focusOnAction = "status",
  invalidMessage,
  labels: labelOverrides,
  onDiscard,
  onSave,
  saveRequestedAt,
  savedMessageDurationMs = DEFAULT_SAVED_MESSAGE_DURATION_MS,
  saving = false,
  sticky = "viewport-bottom",
  unconfigured = false,
  ...props
}: SaveActionBarProps): React.JSX.Element {
  const statusRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
  const bundledLabels = usePanelLabels()?.saveActionBar;
  // Seven labels of which at most four ever render, re-resolved on every
  // dirty, saving, and saved transition otherwise.
  const labels = useMemo(
    () => resolveBundledLabels(DEFAULT_LABELS, labelOverrides, bundledLabels),
    [bundledLabels, labelOverrides],
  );
  const savedWindowClosed = useSavedMessageWindowClosed(
    saveRequestedAt,
    savedMessageDurationMs,
    dirty,
  );
  const state = resolveStateWithLabels(
    {
      dirty,
      invalidMessage,
      saveRequestedAt: savedWindowClosed ? null : saveRequestedAt,
      saving,
      unconfigured,
    },
    labels,
  );

  // Focus moves before the action runs, so it is already on the status when
  // the re-render disables the pressed button.
  const runAction = (action: () => void): void => {
    if (focusOnAction === "status") statusRef.current?.focus();
    action();
  };

  // A refusal keeps a button where the reader is standing and points at the
  // status line for the reason. Native disabled is left for the states where
  // there is genuinely nothing to do.
  const availability = (
    unavailable: boolean,
  ): Pick<
    ButtonAsButtonProps,
    "aria-describedby" | "ariaDisabled" | "disabled"
  > => ({
    ariaDisabled: state.blocked && unavailable,
    "aria-describedby": state.blocked ? statusId : undefined,
    disabled: unavailable && !state.blocked,
  });

  return (
    <ActionBar
      {...props}
      sticky={sticky}
      statusRef={statusRef}
      status={
        <StatusIndicator id={statusId} tone={state.tone} live={state.live}>
          {state.message}
        </StatusIndicator>
      }
      actions={
        <>
          <Button
            variant="primary"
            loading={saving}
            loadingLabel={labels.saving}
            // Saving blocks activation through Button's own busy state, so it
            // never reaches native disabled.
            {...availability(state.saveDisabled && !saving)}
            onClick={() => {
              runAction(onSave);
            }}
          >
            {labels.save}
          </Button>
          <Button
            {...availability(state.discardDisabled)}
            onClick={() => {
              runAction(onDiscard);
            }}
          >
            {labels.discard}
          </Button>
        </>
      }
    />
  );
}
