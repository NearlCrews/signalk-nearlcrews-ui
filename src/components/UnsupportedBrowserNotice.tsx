import type { HTMLAttributes, ReactNode, RefAttributes } from "react";
import { hasReactContent } from "../utils/react-node.js";

export interface UnsupportedBrowserNoticeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "role" | "title">,
    RefAttributes<HTMLElement> {
  /** Optional body override. */
  readonly children?: ReactNode | undefined;
  /** Heading shown above the compatibility explanation. */
  readonly title?: ReactNode | undefined;
}

/**
 * Standalone compatibility notice for a consumer-controlled browser preflight.
 * Render this instead of PanelRoot after supportsNativeCssScope returns false.
 */
export function UnsupportedBrowserNotice({
  children = "This panel requires a newer browser or embedded WebView. Update it before reopening Signal K Admin.",
  ref,
  title = "Browser update required",
  ...props
}: UnsupportedBrowserNoticeProps): React.JSX.Element {
  return (
    <section
      {...props}
      ref={ref}
      role="alert"
      data-browser-compatibility-message=""
    >
      {hasReactContent(title) ? <h2>{title}</h2> : null}
      {hasReactContent(children) ? <div>{children}</div> : null}
    </section>
  );
}
