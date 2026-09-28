import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { UNSUPPORTED_BROWSER_LABEL_DEFAULTS } from "../utils/panel-label-defaults.js";
import { hasReactContent } from "../utils/react-node.js";

export interface UnsupportedBrowserNoticeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "role" | "title">,
    RefAttributes<HTMLElement> {
  /**
   * Explanation under the heading, default the package's browser advice.
   * Pass `null` to show the heading alone.
   */
  readonly children?: ReactNode | undefined;
  /** Level of the title heading, default 2, matching the other titled components. */
  readonly headingLevel?: HeadingLevel | undefined;
  /**
   * Heading shown above the compatibility explanation, default "Browser
   * update required".
   */
  readonly title?: ReactNode | undefined;
}

/**
 * Standalone compatibility notice for a consumer-controlled browser preflight.
 * Render this instead of PanelRoot after supportsNativeCssScope returns false.
 * It is static page content named by its heading, not a live region: it is
 * present at first render, so there is nothing to interrupt.
 */
export function UnsupportedBrowserNotice({
  "aria-labelledby": ariaLabelledBy,
  children = UNSUPPORTED_BROWSER_LABEL_DEFAULTS.description,
  headingLevel = 2,
  ref,
  title = UNSUPPORTED_BROWSER_LABEL_DEFAULTS.title,
  ...props
}: UnsupportedBrowserNoticeProps): React.JSX.Element {
  const titleId = useId();
  const hasTitle = hasReactContent(title);
  const Heading = HEADING_ELEMENTS[headingLevel];

  return (
    <section
      {...props}
      ref={ref}
      // The consumer's reference joins the heading rather than replacing it,
      // as it does on every other titled surface here, so a name that adds
      // context does not silently drop the words on screen.
      aria-labelledby={joinIdReferences(
        ariaLabelledBy,
        hasTitle ? titleId : undefined,
      )}
      // Both spellings of the marker a consumer preflight asserts against.
      // The prefixed one is the package's own hook and the unprefixed one is
      // kept until the next major, because the shipped check command and the
      // consumer tests written against it still read it.
      data-snui-unsupported=""
      data-browser-compatibility-message=""
    >
      {hasTitle ? <Heading id={titleId}>{title}</Heading> : null}
      {hasReactContent(children) ? <div>{children}</div> : null}
    </section>
  );
}
