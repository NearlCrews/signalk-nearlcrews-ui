import { type ReactNode, useRef } from "react";

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

export interface SaveActionBarProps
  extends Omit<ActionBarProps, "actions" | "status" | "statusRef"> {
  /** The working configuration differs from the last requested snapshot. */
  readonly dirty: boolean;
  /**
   * A validation message that blocks saving, or nothing when the form is
   * valid. It becomes the status text and is not announced again, because the
   * field that failed already announced it.
   */
  readonly invalidMessage?: string | null | undefined;
  readonly labels?: Partial<SaveActionBarLabels> | undefined;
  readonly onDiscard: () => void;
  readonly onSave: () => void;
  /** Epoch milliseconds of the last save request, or null before the first. */
  readonly saveRequestedAt?: number | null | undefined;
  /** Status text once a save has been requested and nothing is pending. */
  readonly savedMessage?: string | undefined;
  readonly saving?: boolean | undefined;
  /**
   * The host supplied no configuration, so the plugin has never been set up.
   * Save stays enabled so the defaults can be requested without an edit.
   */
  readonly unconfigured?: boolean | undefined;
}

export interface SaveActionBarState {
  readonly discardDisabled: boolean;
  readonly live: AnnouncementMode;
  readonly message: string;
  readonly saveDisabled: boolean;
  readonly tone: StatusTone;
}

interface SaveActionBarStateInput {
  readonly dirty: boolean;
  readonly invalidMessage: string | null | undefined;
  readonly labels: SaveActionBarLabels;
  readonly savedMessage: string;
  readonly saveRequestedAt: number | null | undefined;
  readonly saving: boolean;
  readonly unconfigured: boolean;
}

/**
 * The save rules shared by every configuration panel, as data so a consumer
 * can test them without rendering. Save is enabled while there is something
 * to save: edits, or a plugin that has never been configured. Invalid input
 * and an in-flight save block it.
 */
export function resolveSaveActionBarState({
  dirty,
  invalidMessage,
  labels,
  savedMessage,
  saveRequestedAt,
  saving,
  unconfigured,
}: SaveActionBarStateInput): SaveActionBarState {
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
      live: "off",
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
      message: savedMessage,
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
 * The Save and Discard footer of a configuration panel with its status line.
 * After either action, focus moves to the status, because the button that was
 * pressed usually disables itself and would otherwise drop focus to the body.
 * State stays with the consumer; this component owns presentation and focus.
 */
export function SaveActionBar({
  dirty,
  invalidMessage,
  labels: labelOverrides,
  onDiscard,
  onSave,
  saveRequestedAt,
  savedMessage,
  saving = false,
  sticky = "viewport-bottom",
  unconfigured = false,
  ...props
}: SaveActionBarProps): React.JSX.Element {
  const statusRef = useRef<HTMLDivElement>(null);
  const labels = resolveLabels(labelOverrides);
  const state = resolveSaveActionBarState({
    dirty,
    invalidMessage,
    labels,
    savedMessage: resolveLabel(savedMessage, DEFAULT_SAVED_MESSAGE),
    saveRequestedAt,
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
