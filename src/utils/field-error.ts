import type { AnnouncementMode } from "./announcement.js";

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
