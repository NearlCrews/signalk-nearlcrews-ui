import type { ReactNode } from "react";

import type { AnnouncementMode } from "./announcement.js";
import { resolveDescriptionId } from "./aria.js";
import { hasReactContent } from "./react-node.js";

export interface FieldErrorState {
  /** Id of the error container, set whenever that container is in the DOM. */
  readonly errorId: string | undefined;
  /** Id for aria wiring, set only while the container actually holds an error. */
  readonly referencedErrorId: string | undefined;
  /** Whether the error container belongs in the DOM. */
  readonly rendersError: boolean;
}

/**
 * Resolves the ids and mounting rule for a field's error region.
 *
 * A live region must exist before its content arrives, so the container is
 * mounted whenever announcements are requested and only its text varies. The
 * referenced id stays undefined until there is an error, so aria-describedby
 * and aria-errormessage never point at an empty region.
 */
function resolveFieldError(
  idBase: string,
  hasError: boolean,
  errorLive: AnnouncementMode,
): FieldErrorState {
  const rendersError = hasError || errorLive !== "off";
  const errorId = rendersError ? `${idBase}-error` : undefined;
  return {
    errorId,
    referencedErrorId: hasError ? errorId : undefined,
    rendersError,
  };
}

export interface FieldRegions extends FieldErrorState {
  /** Id of the description element, set whenever the field renders one. */
  readonly descriptionId: string | undefined;
  /** Whether the description carries rendered content. */
  readonly hasDescription: boolean;
  /** Whether the error carries rendered content. */
  readonly hasError: boolean;
}

/**
 * Resolves every id and mounting rule a field's own text needs, so a field,
 * a group, a checkbox, a radio group, and a segmented control all answer the
 * description and error questions the same way, blank content included. Each
 * caller still builds its own `aria-describedby`, because the reading order
 * of the ids the consumer adds belongs to the component that renders them.
 */
export function resolveFieldRegions(
  idBase: string,
  description: ReactNode,
  error: ReactNode,
  errorLive: AnnouncementMode,
): FieldRegions {
  const hasDescription = hasReactContent(description);
  const hasError = hasReactContent(error);
  return {
    descriptionId: resolveDescriptionId(idBase, hasDescription),
    hasDescription,
    hasError,
    ...resolveFieldError(idBase, hasError, errorLive),
  };
}
