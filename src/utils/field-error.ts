import type { AnnouncementMode } from "./announcement.js";
import { resolveDescriptionId } from "./aria.js";

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
export function resolveFieldError(
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
}

/**
 * Resolves every id and mounting rule a field's own text needs, so a field,
 * a group, a checkbox, and a radio group all answer the description and error
 * questions the same way. Each caller still builds its own
 * `aria-describedby`, because the reading order of the ids the consumer adds
 * belongs to the component that renders them.
 */
export function resolveFieldRegions(
  idBase: string,
  hasDescription: boolean,
  hasError: boolean,
  errorLive: AnnouncementMode,
): FieldRegions {
  return {
    descriptionId: resolveDescriptionId(idBase, hasDescription),
    ...resolveFieldError(idBase, hasError, errorLive),
  };
}
