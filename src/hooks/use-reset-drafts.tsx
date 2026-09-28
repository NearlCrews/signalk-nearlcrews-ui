import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { createValueContext } from "../utils/context.js";
import { warnOnce } from "../utils/warn-once.js";

/**
 * The stable half of a panel's draft reset scope. It never changes after the
 * scope mounts, so the panel that calls the reset does not render again for
 * every reset; only the fields, which read the epoch, do.
 */
interface DraftResetControls {
  /** Drops every draft in the scope, or undefined outside a scope. */
  readonly reset: (() => void) | undefined;
  /**
   * Records a field whose draft is invalid, so the next reset reports it
   * valid. Returns the call that forgets it again once the field reports
   * valid on its own.
   */
  readonly trackInvalid: (reportValid: () => void) => () => void;
}

function trackNothing(): () => void {
  return forgetNothing;
}

function forgetNothing(): void {
  // Nothing was tracked outside a scope, so there is nothing to forget.
}

const controlsContext = createValueContext<DraftResetControls>({
  reset: undefined,
  trackInvalid: trackNothing,
});
const epochContext = createValueContext(0);

/**
 * What a field reads from its panel's draft reset scope: the epoch, bumped by
 * every reset, under which a draft typed earlier is dropped the way a changed
 * `resetKey` drops one, and the tracker its invalid drafts register with.
 * Outside a panel the epoch never moves, so a field rendered alone keeps its
 * drafts.
 *
 * @internal
 */
export function useDraftResetScope(): {
  readonly epoch: number;
  readonly trackInvalid: DraftResetControls["trackInvalid"];
} {
  return {
    epoch: epochContext.useValue(),
    trackInvalid: controlsContext.useValue().trackInvalid,
  };
}

/**
 * Publishes one draft reset for a panel. `PanelRoot` renders it around the
 * panel content, so every `NumberField` inside reads the same epoch.
 *
 * @internal
 */
export function DraftResetScope({
  children,
}: {
  readonly children?: ReactNode;
}): React.JSX.Element {
  const [epoch, setEpoch] = useState(0);
  // Fields register here from their own validity reports rather than from a
  // mount effect, because a hidden retained section tears its effects down
  // while its drafts survive, and its invalid fields still have to hear the
  // reset.
  const invalidFields = useRef(new Set<() => void>());

  const trackInvalid = useCallback((reportValid: () => void) => {
    invalidFields.current.add(reportValid);
    return () => {
      invalidFields.current.delete(reportValid);
    };
  }, []);

  const reset = useCallback(() => {
    const reports = [...invalidFields.current];
    invalidFields.current.clear();
    // The reports run here, in the caller's event, rather than from the
    // fields' effects, which a field inside a collapsed retained section does
    // not run until it is shown again.
    for (const reportValid of reports) reportValid();
    setEpoch((current) => current + 1);
  }, []);

  const controls = useMemo(
    () => ({ reset, trackInvalid }),
    [reset, trackInvalid],
  );
  return (
    <controlsContext.Provider value={controls}>
      <epochContext.Provider value={epoch}>{children}</epochContext.Provider>
    </controlsContext.Provider>
  );
}

function warnNoScope(): void {
  warnOnce(
    "use-reset-drafts:no-scope",
    "useResetDrafts found no PanelRoot or PanelShell above it, so the reset did nothing. Render the panel inside one, or pass each field a resetKey that the Discard action changes.",
  );
}

/**
 * Returns the call that drops every in-progress number draft in the panel,
 * for a Discard action.
 *
 * A draft that never committed, such as a cleared field or an out-of-range
 * value, is typed against the value the panel still holds, so restoring that
 * same value changes nothing the draft is keyed on and the stale text stays
 * on screen. Calling this from the discard handler replaces every draft with
 * its field's committed value, and a field whose draft was invalid reports
 * itself valid again, including one inside a collapsed section. Call it from
 * the panel's own handler rather than from `SaveActionBar`, so a Discard
 * routed through a confirmation resets only once it is confirmed.
 *
 * `PanelRoot` and `PanelShell` publish the reset. Outside them the call does
 * nothing and says so once in development.
 */
export function useResetDrafts(): () => void {
  return controlsContext.useValue().reset ?? warnNoScope;
}
