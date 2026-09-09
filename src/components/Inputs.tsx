import {
  type InputHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
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

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-invalid": ariaInvalid,
  "aria-labelledby": ariaLabelledBy,
  checked,
  className,
  description,
  error,
  errorLive = "off",
  id,
  indeterminate,
  label,
  labelVisibility = "visible",
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
          required={required}
          aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
          aria-describedby={describedBy}
          aria-errormessage={errorMessage}
          aria-invalid={hasError ? true : ariaInvalid}
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
