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
import {
  type AnnouncementMode,
  announcementRole,
} from "../utils/announcement.js";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";
import { attachRef, detachRef } from "../utils/ref.js";

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

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> &
  RefAttributes<HTMLInputElement> & {
    readonly type?: TextInputType | undefined;
  };

export function TextInput({
  className,
  ref,
  type = "text",
  ...props
}: TextInputProps): React.JSX.Element {
  return (
    <input
      {...props}
      ref={ref}
      type={type}
      className={classNames("snui-input", className)}
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
      const releaseRef = attachRef(ref, node);
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
        if (releaseRef !== undefined) releaseRef();
        else detachRef(ref);
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
  RefAttributes<HTMLTextAreaElement>;

export function Textarea({
  className,
  ref,
  ...props
}: TextareaProps): React.JSX.Element {
  return (
    <textarea
      {...props}
      ref={ref}
      className={classNames("snui-input", "snui-textarea", className)}
    />
  );
}

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    RefAttributes<HTMLInputElement> {
  readonly description?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly errorLive?: CheckboxErrorLive | undefined;
  /**
   * Re-asserted after every render and after a native form reset. A reset
   * restores checkedness from defaultChecked (or the controlled checked
   * prop) but never touches the indeterminate IDL property, so the
   * component re-applies this prop once the reset lands.
   */
  readonly indeterminate?: boolean | undefined;
  readonly label: ReactNode;
}

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
  ref,
  required,
  ...props
}: CheckboxProps): React.JSX.Element {
  if (!hasReactContent(label)) {
    throw new Error("Checkbox requires a non-empty label.");
  }

  const inputElement = useRef<HTMLInputElement | null>(null);

  // One callback ref owns the node so the caller ref and the form reset
  // listener attach and release exactly once per mount.
  const attachInput = useCallback(
    (node: HTMLInputElement): (() => void) => {
      inputElement.current = node;
      const releaseRef = attachRef(ref, node);
      const form = node.form;
      const handleReset = (): void => {
        // A native reset restores checkedness from defaultChecked but never
        // touches the indeterminate IDL property, so re-assert the
        // prop-driven state once the reset lands.
        queueMicrotask(() => {
          if (!node.isConnected) return;
          if (checked !== undefined) node.checked = checked;
          node.indeterminate = indeterminate ?? false;
        });
      };
      form?.addEventListener("reset", handleReset);
      return () => {
        form?.removeEventListener("reset", handleReset);
        inputElement.current = null;
        if (releaseRef !== undefined) releaseRef();
        else detachRef(ref);
      };
    },
    [checked, indeterminate, ref],
  );

  useLayoutEffect(() => {
    if (inputElement.current !== null) {
      inputElement.current.indeterminate = indeterminate ?? false;
    }
  });

  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  const descriptionId = hasDescription ? `${controlId}-description` : undefined;
  // A live region must exist before its content arrives, so the container is
  // mounted whenever announcements are requested and only its text varies.
  const announcesErrors = errorLive !== "off";
  const rendersError = hasError || announcesErrors;
  const errorId = rendersError ? `${controlId}-error` : undefined;
  const referencedErrorId = hasError ? errorId : undefined;
  const describedBy = joinIdReferences(
    ariaDescribedBy,
    descriptionId,
    referencedErrorId,
  );
  const errorMessage = joinIdReferences(ariaErrorMessage, referencedErrorId);

  return (
    <label
      className={classNames("snui-checkbox", className)}
      htmlFor={controlId}
    >
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
      <span id={labelId} className="snui-checkbox__label">
        {label}{" "}
        {required ? (
          <span className="snui-required-mark" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {hasDescription ? (
        <span id={descriptionId} className="snui-checkbox__description">
          {description}
        </span>
      ) : null}
      {rendersError ? (
        <span
          id={errorId}
          className="snui-checkbox__error"
          role={announcementRole(errorLive)}
          aria-live={errorLive}
        >
          {hasError ? error : null}
        </span>
      ) : null}
    </label>
  );
}
