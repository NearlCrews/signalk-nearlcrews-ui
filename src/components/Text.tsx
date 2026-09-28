import { Fragment, type ReactNode } from "react";

import { hasAccessibleName } from "../utils/aria.js";
import { classNames } from "../utils/class-names.js";
import { resolveBundledLabel, trimmedText } from "../utils/labels.js";
import { CODE_BLOCK_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import {
  createPolymorphicElement,
  type PolymorphicProps,
} from "../utils/polymorphic.js";
import type { SemanticTone } from "../utils/tone.js";

export type TextElement = "span" | "p" | "div" | "small" | "strong" | "em";
export type TextTone = "neutral" | "muted" | SemanticTone;
export type TextSize = "base" | "sm" | "xs";
/** How text behaves at the end of a line. */
export type TextWrap = "normal" | "nowrap" | "preserve";

interface TextOwnProps {
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
  /**
   * Type step from the shared scale. `as` never changes the size: `size` is
   * the only control, so `as="small"` still needs `size="sm"` to look small.
   */
  readonly size?: TextSize | undefined;
  /**
   * Color role. A semantic tone colors the text only; pair it with a visible
   * word or a `Badge` when the tone carries meaning, because color alone does
   * not.
   */
  readonly tone?: TextTone | undefined;
  /**
   * Line-breaking behavior: `"nowrap"` keeps a stamp or an identifier on one
   * line, and `"preserve"` keeps the line breaks and runs of spaces the text
   * already carries, for output written elsewhere. Panels reached for a
   * doubled class name to set these one declaration at a time.
   */
  readonly wrap?: TextWrap | undefined;
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
  wrap = "normal",
  ...props
}: TextProps): React.JSX.Element {
  return createPolymorphicElement(as, {
    ...props,
    className: classNames(
      "snui-text",
      `snui-text--${tone}`,
      `snui-text--size-${size}`,
      // Normal is what the block class already does, so only the two that
      // change something name themselves.
      wrap !== "normal" && `snui-text--wrap-${wrap}`,
      className,
    ),
  });
}

export type CodeElement = "code" | "pre" | "kbd" | "samp";
/** Where a long identifier may break when it does not fit its container. */
export type CodeBreak = "anywhere" | "segments";

interface CodeOwnProps {
  /** Renders a pre-formatted block that keeps line breaks and scrolls horizontally. */
  readonly block?: boolean | undefined;
  /**
   * Where inline code breaks. `"segments"` offers a break after each `.`, `/`,
   * `-`, and `_`, so a Signal K path breaks at a segment boundary rather than
   * mid-word, and falls back to breaking anywhere for a run with no boundary
   * in it.
   */
  readonly break?: CodeBreak | undefined;
  readonly children?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export type CodeProps = PolymorphicProps<CodeElement, "code", CodeOwnProps>;

/** Characters a Signal K path, a URL, or a file name is read in parts around. */
const SEGMENT_BOUNDARY = /(?<=[./\-_])/;

/**
 * Offers a break opportunity after each segment boundary, so a long identifier
 * breaks where a reader already reads a join rather than mid-word. Only text is
 * split: anything a caller composed itself is left alone.
 */
function segmentedContent(children: ReactNode): ReactNode {
  if (typeof children !== "string") return children;

  const parts = children.split(SEGMENT_BOUNDARY);
  if (parts.length < 2) return children;

  const content: ReactNode[] = [];
  let offset = 0;
  for (const part of parts) {
    offset += part.length;
    // Keyed by where the part ends, which is unique however the text repeats.
    // The last part gets no break after it, because there is nothing to break.
    content.push(
      <Fragment key={String(offset)}>
        {part}
        {offset < children.length ? <wbr /> : null}
      </Fragment>,
    );
  }
  return content;
}

/**
 * Monospace text for identifiers such as Signal K paths, source labels, and
 * file names. Inline code wraps anywhere so a long path never overflows its
 * container; `block` keeps the author's line breaks instead.
 */
export function Code({
  as,
  block = false,
  break: breakAt = "anywhere",
  children,
  className,
  ...props
}: CodeProps): React.JSX.Element {
  /*
   * The element decides the treatment, not the prop that usually picks it: a
   * `pre` keeps the author's line breaks and scrolls horizontally when a line
   * is wider than the panel however it was asked for, and a scrollable region
   * that cannot take focus is unreachable without a pointer. A focus stop with
   * no role and no name announces nothing, so a block is a group named "Code",
   * or the panel's own word for it, by default. It becomes a region landmark
   * only when the consumer names it, because three sample payloads in one
   * panel would otherwise add three identical "Code" landmarks. The role and
   * the focus stop are declared before the rest props, so a consumer can
   * still set its own. Inline code wraps instead of scrolling, so it stays out
   * of the tab order.
   */
  const element = as ?? (block ? "pre" : "code");
  const scrolls = block || element === "pre";
  const suppliedLabel = trimmedText(props["aria-label"]) || undefined;
  const suppliedLabelledBy = trimmedText(props["aria-labelledby"]) || undefined;
  const named = hasAccessibleName(suppliedLabel, suppliedLabelledBy);
  const defaultLabel = resolveBundledLabel(
    undefined,
    usePanelLabels()?.codeBlock?.label,
    CODE_BLOCK_LABEL_DEFAULTS.label,
  );

  return createPolymorphicElement(
    element,
    {
      ...(scrolls ? { role: named ? "region" : "group", tabIndex: 0 } : {}),
      ...props,
      // Written after the spread, so a blank name the consumer passed falls
      // back to the default rather than leaving the stop unnamed.
      ...(scrolls
        ? {
            "aria-label": named ? suppliedLabel : defaultLabel,
            "aria-labelledby": suppliedLabelledBy,
          }
        : {}),
      className: classNames(
        "snui-code",
        scrolls ? "snui-code--block" : "snui-code--inline",
        className,
      ),
    },
    breakAt === "segments" ? segmentedContent(children) : children,
  );
}
