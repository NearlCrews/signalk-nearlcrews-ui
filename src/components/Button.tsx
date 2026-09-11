import {
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { blockActivationKeys, blockClick } from "../utils/activation.js";
import { hasAccessibleName, joinIdReferences } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { isDevelopment } from "../utils/environment.js";
import { DEFAULT_LOADING_LABEL, resolveLabel } from "../utils/labels.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";
export type ButtonShape = "default" | "pill";

interface ButtonCommonProps {
  /**
   * Blocks activation while the control stays focusable. When set, it takes
   * precedence over a native `aria-disabled` attribute; when omitted, the
   * native attribute is read instead.
   */
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

/**
 * Props both element forms consume before anything reaches the DOM. Listing
 * them once lets one destructure serve the button and the anchor.
 */
type SharedButtonPropKey =
  | keyof ButtonCommonProps
  | "aria-busy"
  | "aria-describedby"
  | "aria-disabled"
  | "aria-label"
  | "aria-labelledby"
  | "children"
  | "className";

interface ButtonState<Props extends ButtonProps> {
  readonly blocksActivation: boolean;
  readonly dom: {
    readonly "aria-busy": AriaAttributes["aria-busy"];
    readonly "aria-describedby": string | undefined;
    readonly "aria-disabled": true | undefined;
    readonly "aria-label": string | undefined;
    readonly "aria-labelledby": string | undefined;
    readonly children: ReactNode;
    readonly className: string;
  };
  /** Everything the element form still has to place itself. */
  readonly rest: Omit<Props, SharedButtonPropKey>;
}

function useButtonState<Props extends ButtonProps>(
  props: Props,
): ButtonState<Props> {
  const {
    "aria-busy": ariaBusy,
    "aria-describedby": ariaDescribedBy,
    "aria-disabled": nativeAriaDisabled,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ariaDisabled,
    children,
    className,
    fullWidth = false,
    iconOnly = false,
    loading = false,
    loadingLabel,
    shape = "default",
    size = "default",
    variant = "secondary",
    ...rest
  } = props;

  if (iconOnly && !hasAccessibleName(ariaLabel, ariaLabelledBy)) {
    throw new Error(
      "Button with iconOnly requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  }

  // The camelCase prop is the documented spelling, so when it is set it
  // decides; the native attribute only counts while the prop is absent.
  const isAriaDisabled =
    ariaDisabled ??
    (nativeAriaDisabled === true || nativeAriaDisabled === "true");
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
    rest,
  };
}

/** Enter and Space press a button; "Spacebar" is the legacy key name. */
const BUTTON_ACTIVATION_KEYS = new Set(["Enter", " ", "Spacebar"]);

const SAFE_ANCHOR_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Hrefs already reported, so a rejected destination warns once per value
 * rather than once per render.
 */
const REPORTED_UNSAFE_HREFS = new Set<string>();

function warnUnsafeHref(href: string): void {
  if (!isDevelopment() || REPORTED_UNSAFE_HREFS.has(href)) return;
  REPORTED_UNSAFE_HREFS.add(href);
  console.warn(
    `Button rejected the href ${JSON.stringify(href)}: only http, https, mailto, tel, fragment, query, and relative destinations are allowed. The anchor renders inert.`,
  );
}

function safeAnchorHref(href: string): string | undefined {
  const trimmedHref = href.trim();
  if (trimmedHref.length === 0) {
    warnUnsafeHref(href);
    return undefined;
  }

  try {
    const parsed = new URL(
      trimmedHref,
      "https://signalk-nearlcrews-ui.invalid/",
    );
    if (SAFE_ANCHOR_PROTOCOLS.has(parsed.protocol)) return trimmedHref;
  } catch {
    // Unparseable hrefs fall through to the rejection below.
  }
  warnUnsafeHref(href);
  return undefined;
}

function NativeButton(props: ButtonAsButtonProps): React.JSX.Element {
  const { blocksActivation, dom, rest } = useButtonState(props);
  const {
    as: Component = "button",
    disabled,
    onClick,
    onKeyDown,
    ref,
    type = "button",
    ...buttonProps
  } = rest;

  return (
    <Component
      {...buttonProps}
      {...dom}
      // A natively disabled button already exposes its state; aria-disabled
      // beside it would describe the same control twice.
      aria-disabled={disabled ? undefined : dom["aria-disabled"]}
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={blockClick(blocksActivation, onClick)}
      onKeyDown={blockActivationKeys(
        blocksActivation,
        BUTTON_ACTIVATION_KEYS,
        onKeyDown,
      )}
    />
  );
}

function AnchorButton(props: ButtonAsAnchorProps): React.JSX.Element {
  const state = useButtonState(props);
  const {
    as: Component,
    href,
    onClick,
    onKeyDown,
    ref,
    role,
    tabIndex,
    ...anchorProps
  } = state.rest;
  const safeHref = safeAnchorHref(href);
  const blocksActivation = state.blocksActivation || safeHref === undefined;

  return (
    <Component
      {...anchorProps}
      {...state.dom}
      ref={ref}
      href={blocksActivation ? undefined : safeHref}
      // An anchor without href maps to the generic role, so the link role is
      // restated while the destination is withheld; aria-disabled is valid
      // on a link.
      role={blocksActivation ? (role ?? "link") : role}
      tabIndex={blocksActivation ? (tabIndex ?? 0) : tabIndex}
      aria-disabled={blocksActivation || undefined}
      onClick={blockClick(blocksActivation, onClick)}
      onKeyDown={blockActivationKeys(
        blocksActivation,
        BUTTON_ACTIVATION_KEYS,
        onKeyDown,
      )}
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
