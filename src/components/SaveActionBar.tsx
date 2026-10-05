import {
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { AnnouncementMode } from "../utils/announcement.js";
import {
  focusedElement,
  focusIsNowhere,
  isFocused,
  revealAndFocus,
} from "../utils/focus.js";
import { resolveBundledLabels, trimmedText } from "../utils/labels.js";
import { SAVE_ACTION_BAR_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { isTimerDelay } from "../utils/shared-clock.js";
import { startTimer } from "../utils/timer.js";
import type { SemanticTone, StatusTone } from "../utils/tone.js";
import { ActionBar, type ActionBarProps } from "./ActionBar.js";
import { Button, type ButtonAsButtonProps } from "./Button.js";
import { StatusIndicator } from "./StatusIndicator.js";

export interface SaveActionBarLabels {
  /**
   * Status while the panel matches the last configuration it loaded or sent,
   * default "Nothing to save".
   */
  readonly clean: string;
  readonly discard: string;
  readonly save: string;
  /**
   * Status once a save has been requested and nothing is pending. A panel that
   * hears back from the server reports what it heard through `outcome`
   * instead, and keeps this label for localization.
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

/**
 * Where a Save or Discard handler sends focus once it has run: an element, or
 * a ref to one, such as the first field a validating save refused. Nothing,
 * null, or a target that cannot take focus leaves the bar's own rule in
 * charge.
 */
export type SaveActionBarFocusTarget =
  | HTMLElement
  | RefObject<HTMLElement | null>
  | null
  | undefined;

/**
 * A Save or Discard handler. Returning nothing is the ordinary case, and an
 * async handler still fits; a handler that knows where the reader should go
 * next returns that place. Only a target returned synchronously is followed:
 * the bar does not await a returned promise, so an async handler gets the
 * status, or no focus move under `focusOnAction="none"`.
 */
export type SaveActionBarAction =
  | (() => void)
  | (() => SaveActionBarFocusTarget);

/**
 * What the panel heard back about its last save request, shown in the bar's
 * own status. The bar only presents it: the request, its timing, and any
 * retry stay with the panel, which clears the outcome when it starts the next
 * request.
 */
export interface SaveActionBarOutcome {
  /**
   * The words for the operator, such as "Save failed. Check the connection."
   */
  readonly message: string;
  /**
   * `"danger"` for a request the server refused or never answered, which
   * keeps Save available for a retry and stays up through later edits,
   * because the configuration on the server is still not the one requested.
   * Any other tone reports an accepted request in place of the saved
   * message, and gives way to the next edit.
   */
  readonly tone: SemanticTone;
}

export interface SaveActionBarProps
  extends Omit<ActionBarProps, "actions" | "status" | "statusRef"> {
  /** The working configuration differs from the last requested snapshot. */
  readonly dirty: boolean;
  /**
   * Where focus goes after either action when the handler names no target.
   * `"status"`, the default, moves it to the status line, because the button
   * that was pressed usually disables itself. Pass `"none"` where the panel
   * moves focus later on its own. A save that validates and sends focus to the
   * field it refused returns that field from `onSave` instead.
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
  /**
   * Restores the configuration. A panel whose fields keep drafts calls
   * `useResetDrafts()` here too, so an invalid draft, which never committed
   * and so did not change with the configuration, is discarded with it.
   * Return an element or a ref to send focus there instead of the status.
   */
  readonly onDiscard: SaveActionBarAction;
  /**
   * Requests the save. A panel that validates on submit returns the first
   * field it refused, such as `validity.firstInvalid()` from
   * `useFieldValidity`, and the bar sends focus there once, after the handler
   * has run, instead of to the status. A field inside a collapsed section has
   * to be shown first: open the section inside `flushSync`, then return the
   * field.
   */
  readonly onSave: SaveActionBarAction;
  /**
   * The result the panel heard back for its last request, or nothing. The
   * status keeps its polite delivery for a failure too: the operator pressed
   * Save moments ago and focus stands on the status line, and Signal K Admin
   * raises its own alert for a failed request, so an assertive interruption
   * would add a second alarm rather than news.
   */
  readonly outcome?: SaveActionBarOutcome | null | undefined;
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
   * something other than the clock, such as a server confirmation. A value
   * no timer can wait out (not a number, endless, or past 2,147,483,647)
   * reads as zero.
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
  | "outcome"
  | "saveRequestedAt"
  | "saving"
  | "unconfigured"
>;

/**
 * The save rules shared by every configuration panel, as data so a consumer
 * can test them without rendering. Save is enabled while there is something
 * to save: edits, a plugin that has never been configured, or a request that
 * failed. Invalid input and an in-flight save block it.
 *
 * Every string falls back to the component's own default, so the rules a test
 * exercises are the rules the rendered bar runs.
 */
export function resolveSaveActionBarState(
  input: SaveActionBarStateInput,
): SaveActionBarState {
  return resolveStateWithLabels(
    input,
    resolveBundledLabels(
      SAVE_ACTION_BAR_LABEL_DEFAULTS,
      input.labels,
      undefined,
    ),
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
    outcome,
    saveRequestedAt,
    saving = false,
    unconfigured = false,
  }: SaveActionBarStateInput,
  labels: SaveActionBarLabels,
): SaveActionBarState {
  const validationMessage = trimmedText(invalidMessage ?? undefined);
  const outcomeMessage = trimmedText(outcome?.message);
  const outcomeTone = outcomeMessage === "" ? undefined : outcome?.tone;
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
      // Discard stays available even with nothing committed: an invalid
      // draft never commits, so it is the one edit there is to discard.
      discardDisabled: false,
      message: validationMessage,
      saveDisabled: true,
      tone: "danger",
    });
  }
  if (outcomeTone === "danger") {
    return saveState({
      discardDisabled: !dirty,
      message: outcomeMessage,
      saveDisabled: false,
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
  if (outcomeTone !== undefined) {
    return saveState({
      discardDisabled: true,
      message: outcomeMessage,
      saveDisabled: !unconfigured,
      tone: outcomeTone,
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
 * window is running: an unusable timestamp, or a consumer that keeps the
 * window itself with a duration of zero. A duration no timer can wait out,
 * which would close the window the moment it opened, reads as zero. A
 * timestamp ahead of this clock counts as now, so skew between the host and
 * the panel lengthens no window.
 */
function remainingWindowMs(
  saveRequestedAt: number,
  durationMs: number,
): number | null {
  if (!Number.isFinite(saveRequestedAt) || !isTimerDelay(durationMs)) {
    return null;
  }
  return Math.max(0, durationMs - Math.max(0, Date.now() - saveRequestedAt));
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
    const remainingMs = remainingWindowMs(saveRequestedAt, durationMs);
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
    const remainingMs = remainingWindowMs(saveRequestedAt, durationMs);
    if (remainingMs === null) return undefined;
    return startTimer(() => {
      setClosedRequestAt(saveRequestedAt);
    }, remainingMs);
  }, [closed, durationMs, saveRequestedAt]);

  return closed;
}

/**
 * The element a handler's return value names, or null for none. The value is
 * read defensively, because a handler typed to return nothing can still hand
 * back something, such as the promise of an async handler.
 */
function focusTargetElement(
  returned: unknown,
  ownerWindow: Document["defaultView"],
): HTMLElement | null {
  if (ownerWindow === null) return null;
  const target =
    typeof returned === "object" && returned !== null && "current" in returned
      ? returned.current
      : returned;
  return target instanceof ownerWindow.HTMLElement ? target : null;
}

/**
 * The Save and Discard footer of a configuration panel with its status line.
 * After either action, focus moves to the place the handler returned, or else
 * to the status, because the button that was pressed usually disables itself
 * and would otherwise drop focus to the body; a panel that owns the
 * destination passes `focusOnAction="none"`. Configuration state stays with
 * the consumer; this component owns presentation, focus, and how long the
 * saved message stays up.
 */
export function SaveActionBar({
  dirty,
  focusOnAction = "status",
  invalidMessage,
  labels: labelOverrides,
  onDiscard,
  onSave,
  outcome,
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
    () =>
      resolveBundledLabels(
        SAVE_ACTION_BAR_LABEL_DEFAULTS,
        labelOverrides,
        bundledLabels,
      ),
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
      outcome,
      saveRequestedAt: savedWindowClosed ? null : saveRequestedAt,
      saving,
      unconfigured,
    },
    labels,
  );

  // Focus moves once, after the action has run, and still before the
  // re-render that disables the pressed button, because React commits the
  // handler's updates after the event.
  const runAction = (action: SaveActionBarAction): void => {
    const ownerDocument = statusRef.current?.ownerDocument;
    const pressed =
      ownerDocument === undefined ? null : focusedElement(ownerDocument);
    const target = focusTargetElement(
      action(),
      ownerDocument?.defaultView ?? null,
    );
    if (target?.isConnected === true) {
      revealAndFocus(target);
      if (isFocused(target)) return;
    }
    const status = statusRef.current;
    if (focusOnAction !== "status" || status === null) return;
    // A handler that moved focus on its own keeps the destination it chose;
    // the status takes focus only from the pressed button, or from nowhere.
    if (
      !focusIsNowhere(status.ownerDocument) &&
      focusedElement(status.ownerDocument) !== pressed
    ) {
      return;
    }
    status.focus();
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
        <StatusIndicator
          id={statusId}
          tone={state.tone}
          live={state.live}
          // The status the bar mounts with describes the panel as it loaded,
          // which is not news, so it shows at once rather than a beat late.
          deferFirstMessage={false}
        >
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
