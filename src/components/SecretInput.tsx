import { type ReactNode, useId, useLayoutEffect, useRef } from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { requireIdToken } from "../utils/aria.js";
import { markForwardsFieldControlProps } from "../utils/field-forwarding.js";
import {
  DEFAULT_HIDE_LABEL,
  DEFAULT_SHOW_LABEL,
  resolveBundledLabel,
} from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { Button } from "./Button.js";
import { TextInput, type TextInputProps } from "./Inputs.js";
import {
  InputGroup,
  InputGroupControl,
  type InputGroupControlWidth,
} from "./Layout.js";

export interface SecretInputProps extends Omit<TextInputProps, "type"> {
  readonly defaultRevealed?: boolean | undefined;
  /** Accessible and visible label for the conceal action. */
  readonly hideLabel?: string | undefined;
  readonly onRevealedChange?: ((revealed: boolean) => void) | undefined;
  readonly revealed?: boolean | undefined;
  /** Accessible and visible label for the reveal action. */
  readonly showLabel?: string | undefined;
  /** Content rendered after the input and before the visibility control. */
  readonly trailingContent?: ReactNode | undefined;
  /** How the input slot shares the row. Defaults to grow. */
  readonly controlWidth?: InputGroupControlWidth | undefined;
}

interface SelectionSnapshot {
  readonly end: number | null;
  readonly focused: boolean;
  readonly start: number | null;
}

// The group's own props reach the inner input untouched, so a LabeledField can
// take this control as an element child and still label the real input. The
// mark is annotated pure so an unused control is still dropped from a bundle.
export const SecretInput = /* @__PURE__ */ markForwardsFieldControlProps(
  function SecretInput({
    // A revealed secret is an ordinary text field to the browser, so the
    // defaults keep password managers, form history, keyboards, and spelling
    // services from capturing it. Each is a plain prop the caller can override.
    autoCapitalize = "off",
    autoComplete = "new-password",
    autoCorrect = "off",
    controlWidth = "grow",
    defaultRevealed = false,
    disabled,
    hideLabel,
    id,
    onRevealedChange,
    ref,
    revealed,
    showLabel,
    spellCheck = false,
    trailingContent,
    ...props
  }: SecretInputProps): React.JSX.Element {
    const generatedId = useId();
    // The id is spent on a relationship as well as on the input, and an id
    // carrying a space would point aria-controls at two ids that exist nowhere.
    const inputId =
      id === undefined ? generatedId : requireIdToken(id, "SecretInput id");
    const [effectiveRevealed, commitRevealed] = useControllableState(
      revealed,
      defaultRevealed,
      onRevealedChange,
    );
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectionRef = useRef<SelectionSnapshot | null>(null);

    const captureSelection = (): SelectionSnapshot => {
      const input = inputRef.current;
      return {
        end: input?.selectionEnd ?? null,
        focused: input?.ownerDocument.activeElement === input,
        start: input?.selectionStart ?? null,
      };
    };

    useLayoutEffect(() => {
      const input = inputRef.current;
      const selection = selectionRef.current;
      selectionRef.current = null;
      if (
        input === null ||
        selection === null ||
        !selection.focused ||
        input.type !== (effectiveRevealed ? "text" : "password")
      ) {
        return undefined;
      }
      const restoreSelection = (): void => {
        input.focus({ preventScroll: true });
        if (selection.start !== null && selection.end !== null) {
          input.setSelectionRange(selection.start, selection.end);
        }
      };
      restoreSelection();

      // Chromium can apply one final selection reset after changing an input's
      // type. Repeat the restoration in the next frame, after that native step.
      const ownerWindow = input.ownerDocument.defaultView;
      if (ownerWindow === null) return undefined;
      const frame = ownerWindow.requestAnimationFrame(() => {
        if (
          input.isConnected &&
          input.type === (effectiveRevealed ? "text" : "password")
        ) {
          restoreSelection();
        }
      });
      return () => {
        ownerWindow.cancelAnimationFrame(frame);
      };
    }, [effectiveRevealed]);

    const setRevealed = (next: boolean): void => {
      selectionRef.current ??= captureSelection();
      commitRevealed(next);
    };

    const panelLabels = usePanelLabels()?.secretInput;
    const effectiveShowLabel = resolveBundledLabel(
      showLabel,
      panelLabels?.show,
      DEFAULT_SHOW_LABEL,
    );
    const effectiveHideLabel = resolveBundledLabel(
      hideLabel,
      panelLabels?.hide,
      DEFAULT_HIDE_LABEL,
    );
    const attachInput = useNodeRef(inputRef, ref);

    return (
      <InputGroup>
        <InputGroupControl controlWidth={controlWidth}>
          <TextInput
            {...props}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            autoCorrect={autoCorrect}
            disabled={disabled}
            id={inputId}
            ref={attachInput}
            spellCheck={spellCheck}
            type={effectiveRevealed ? "text" : "password"}
          />
        </InputGroupControl>
        {trailingContent}
        <Button
          size="compact"
          // Points assistive technology at the field this toggle governs. It is
          // a relationship rather than a name: the button is still announced as
          // the action alone, so a form with several secrets announces a row of
          // buttons that all say Show.
          aria-controls={inputId}
          disabled={disabled}
          onPointerDown={(event) => {
            const selection = captureSelection();
            selectionRef.current = selection;
            // A pointer press on the reveal control should not destroy the
            // input's caret or selected range. Keyboard activation keeps its
            // normal focus behavior on the button.
            if (selection.focused) event.preventDefault();
          }}
          onClick={(event) => {
            // A press released away from the button never becomes a click and
            // leaves its snapshot behind. Keyboard activation reports no click
            // count, so it takes a fresh reading rather than restoring a caret
            // the user has already abandoned.
            if (event.detail === 0) selectionRef.current = captureSelection();
            setRevealed(!effectiveRevealed);
          }}
        >
          {effectiveRevealed ? effectiveHideLabel : effectiveShowLabel}
        </Button>
      </InputGroup>
    );
  },
);
