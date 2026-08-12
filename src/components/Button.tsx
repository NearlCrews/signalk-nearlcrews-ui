import {
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { hasAccessibleName, joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { DEFAULT_LOADING_LABEL, resolveLabel } from "../utils/labels.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";
export type ButtonShape = "default" | "pill";

interface ButtonCommonProps {
  readonly ariaDisabled?: boolean | undefined;
  readonly fullWidth?: boolean | undefined;
  readonly iconOnly?: boolean | undefined;
  readonly loading?: boolean | undefined;
  readonly loadingLabel?: string | undefined;
  readonly shape?: ButtonShape | undefined;
  readonly size?: ButtonSize | undefined;
  readonly variant?: ButtonVariant | undefined;
}

export interface ButtonAsButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    RefAttributes<HTMLButtonElement>,
    ButtonCommonProps {
  readonly as?: "button" | undefined;
  // href belongs to the anchor form only; declaring it here keeps JSX from
  // silently accepting it on a native button.
  readonly href?: undefined;
}

export interface ButtonAsAnchorProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    RefAttributes<HTMLAnchorElement>,
    ButtonCommonProps {
  readonly as: "a";
  readonly href: string;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

interface ButtonStateInput {
  readonly ariaBusy?: AriaAttributes["aria-busy"];
  readonly ariaDescribedBy?: string | undefined;
  readonly ariaDisabled: boolean;
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledBy?: string | undefined;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
  readonly fullWidth: boolean;
  readonly iconOnly: boolean;
  readonly loading: boolean;
  readonly loadingLabel: string;
  readonly nativeAriaDisabled?: AriaAttributes["aria-disabled"];
  readonly shape: ButtonShape;
  readonly size: ButtonSize;
  readonly variant: ButtonVariant;
}

function useButtonState({
  ariaBusy,
  ariaDescribedBy,
  ariaDisabled,
  ariaLabel,
  ariaLabelledBy,
  children,
  className,
  fullWidth,
  iconOnly,
  loading,
  loadingLabel,
  nativeAriaDisabled,
  shape,
  size,
  variant,
}: ButtonStateInput) {
  if (iconOnly && !hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "Button with iconOnly requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  }

  const isAriaDisabled =
    ariaDisabled ||
    nativeAriaDisabled === true ||
    nativeAriaDisabled === "true";
  const blocksActivation = isAriaDisabled || loading;
  const effectiveLoadingLabel = resolveLabel(
    loadingLabel,
    DEFAULT_LOADING_LABEL,
  );
  const loadingId = useId();

  return {
    blocksActivation,
    // Presentation and naming are identical for both elements, so the two
    // forms spread one object rather than restating every attribute.
    dom: {
      "aria-busy": loading ? true : ariaBusy,
      "aria-describedby": joinIdReferences(
        ariaDescribedBy,
        loading ? loadingId : undefined,
      ),
      "aria-disabled": blocksActivation || undefined,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      children: (
        <>
          {loading ? (
            <>
              <span className="snui-button__spinner" aria-hidden="true" />
              {/*
               * Busy state is a description, not part of the name. Rewriting
               * the accessible name mid-interaction makes the button read as a
               * different control to assistive technology.
               */}
              <span
                id={loadingId}
                className="snui-visually-hidden"
                aria-hidden="true"
              >
                {effectiveLoadingLabel}
              </span>
            </>
          ) : null}
          <span className="snui-button__content">{children}</span>
        </>
      ),
      className: classNames(
        "snui-button",
        `snui-button--${variant}`,
        `snui-button--size-${size}`,
        `snui-button--shape-${shape}`,
        fullWidth ? "snui-button--full-width" : undefined,
        iconOnly ? "snui-button--icon-only" : undefined,
        className,
      ),
    },
  };
}

function guardClick<TElement>(
  blocksActivation: boolean,
  onClick: MouseEventHandler<TElement> | undefined,
): MouseEventHandler<TElement> {
  return (event) => {
    if (blocksActivation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };
}

function guardKeyDown<TElement>(
  blocksActivation: boolean,
  onKeyDown: KeyboardEventHandler<TElement> | undefined,
): KeyboardEventHandler<TElement> {
  return (event) => {
    // Activation keys stay blocked while the control is inert, but
    // navigation and dismissal keys must still reach the consumer.
    if (
      blocksActivation &&
      (event.key === "Enter" || event.key === " " || event.key === "Spacebar")
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onKeyDown?.(event);
  };
}

const SAFE_ANCHOR_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function safeAnchorHref(href: string): string | undefined {
  const trimmedHref = href.trim();
  if (trimmedHref.length === 0) return undefined;

  try {
    const parsed = new URL(
      trimmedHref,
      "https://signalk-nearlcrews-ui.invalid/",
    );
    return SAFE_ANCHOR_PROTOCOLS.has(parsed.protocol) ? trimmedHref : undefined;
  } catch {
    return undefined;
  }
}

function NativeButton({
  "aria-busy": ariaBusy,
  "aria-describedby": ariaDescribedBy,
  "aria-disabled": nativeAriaDisabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ariaDisabled = false,
  as: Component = "button",
  children,
  className,
  disabled,
  fullWidth = false,
  iconOnly = false,
  loading = false,
  loadingLabel = DEFAULT_LOADING_LABEL,
  onClick,
  onKeyDown,
  ref,
  shape = "default",
  size = "default",
  type = "button",
  variant = "secondary",
  ...buttonProps
}: ButtonAsButtonProps): React.JSX.Element {
  const state = useButtonState({
    ariaBusy,
    ariaDescribedBy,
    ariaDisabled,
    ariaLabel,
    ariaLabelledBy,
    children,
    className,
    fullWidth,
    iconOnly,
    loading,
    loadingLabel,
    nativeAriaDisabled,
    shape,
    size,
    variant,
  });

  return (
    <Component
      {...buttonProps}
      {...state.dom}
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={guardClick(state.blocksActivation, onClick)}
      onKeyDown={guardKeyDown(state.blocksActivation, onKeyDown)}
    />
  );
}

function AnchorButton({
  "aria-busy": ariaBusy,
  "aria-describedby": ariaDescribedBy,
  "aria-disabled": nativeAriaDisabled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ariaDisabled = false,
  as: Component,
  children,
  className,
  fullWidth = false,
  href,
  iconOnly = false,
  loading = false,
  loadingLabel = DEFAULT_LOADING_LABEL,
  onClick,
  onKeyDown,
  ref,
  shape = "default",
  size = "default",
  tabIndex,
  variant = "secondary",
  ...anchorProps
}: ButtonAsAnchorProps): React.JSX.Element {
  const state = useButtonState({
    ariaBusy,
    ariaDescribedBy,
    ariaDisabled,
    ariaLabel,
    ariaLabelledBy,
    children,
    className,
    fullWidth,
    iconOnly,
    loading,
    loadingLabel,
    nativeAriaDisabled,
    shape,
    size,
    variant,
  });
  const safeHref = safeAnchorHref(href);
  const blocksActivation = state.blocksActivation || safeHref === undefined;

  return (
    <Component
      {...anchorProps}
      {...state.dom}
      ref={ref}
      href={blocksActivation ? undefined : safeHref}
      tabIndex={blocksActivation ? (tabIndex ?? 0) : tabIndex}
      aria-disabled={blocksActivation || undefined}
      onClick={guardClick(blocksActivation, onClick)}
      onKeyDown={guardKeyDown(blocksActivation, onKeyDown)}
    />
  );
}

export function Button(props: ButtonProps): React.JSX.Element {
  return props.as === "a" ? (
    <AnchorButton {...props} />
  ) : (
    <NativeButton {...props} />
  );
}
