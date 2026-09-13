import type { ReactNode } from "react";

import { hasReactContent } from "../utils/react-node.js";

interface FieldMarkerProps {
  /** Marker for a control that is not required. Blank content draws nothing. */
  readonly optionalLabel?: ReactNode | undefined;
  readonly required: boolean;
  /** Marker for a required control. Blank content draws nothing. */
  readonly requiredLabel?: ReactNode | undefined;
}

/**
 * The marker a field draws after its label: the required mark, the consumer's
 * own optional text, or nothing.
 *
 * The separating space belongs to the marker rather than to the label, so a
 * label with no marker does not end in a stray space padding its accessible
 * name. The required mark is hidden from assistive technology because the
 * native `required` attribute already carries the state, while the optional
 * marker stays in the accessible name so what is heard matches what is drawn.
 */
export function FieldMarker({
  optionalLabel,
  required,
  requiredLabel,
}: FieldMarkerProps): ReactNode {
  if (required) {
    if (!hasReactContent(requiredLabel)) return null;
    return (
      <>
        {" "}
        <span className="snui-required-mark" aria-hidden="true">
          {requiredLabel}
        </span>
      </>
    );
  }
  if (!hasReactContent(optionalLabel)) return null;
  return (
    <>
      {" "}
      <span className="snui-optional-mark">{optionalLabel}</span>
    </>
  );
}
