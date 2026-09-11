import {
  type InputHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type RefAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { RANGE_STYLES } from "../styles/range.js";
import { TEXTAREA_STYLES } from "../styles/textarea.js";
import { useOptionalModuleStyles } from "../styles/use-module-styles.js";
import {
  blockActivationKeys,
  blockChange,
  blockClick,
} from "../utils/activation.js";
import type { AnnouncementMode } from "../utils/announcement.js";
import { joinIdReferences, resolveDescriptionId } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveFieldError } from "../utils/field-error.js";
import { hasReactContent, requireContent } from "../utils/react-node.js";
import { composeRef } from "../utils/ref.js";
import { FieldError } from "./FieldError.js";

export type TextInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "month"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

/** Props shared by the text-like controls that can show identifiers. */
export interface MonospaceControlProps {
  /** Renders the value in the panel's monospace stack, for keys, paths, and identifiers. */
  readonly monospace?: boolean | undefined;
}

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement> &
  MonospaceControlProps & {
    readonly type?: TextInputType | undefined;
  };

export function TextInput({
  className,
  monospace = false,
  ref,
  type = "text",
  ...props
}: TextInputProps): React.JSX.Element {
  return (
    <input
      {...props}
      ref={ref}
      type={type}
      className={classNames(
        "snui-input",
        monospace && "snui-input--monospace",
        className,
      )}
    />
  );
}

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement>;

export function NumberInput({
  className,
  ref,
  ...props
}: NumberInputProps): React.JSX.Element {
  return (
    <input
      {...props}
      ref={ref}
      type="number"
      className={classNames("snui-input", className)}
    />
  );
}

export type RangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement>;

function setRangeProgress(element: HTMLInputElement): void {
  const minimum = Number(element.min || "0");
  const maximum = Number(element.max || "100");
  const span = maximum - minimum;
  const ratio = span > 0 ? (Number(element.value) - minimum) / span : 0;
  const percent = Math.min(Math.max(ratio * 100, 0), 100);
  const safePercent = Number.isFinite(percent) ? percent : 0;
  element.style.setProperty("--snui-range-progress", `${String(safePercent)}%`);
}

export function RangeInput({
  className,
  onInput,
  ref,
  ...props
}: RangeInputProps): React.JSX.Element {
  useOptionalModuleStyles(RANGE_STYLES);

  const inputElement = useRef<HTMLInputElement | null>(null);

  // One callback ref owns the node so the caller ref and the form reset
  // listener attach and release exactly once per mount.
  const attachInput = useCallback(
    (node: HTMLInputElement): (() => void) => {
      inputElement.current = node;
      setRangeProgress(node);
      const releaseRef = composeRef(ref, node);
      const form = node.form;
      const handleReset = (): void => {
        // The native reset restores defaultValue only after the reset event
        // finishes dispatching, so resync the fill once the value lands.
        queueMicrotask(() => {
          if (node.isConnected) setRangeProgress(node);
        });
      };
      form?.addEventListener("reset", handleReset);
      return () => {
        form?.removeEventListener("reset", handleReset);
        inputElement.current = null;
        releaseRef();
      };
    },
    [ref],
  );

  useLayoutEffect(() => {
    if (inputElement.current !== null) setRangeProgress(inputElement.current);
  });

  return (
    <input
      {...props}
      ref={attachInput}
      type="range"
      className={classNames("snui-range", className)}
      onInput={(event) => {
        const element = event.currentTarget;
        setRangeProgress(element);
        onInput?.(event);
        // Re-sync after React restores a rejected controlled value.
        queueMicrotask(() => {
          if (element.isConnected) setRangeProgress(element);
        });
      }}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  RefAttributes<HTMLSelectElement>;

export function Select({
  className,
  ref,
  ...props
}: SelectProps): React.JSX.Element {
  return (
    <select
      {...props}
      ref={ref}
      className={classNames("snui-input", "snui-select", className)}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  RefAttributes<HTMLTextAreaElement> &
  MonospaceControlProps & {
    /**
     * Rows the control shows before any content wraps. Replaces the default
     * minimum height, and where the browser supports content sizing the
     * control grows with its text from this floor.
     */
    readonly minRows?: number | undefined;
  };

export function Textarea({
  className,
  minRows,
  monospace = false,
  ref,
  rows,
  ...props
}: TextareaProps): React.JSX.Element {
  useOptionalModuleStyles(TEXTAREA_STYLES);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={rows ?? minRows}
      className={classNames(
        "snui-input",
        "snui-textarea",
        minRows === undefined ? undefined : "snui-textarea--rows",
        monospace && "snui-input--monospace",
        className,
      )}
    />
  );
}

export type CheckboxLabelVisibility = "hidden" | "visible";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    RefAttributes<HTMLInputElement> {
  /**
   * Blocks the state change while the box stays focusable, keeps its checked
   * state, and goes on submitting with its form. Reach for it where the value
   * is real but cannot be changed right now, such as the last remaining
   * selection in a list: native `disabled` takes the box out of the tab
   * order, so setting it on the box the user is standing on destroys their
   * focus. When set it decides; when omitted, a native `aria-disabled`
   * attribute is read instead. `Button.ariaDisabled` follows the same rule.
   */
  readonly ariaDisabled?: boolean | undefined;
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: AnnouncementMode | undefined;
  /**
   * Re-asserted after every render and after a native form reset. A reset
   * restores checkedness from defaultChecked (or the controlled checked
   * prop) but never touches the indeterminate IDL property, so the
   * component re-applies this prop once the reset lands.
   */
  readonly indeterminate?: boolean | undefined;
  /** Always names the control; `labelVisibility` decides whether it is drawn. */
  readonly label: ReactNode;
  /**
   * "hidden" keeps the label in the accessible name but takes it out of the
   * layout, for a checkbox in a table header, a card header, or a dense row.
   */
  readonly labelVisibility?: CheckboxLabelVisibility | undefined;
}

/** @deprecated Use {@link AnnouncementMode}. */
export type CheckboxErrorLive = AnnouncementMode;

/*
 * Space toggles a checkbox. Enter belongs to the surrounding form, not to
 * the box, so a blocked box still submits with the Enter key.
 */
const CHECKBOX_ACTIVATION_KEYS = new Set([" ", "Spacebar"]);

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-disabled": nativeAriaDisabled,
  "aria-errormessage": ariaErrorMessage,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledBy,
  ariaDisabled,
  checked,
  className,
  description,
  disabled,
  error,
  errorLive = "off",
  id,
  indeterminate,
  label,
  labelVisibility = "visible",
  onChange,
  onClick,
  onKeyDown,
  ref,
  required,
  ...props
}: CheckboxProps): React.JSX.Element {
  requireContent(label, "Checkbox requires a non-empty label.");

  const inputElement = useRef<HTMLInputElement | null>(null);
  const checkedRef = useRef(checked);
  const indeterminateRef = useRef(indeterminate);

  // One callback ref owns the node so the caller ref and the form reset
  // listener attach and release exactly once per mount.
  const attachInput = useCallback(
    (node: HTMLInputElement): (() => void) => {
      inputElement.current = node;
      const releaseRef = composeRef(ref, node);
      const form = node.form;
      const handleReset = (): void => {
        // A native reset restores checkedness from defaultChecked but never
        // touches the indeterminate IDL property, so re-assert the
        // prop-driven state once the reset lands.
        queueMicrotask(() => {
          if (!node.isConnected) return;
          if (checkedRef.current !== undefined) {
            node.checked = checkedRef.current;
          }
          node.indeterminate = indeterminateRef.current ?? false;
        });
      };
      form?.addEventListener("reset", handleReset);
      return () => {
        form?.removeEventListener("reset", handleReset);
        inputElement.current = null;
        releaseRef();
      };
    },
    [ref],
  );

  useLayoutEffect(() => {
    checkedRef.current = checked;
    indeterminateRef.current = indeterminate;
    if (inputElement.current !== null) {
      inputElement.current.indeterminate = indeterminate ?? false;
    }
  }, [checked, indeterminate]);

  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = resolveDescriptionId(controlId, hasDescription);
  const { errorId, referencedErrorId, rendersError } = resolveFieldError(
    controlId,
    hasError,
    errorLive,
  );
  const describedBy = joinIdReferences(
    ariaDescribedBy,
    descriptionId,
    referencedErrorId,
  );
  const errorMessage = joinIdReferences(ariaErrorMessage, referencedErrorId);

  const labelHidden = labelVisibility === "hidden";
  // The camelCase prop is the documented spelling, so when it is set it
  // decides; the native attribute only counts while the prop is absent.
  const blocksActivation =
    ariaDisabled ??
    (nativeAriaDisabled === true || nativeAriaDisabled === "true");

  const guardedClick = blockClick(blocksActivation, onClick);
  const handleClick: MouseEventHandler<HTMLInputElement> = (event) => {
    if (blocksActivation) {
      /*
       * The browser flips the box before it dispatches the click, and React
       * re-applies its own idea of the state once the event batch ends, after
       * every handler here has run. So the box is put back in a microtask,
       * which lands after that pass and still before the next paint, rather
       * than left to the canceled activation the click guard asks for.
       * Toggling also clears the mixed state, and the layout effect that
       * re-asserts it only runs on a render that a blocked click never causes.
       */
      const input = event.currentTarget;
      const restoredChecked = checked ?? !input.checked;
      const restoredIndeterminate = indeterminate ?? false;
      queueMicrotask(() => {
        if (!input.isConnected) return;
        input.checked = restoredChecked;
        input.indeterminate = restoredIndeterminate;
      });
    }
    guardedClick(event);
  };

  return (
    <div
      className={classNames(
        "snui-checkbox",
        labelHidden && "snui-checkbox--label-hidden",
        className,
      )}
    >
      {/*
       * The label wraps the box and its own text alone, the way LabeledField
       * does. A description or an error inside it would be part of the
       * label's activation area, so a touch user pressing a validation
       * message to read it would silently flip the setting. Both are already
       * referenced by aria-describedby and aria-errormessage, so moving them
       * out costs nothing.
       */}
      <label className="snui-checkbox__control" htmlFor={controlId}>
        <input
          {...props}
          ref={attachInput}
          id={controlId}
          type="checkbox"
          checked={checked}
          className="snui-checkbox__input"
          disabled={disabled}
          required={required}
          aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
          aria-describedby={describedBy}
          aria-errormessage={errorMessage}
          aria-invalid={hasError ? true : ariaInvalid}
          // A natively disabled box already exposes its state; aria-disabled
          // beside it would describe the same control twice.
          aria-disabled={
            disabled === true ? undefined : blocksActivation || undefined
          }
          // Canceling the click reverts the checkedness the browser applied
          // before dispatching it, which is the one route every pointer press
          // and the Space key all arrive through, the label included.
          onChange={blockChange(blocksActivation, onChange)}
          onClick={handleClick}
          onKeyDown={blockActivationKeys(
            blocksActivation,
            CHECKBOX_ACTIVATION_KEYS,
            onKeyDown,
          )}
        />
        <span
          id={labelId}
          className={classNames(
            "snui-checkbox__label",
            labelHidden && "snui-visually-hidden",
          )}
        >
          {label}{" "}
          {required ? (
            <span className="snui-required-mark" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      </label>
      {hasDescription ? (
        <span id={descriptionId} className="snui-checkbox__description">
          {description}
        </span>
      ) : null}
      {rendersError ? (
        <FieldError
          as="span"
          className="snui-checkbox__error"
          error={error}
          hasError={hasError}
          id={errorId}
          live={errorLive}
        />
      ) : null}
    </div>
  );
}
