import { type ButtonHTMLAttributes, forwardRef } from "react";

import { classNames } from "../utils/class-names.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly loading?: boolean;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      "aria-busy": ariaBusy,
      className,
      disabled,
      loading = false,
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={classNames(
          "snui-button",
          `snui-button--${variant}`,
          className,
        )}
        disabled={disabled === true || loading}
        aria-busy={loading ? true : ariaBusy}
      >
        {loading ? (
          <>
            <span className="snui-button__spinner" aria-hidden="true" />
            <span className="snui-visually-hidden">Working: </span>
          </>
        ) : null}
        {children}
      </button>
    );
  },
);
