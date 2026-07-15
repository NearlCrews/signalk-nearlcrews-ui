import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from "react";
import { joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { hasReactContent } from "../utils/react-node.js";

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        type="text"
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
