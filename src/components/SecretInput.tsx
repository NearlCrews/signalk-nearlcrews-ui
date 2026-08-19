import {
  type ReactNode,
  type RefAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { resolveLabel } from "../utils/labels.js";
import { composeRef } from "../utils/ref.js";
import { Button } from "./Button.js";
import { TextInput, type TextInputProps } from "./Inputs.js";
import {
  InputGroup,
  InputGroupControl,
  type InputGroupControlWidth,
} from "./Layout.js";

export interface SecretInputProps
  extends Omit<TextInputProps, "type">,
    RefAttributes<HTMLInputElement> {
  readonly defaultRevealed?: boolean | undefined;
  /** Accessible and visible label for the conceal action. */
  readonly hideLabel?: string | undefined;
  readonly onRevealedChange?: ((revealed: boolean) => void) | undefined;
  readonly revealed?: boolean | undefined;
  /** Content rendered after the input and before the visibility control. */
  readonly trailingContent?: ReactNode | undefined;
  /** Width behavior for the input slot. Defaults to grow. */
  readonly width?: InputGroupControlWidth | undefined;
  /** Accessible and visible label for the reveal action. */
  readonly showLabel?: string | undefined;
}

interface SelectionSnapshot {
  readonly end: number | null;
  readonly focused: boolean;
  readonly start: number | null;
}

export function SecretInput({
  defaultRevealed = false,
  disabled,
  hideLabel = "Hide",
  onRevealedChange,
  ref,
  revealed,
  showLabel = "Show",
  trailingContent,
  width = "grow",
  ...props
}: SecretInputProps): React.JSX.Element {
  const [internalRevealed, setInternalRevealed] = useState(defaultRevealed);
  const effectiveRevealed = revealed ?? internalRevealed;
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
      return;
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
    if (revealed === undefined) setInternalRevealed(next);
    onRevealedChange?.(next);
  };

  const effectiveShowLabel = resolveLabel(showLabel, "Show");
  const effectiveHideLabel = resolveLabel(hideLabel, "Hide");
  const attachInput = useCallback(
    (node: HTMLInputElement): (() => void) => {
      inputRef.current = node;
      const releaseRef = composeRef(ref, node);
      return () => {
        inputRef.current = null;
        releaseRef();
      };
    },
    [ref],
  );

  return (
    <InputGroup>
      <InputGroupControl width={width}>
        <TextInput
          {...props}
          disabled={disabled}
          ref={attachInput}
          type={effectiveRevealed ? "text" : "password"}
        />
      </InputGroupControl>
      {trailingContent}
      <Button
        type="button"
        size="compact"
        disabled={disabled}
        onPointerDown={(event) => {
          const selection = captureSelection();
          selectionRef.current = selection;
          // A pointer press on the reveal control should not destroy the
          // input's caret or selected range. Keyboard activation keeps its
          // normal focus behavior on the button.
          if (selection.focused) event.preventDefault();
        }}
        onClick={() => {
          setRevealed(!effectiveRevealed);
        }}
      >
        {effectiveRevealed ? effectiveHideLabel : effectiveShowLabel}
      </Button>
    </InputGroup>
  );
}
