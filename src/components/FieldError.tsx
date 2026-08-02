import type { ReactNode } from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";

interface FieldErrorProps {
  /** Element to render. Inline controls need a span, block fields a div. */
  readonly as?: "div" | "span";
  readonly className: string;
  readonly error: ReactNode;
  readonly hasError: boolean;
  readonly id: string | undefined;
  readonly live: AnnouncementMode;
}

/**
 * The error region shared by every field wrapper. Render it whenever
 * {@link resolveFieldError} reports `rendersError`, so the live region is in
 * place before its text arrives.
 */
export function FieldError({
  as: Element = "div",
  className,
  error,
  hasError,
  id,
  live,
}: FieldErrorProps): React.JSX.Element {
  // A roled live region does not also carry aria-live; liveRegionProps emits
  // exactly one of the pair.
  const region = liveRegionProps(live);
  return (
    <Element
      id={id}
      className={className}
      role={region.role}
      aria-live={region["aria-live"]}
    >
      {hasError ? error : null}
    </Element>
  );
}
