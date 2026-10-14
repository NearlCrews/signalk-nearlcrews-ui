import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useControllableState } from "../hooks/use-controllable-state.js";
import { useNodeRef } from "../hooks/use-node-ref.js";
import { useIdToken } from "../utils/aria.js";
import { markForwardsFieldControlProps } from "../utils/field-forwarding.js";
import { isFocused } from "../utils/focus.js";
import { resolveBundledLabel } from "../utils/labels.js";
import {
  DEFAULT_HIDE_LABEL,
  DEFAULT_SHOW_LABEL,
} from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { VISUALLY_HIDDEN_CLASS } from "../version.js";
import { Button } from "./Button.js";
import { TextInput, type TextInputProps } from "./Inputs.js";
import {
  InputGroup,
  InputGroupControl,
  type InputGroupControlWidth,
} from "./Layout.js";

export interface SecretInputProps extends Omit<TextInputProps, "type"> {
  readonly defaultRevealed?: boolean | undefined;
  /**
   * Visible label for the conceal action. The button's accessible name goes on
   * to repeat the field's own name, so several secrets are told apart.
   */
  readonly hideLabel?: string | undefined;
  readonly onRevealedChange?: ((revealed: boolean) => void) | undefined;
  readonly revealed?: boolean | undefined;
  /**
   * Visible label for the reveal action. The button's accessible name goes on
   * to repeat the field's own name, so several secrets are told apart.
   */
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

/** Text a reader hears from a node, skipping any subtree hidden from them. */
function spokenText(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? "";
  if (node.nodeType !== 1) return "";
  if ((node as Element).getAttribute("aria-hidden") === "true") return "";
  let text = "";
  for (const child of node.childNodes) text += spokenText(child);
  return text;
}

/**
 * The words that name the field, read from the elements that label it: the
 * ones its `aria-labelledby` names, else its `aria-label`, else its `<label>`
 * elements. The reveal button repeats them so it is told apart from the one
 * beside every other secret.
 */
function fieldNameOf(input: HTMLInputElement): string {
  const labelledBy = input.getAttribute("aria-labelledby")?.trim() ?? "";
  const ariaLabel = input.getAttribute("aria-label")?.trim() ?? "";
  const sources: Node[] = [];
  if (labelledBy !== "") {
    for (const id of labelledBy.split(/\s+/)) {
      const source = input.ownerDocument.getElementById(id);
      if (source !== null) sources.push(source);
    }
  } else if (ariaLabel !== "") {
    return ariaLabel;
  } else {
    sources.push(...(input.labels ?? []));
  }
  return sources.map(spokenText).join(" ").replace(/\s+/g, " ").trim();
}

/** Where the field's caret or selection sits, and whether it holds focus. */
function readSelection(input: HTMLInputElement | null): SelectionSnapshot {
  return {
    end: input?.selectionEnd ?? null,
    focused: input !== null && isFocused(input),
    start: input?.selectionStart ?? null,
  };
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
    const inputId = useIdToken(id, "SecretInput id");
    const [effectiveRevealed, commitRevealed] = useControllableState(
      revealed,
      defaultRevealed,
      onRevealedChange,
    );
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectionRef = useRef<SelectionSnapshot | null>(null);
    const inputType = effectiveRevealed ? "text" : "password";

    useLayoutEffect(() => {
      const input = inputRef.current;
      const selection = selectionRef.current;
      selectionRef.current = null;
      if (
        input === null ||
        selection === null ||
        !selection.focused ||
        input.type !== inputType
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
        if (input.isConnected && input.type === inputType) restoreSelection();
      });
      return () => {
        ownerWindow.cancelAnimationFrame(frame);
      };
    }, [inputType]);

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

    // A form with several secrets would otherwise list a row of buttons that
    // all say Show, so the button repeats the field's name after its visible
    // word. The props carry every way a field is labeled, its `aria-label`,
    // its `aria-labelledby`, and the new props a LabeledField passes when its
    // label changes, and they arrive as a new object on each render, so the
    // name is read again after each one; an unchanged name bails out of
    // rendering again.
    const [fieldName, setFieldName] = useState("");
    useLayoutEffect(() => {
      const input = inputRef.current;
      if (input !== null) setFieldName(fieldNameOf(input));
    }, [props]);

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
            type={inputType}
          />
        </InputGroupControl>
        {trailingContent}
        <Button
          size="compact"
          // Points assistive technology at the field this toggle governs, a
          // relationship beside the name the hidden suffix gives it.
          aria-controls={inputId}
          disabled={disabled}
          onPointerDown={(event) => {
            const selection = readSelection(inputRef.current);
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
            // the user has already abandoned, as does a click that arrived
            // with no pointer press before it.
            if (event.detail === 0 || selectionRef.current === null) {
              selectionRef.current = readSelection(inputRef.current);
            }
            commitRevealed(!effectiveRevealed);
          }}
        >
          {effectiveRevealed ? effectiveHideLabel : effectiveShowLabel}
          {fieldName === "" ? null : (
            // The space sits outside the hidden span, so every name
            // computation keeps the two words apart; a trailing space at the
            // end of the visible line collapses away.
            <>
              {" "}
              <span className={VISUALLY_HIDDEN_CLASS}>{fieldName}</span>
            </>
          )}
        </Button>
      </InputGroup>
    );
  },
);
