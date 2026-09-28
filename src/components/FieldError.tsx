import type { ReactNode } from "react";

import {
  type AnnouncementMode,
  liveRegionProps,
} from "../utils/announcement.js";
import type { FieldErrorState } from "../utils/field-error.js";
import { ToneMark } from "./ToneMark.js";

interface FieldErrorProps {
  /** Element to render. Inline controls need a span, block fields a div. */
  readonly as?: "div" | "span" | undefined;
  readonly className: string;
  readonly error: ReactNode;
  readonly live: AnnouncementMode;
  /** The ids and mounting rule {@link resolveFieldRegions} resolved. */
  readonly region: FieldErrorState;
}

/**
 * The error region shared by every field wrapper. It mounts whenever the
 * resolved region says the container belongs in the DOM, so the live region
 * is in place before its text arrives, and it draws the message only while
 * the region is referenced, which is exactly while there is an error.
 */
export function FieldError({
  as: Element = "div",
  className,
  error,
  live,
  region,
}: FieldErrorProps): React.JSX.Element | null {
  if (!region.rendersError) return null;
  // A roled live region does not also carry aria-live; liveRegionProps emits
  // exactly one of the pair.
  const { "aria-live": ariaLive, role } = liveRegionProps(live);
  return (
    <Element
      id={region.errorId}
      className={className}
      role={role}
      aria-live={ariaLive}
    >
      {region.referencedErrorId === undefined ? null : (
        // The message is its own item in the row, so a wrapped line starts
        // under the text rather than back under the glyph.
        <span className="snui-field-error__row">
          {/*
            The danger mark, the way Banner and StatusIndicator carry it. In
            Night the danger color is the same hue as the muted description
            above the error, so the shape and the announced tone word are what
            separate them.
          */}
          <ToneMark className="snui-field-error__tone-glyph" tone="danger" />
          <span className="snui-field-error__text">{error}</span>
        </span>
      )}
    </Element>
  );
}
