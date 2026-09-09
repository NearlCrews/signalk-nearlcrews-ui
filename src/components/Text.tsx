import type { ReactNode } from "react";

import { classNames } from "../utils/class-names.js";
import {
  createPolymorphicElement,
  type PolymorphicProps,
} from "../utils/polymorphic.js";
import type { SemanticTone } from "../utils/tone.js";

export type TextElement = "span" | "p" | "div" | "small" | "strong" | "em";
export type TextTone = "neutral" | "muted" | SemanticTone;
export type TextSize = "base" | "sm" | "xs";

interface TextOwnProps {
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  /** Type step from the shared scale. */
  readonly size?: TextSize | undefined;
  /**
   * Color role. A semantic tone colors the text only; pair it with a visible
   * word or a `Badge` when the tone carries meaning, because color alone does
   * not.
   */
  readonly tone?: TextTone | undefined;
}

export type TextProps = PolymorphicProps<TextElement, "span", TextOwnProps>;

/**
 * Inline or block text in a package color and size, for hints, captions, and
 * secondary detail that consumers otherwise style by hand.
 */
export function Text({
  as = "span",
  className,
  size = "base",
  tone = "neutral",
  ...props
}: TextProps): React.JSX.Element {
  return createPolymorphicElement(as, {
    ...props,
    className: classNames(
      "snui-text",
      `snui-text--${tone}`,
      `snui-text--size-${size}`,
      className,
    ),
  });
}

export type CodeElement = "code" | "pre" | "kbd" | "samp";

interface CodeOwnProps {
  /** Renders a pre-formatted block that keeps line breaks and scrolls horizontally. */
  readonly block?: boolean | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export type CodeProps = PolymorphicProps<CodeElement, "code", CodeOwnProps>;

/**
 * Monospace text for identifiers such as Signal K paths, source labels, and
 * file names. Inline code wraps anywhere so a long path never overflows its
 * container; `block` keeps the author's line breaks instead.
 */
export function Code({
  as,
  block = false,
  className,
  ...props
}: CodeProps): React.JSX.Element {
  return createPolymorphicElement(as ?? (block ? "pre" : "code"), {
    // A block keeps the author's line breaks and scrolls horizontally when a
    // line is wider than the panel, and a scrollable region that cannot take
    // focus is unreachable without a pointer. Declared before the rest props
    // so a consumer can still set its own tabIndex. Inline code wraps instead
    // of scrolling, so it stays out of the tab order.
    ...(block ? { tabIndex: 0 } : {}),
    ...props,
    className: classNames(
      "snui-code",
      block ? "snui-code--block" : "snui-code--inline",
      className,
    ),
  });
}
