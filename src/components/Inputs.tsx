import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useCallback,
  useId,
  useImperativeHandle,
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

export type TextInputType =
  | "date"
  | "datetime-local"
  | "email"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url";

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  readonly type?: TextInputType;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, type = "text", ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type={type}
        className={classNames("snui-input", className)}
      />
    );
  },
);

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type="number"
        className={classNames("snui-input", className)}
      />
    );
  },
);

export type RangeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

function setRangeProgress(element: HTMLInputElement): void {
  const minimum = Number(element.min || "0");
  const maximum = Number(element.max || "100");
  const span = maximum - minimum;
  const ratio = span > 0 ? (Number(element.value) - minimum) / span : 0;
  const percent = Math.min(Math.max(ratio * 100, 0), 100);
  const safePercent = Number.isFinite(percent) ? percent : 0;
  element.style.setProperty("--snui-range-progress", `${String(safePercent)}%`);
}

export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  function RangeInput({ className, onInput, ...props }, ref) {
    const inputElement = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => {
      if (inputElement.current === null) {
        throw new Error("RangeInput could not resolve its input element.");
      }
      return inputElement.current;
    }, []);

    const attachInput = useCallback((node: HTMLInputElement | null): void => {
      inputElement.current = node;
      if (node !== null) setRangeProgress(node);
    }, []);

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
  },
);

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        {...props}
        ref={ref}
        className={classNames("snui-input", "snui-select", className)}
      />
    );
  },
);

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        className={classNames("snui-input", "snui-textarea", className)}
      />
    );
  },
);

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> {
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly errorLive?: CheckboxErrorLive;
  readonly indeterminate?: boolean;
  readonly label: ReactNode;
}

export type CheckboxErrorLive = AnnouncementMode;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      "aria-invalid": ariaInvalid,
      "aria-labelledby": ariaLabelledBy,
      className,
      description,
      error,
      errorLive = "off",
      id,
      indeterminate,
      label,
      required,
      ...props
    },
    ref,
  ) {
    if (!hasReactContent(label)) {
      throw new Error("Checkbox requires a non-empty label.");
    }

    const inputElement = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => {
      if (inputElement.current === null) {
        throw new Error("Checkbox could not resolve its input element.");
      }
      return inputElement.current;
    }, []);

    useLayoutEffect(() => {
      if (indeterminate !== undefined && inputElement.current !== null) {
        inputElement.current.indeterminate = indeterminate;
      }
    });

    const generatedId = useId();
    const controlId = id ?? generatedId;
    const labelId = `${controlId}-label`;
    const hasDescription = hasReactContent(description);
    const hasError = hasReactContent(error);
    const descriptionId = hasDescription
      ? `${controlId}-description`
      : undefined;
    const errorId = hasError ? `${controlId}-error` : undefined;
    const describedBy = joinIdReferences(
      ariaDescribedBy,
      descriptionId,
      errorId,
    );
    const errorMessage = joinIdReferences(ariaErrorMessage, errorId);

    return (
      <label
        className={classNames("snui-checkbox", className)}
        htmlFor={controlId}
      >
        <input
          {...props}
          ref={inputElement}
          id={controlId}
          type="checkbox"
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
        {hasError ? (
          <span
            id={errorId}
            className="snui-checkbox__error"
            role={announcementRole(errorLive)}
            aria-live={errorLive}
          >
            {error}
          </span>
        ) : null}
      </label>
    );
  },
);
