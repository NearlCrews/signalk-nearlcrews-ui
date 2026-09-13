import {
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useId,
} from "react";

import { joinIdReferences } from "../utils/aria.js";
import { HEADING_ELEMENTS, type HeadingLevel } from "../utils/heading.js";
import { hasReactContent } from "../utils/react-node.js";

export interface UnsupportedBrowserNoticeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "role" | "title">,
    RefAttributes<HTMLElement> {
  /** Optional body override. */
  readonly children?: ReactNode | undefined;
  /** Level of the title heading, default 2, matching the other titled components. */
  readonly headingLevel?: HeadingLevel | undefined;
  /** Heading shown above the compatibility explanation. */
  readonly title?: ReactNode | undefined;
}

const DEFAULT_TITLE = "Browser update required";
// Leads with the plain need, then names both ways out: a kiosk or embedded
// WebView user often cannot update the engine, but can update or replace the
// app that opens Admin.
const DEFAULT_BODY =
  "This panel needs a newer browser. Update the browser, or the app that opens Signal K Admin, then open this panel again.";

/**
 * Standalone compatibility notice for a consumer-controlled browser preflight.
 * Render this instead of PanelRoot after supportsNativeCssScope returns false.
 * It is static page content named by its heading, not a live region: it is
 * present at first render, so there is nothing to interrupt.
 */
export function UnsupportedBrowserNotice({
  "aria-labelledby": ariaLabelledBy,
  children = DEFAULT_BODY,
  headingLevel = 2,
  ref,
  title = DEFAULT_TITLE,
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
