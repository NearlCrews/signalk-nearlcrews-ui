import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type TextInputType =
  | "email"
  | "password"
  | "search"
  | "tel"
  | "text"
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

export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(
  function RangeInput({ className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type="range"
        className={classNames("snui-range", className)}
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
  readonly label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      "aria-describedby": ariaDescribedBy,
      "aria-labelledby": ariaLabelledBy,
      className,
      description,
      id,
      label,
      required,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const labelId = `${controlId}-label`;
    const hasDescription = hasReactContent(description);
    const descriptionId = hasDescription
      ? `${controlId}-description`
      : undefined;

    return (
      <label
        className={classNames("snui-checkbox", className)}
        htmlFor={controlId}
      >
        <input
          {...props}
          ref={ref}
          id={controlId}
          type="checkbox"
          className="snui-checkbox__input"
          required={required}
          aria-labelledby={joinIdReferences(ariaLabelledBy, labelId)}
          aria-describedby={joinIdReferences(ariaDescribedBy, descriptionId)}
        />
        <span id={labelId} className="snui-checkbox__label">
          {label}{" "}
          {required ? (
            <>
              <span className="snui-required-mark" aria-hidden="true">
                *
              </span>
              <span className="snui-visually-hidden"> (required)</span>
            </>
          ) : null}
        </span>
        {hasDescription ? (
          <span id={descriptionId} className="snui-checkbox__description">
            {description}
          </span>
        ) : null}
      </label>
    );
  },
);
