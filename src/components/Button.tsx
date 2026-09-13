import {
  type AnchorHTMLAttributes,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
  useMemo,
} from "react";

import {
  blockedActivationProps,
  resolveAriaDisabled,
} from "../utils/activation.js";
import { joinIdReferences, requireAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { DEFAULT_LOADING_LABEL, resolveBundledLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import { hasReactContent } from "../utils/react-node.js";
import type { Density } from "../utils/variants.js";
import { warnOnce } from "../utils/warn-once.js";

/**
 * `"text"` is the list-line form: it keeps the control height, the focus
 * ring, and the blocked and busy behavior, and drops the centering and the
 * horizontal padding, so a dense row reads left to right beside its own
 * columns instead of hand-styling a bare native button.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "text";
/** Alias of the shared {@link Density} vocabulary. */
export type ButtonSize = Density;
export type ButtonShape = "default" | "pill";

interface ButtonCommonProps {
  /**
   * Blocks activation while the control stays focusable. When set, it takes
   * precedence over a native `aria-disabled` attribute; when omitted, the
   * native attribute is read instead.
   */
  readonly ariaDisabled?: boolean | undefined;
  /**
   * Why the button refuses, exposed as its description while `ariaDisabled`
   * holds and dropped once the button is live. A blocked button with no
   * reason is unfinished: the whole point of `ariaDisabled` over native
   * `disabled` is that the control stays reachable, so the explanation has to
   * be reachable too. It pairs with `ariaDisabled` rather than with native
   * `disabled`, which takes the button out of the tab order where a keyboard
   * user never reaches the reason.
   */
  readonly disabledReason?: ReactNode | undefined;
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
 * Props for the icon-only case, with the accessible name required at compile
 * time rather than left to the render-time throw.
 *
 * The general props bag cannot require it, because `aria-label` and
 * `aria-labelledby` are inherited HTML attributes and nothing ties them to
 * `iconOnly`. Annotate an icon button's props with this where they are
 * assembled, and the throw stays the fallback for props built by a spread.
 */
export type IconOnlyButtonProps =
  | (ButtonProps & {
      readonly "aria-label": string;
      readonly iconOnly: true;
    })
  | (ButtonProps & {
      readonly "aria-labelledby": string;
      readonly iconOnly: true;
    });

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
    disabledReason,
    fullWidth = false,
    iconOnly = false,
    loading = false,
    loadingLabel,
    shape = "default",
    size = "default",
    variant = "secondary",
    ...rest
  } = props;

  if (iconOnly) {
    requireAccessibleName("Button with iconOnly", ariaLabel, ariaLabelledBy);
  }

  const isAriaDisabled = resolveAriaDisabled(ariaDisabled, nativeAriaDisabled);
  const blocksActivation = isAriaDisabled || loading;
  const effectiveLoadingLabel = resolveBundledLabel(
    loadingLabel,
    usePanelLabels()?.button?.loading,
    DEFAULT_LOADING_LABEL,
  );
  const baseId = useId();
  const loadingId = `${baseId}-loading`;
  const reasonId = `${baseId}-reason`;
  const showsReason = isAriaDisabled && hasReactContent(disabledReason);

  return {
    blocksActivation,
    // Presentation and naming are identical for both elements, so the two
    // forms spread one object rather than restating every attribute.
    dom: {
      "aria-busy": loading ? true : ariaBusy,
      "aria-describedby": joinIdReferences(
        ariaDescribedBy,
        loading ? loadingId : undefined,
        showsReason ? reasonId : undefined,
      ),
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
               * different control to assistive technology, so this node is
               * hidden from the name computation, which walks the button's own
               * subtree, and reached only through aria-describedby, which
               * includes a hidden element it references directly.
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
          {showsReason ? (
            // The refusal is a description for the same reason the busy label
            // is: the button keeps the name it had before it was blocked.
            <span
              id={reasonId}
              className="snui-visually-hidden"
              aria-hidden="true"
            >
              {disabledReason}
            </span>
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

const SAFE_ANCHOR_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function warnUnsafeHref(href: string): void {
  warnOnce(
    `button-href:${href}`,
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
      // The blocked state and both activation guards travel together, and a
      // natively disabled button is left to expose its own state.
      {...blockedActivationProps<HTMLButtonElement>({
        blocked: blocksActivation,
        disabled,
        onClick,
        onKeyDown,
      })}
      ref={ref}
      type={type}
      disabled={disabled}
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
    rel,
    role,
    tabIndex,
    target,
    ...anchorProps
  } = state.rest;
  // Parsing a URL and catching its failure is not free, and an href rarely
  // changes while a panel is open.
  const safeHref = useMemo(() => safeAnchorHref(href), [href]);
  const blocksActivation = state.blocksActivation || safeHref === undefined;

  return (
    <Component
      {...anchorProps}
      {...state.dom}
      ref={ref}
      href={blocksActivation ? undefined : safeHref}
      target={target}
      // A new browsing context otherwise carries the panel's own origin, the
      // vessel's local server address and port, to the destination as a
      // Referer. The caller's own rel decides where one is given.
      rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
      // An anchor without href maps to the generic role, so the link role is
      // restated while the destination is withheld; aria-disabled is valid
      // on a link.
      role={blocksActivation ? (role ?? "link") : role}
      tabIndex={blocksActivation ? (tabIndex ?? 0) : tabIndex}
      // An anchor has no native disabled state, so the blocked state and both
      // activation guards are the whole of the refusal here.
      {...blockedActivationProps<HTMLAnchorElement>({
        blocked: blocksActivation,
        onClick,
        onKeyDown,
      })}
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
