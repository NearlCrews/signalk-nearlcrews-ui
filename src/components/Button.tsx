import { type ButtonHTMLAttributes, forwardRef, type MouseEvent } from "react";

import { classNames } from "../utils/class-names.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";
export type ButtonShape = "default" | "pill";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly ariaDisabled?: boolean;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly shape?: ButtonShape;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      ariaDisabled = false,
      children,
      "aria-busy": ariaBusy,
      "aria-disabled": nativeAriaDisabled,
      "aria-label": ariaLabel,
      className,
      disabled,
      loading = false,
      loadingLabel = "Working",
      onClick,
      shape = "default",
      size = "default",
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) {
    const isAriaDisabled =
      ariaDisabled ||
      nativeAriaDisabled === true ||
      nativeAriaDisabled === "true";
    const blocksActivation = isAriaDisabled || loading;
    const effectiveLoadingLabel = loadingLabel.trim() || "Working";
    const effectiveAriaLabel =
      loading && ariaLabel !== undefined
        ? `${effectiveLoadingLabel}: ${ariaLabel}`
        : ariaLabel;

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={classNames(
          "snui-button",
          `snui-button--${variant}`,
          `snui-button--size-${size}`,
          `snui-button--shape-${shape}`,
          className,
        )}
        disabled={disabled}
        aria-disabled={blocksActivation || undefined}
        aria-busy={loading ? true : ariaBusy}
        aria-label={effectiveAriaLabel}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (blocksActivation) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
      >
        {loading ? (
          <>
            <span className="snui-button__spinner" aria-hidden="true" />
            {ariaLabel === undefined ? (
              <>
                <span className="snui-visually-hidden">
                  {effectiveLoadingLabel}:
                </span>{" "}
              </>
            ) : null}
          </>
        ) : null}
        <span className="snui-button__content">{children}</span>
      </button>
    );
  },
);
